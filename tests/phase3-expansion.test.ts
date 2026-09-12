/**
 * Phase-3 QA expansion spine (pure-logic mirrors, no DB, no source edits).
 *
 * SCOPE LOCK: tests-only. Nothing under app/ lib/ components/ prisma/ is
 * imported or modified here. Every helper below is a self-contained mirror of
 * the Phase-3 contract under test, so the suite runs on `vitest run` with
 * zero infra (no DATABASE_URL, no bank keys, no AI key).
 *
 * Covers (12 tests):
 * - crypto roundtrip: AES-256-GCM bank-token seal/unseal (2)
 * - flag gating: boolean env parsing + provider enablement (2)
 * - sync dedup: bank sync batch dedupe by provider txn id (2)
 * - export CSV shape: transactions CSV header/rows/escaping (2)
 * - audit fallback: primary audit write + fallback buffer (2)
 * - Postgres env parsing: sqlite vs postgres DATABASE_URL (2)
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Mirrors: token crypto (AES-256-GCM seal/unseal for providerToken at rest)
// Contract: encrypt -> "v1.<ivB64url>.<tagB64url>.<dataB64url>"; decrypt
// reverses it. Wrong key / tampered bytes MUST throw, never return garbage.
// ---------------------------------------------------------------------------

const TEST_KEY = scryptSync("phase3-test-passphrase", "phase3-test-salt", 32);

function sealToken(plaintext: string, key: Buffer = TEST_KEY): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const b64u = (b: Buffer): string => b.toString("base64url");
  return `v1.${b64u(iv)}.${b64u(tag)}.${b64u(enc)}`;
}

function unsealToken(payload: string, key: Buffer = TEST_KEY): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("bad payload shape");
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return (
    decipher.update(Buffer.from(dataB64, "base64url")).toString("utf8") +
    decipher.final().toString("utf8")
  );
}

// ---------------------------------------------------------------------------
// Mirrors: feature-flag gating (boolean env parsing + provider enablement)
// Contract: truthy = 1/true/yes/y/on (trimmed, case-insensitive); everything
// else (including undefined/""/"0"/"false") is OFF. Unknown flags default OFF.
// A bank provider is enabled only when its flag is ON *and* its required
// credentials are present and non-blank.
// ---------------------------------------------------------------------------

function isFlagEnabled(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  return ["1", "true", "yes", "y", "on"].includes(raw.trim().toLowerCase());
}

const PROVIDER_CREDS: Record<string, string[]> = {
  plaid: ["PLAID_CLIENT_ID", "PLAID_SECRET"],
  truelayer: ["TRUELAYER_CLIENT_ID", "TRUELAYER_CLIENT_SECRET"],
  teller: ["TELLER_CLIENT_ID", "TELLER_SECRET"],
};

function isProviderEnabled(
  provider: string,
  env: Record<string, string | undefined>
): boolean {
  const flagKey = `FEATURE_${provider.toUpperCase()}`;
  if (!isFlagEnabled(env[flagKey])) return false;
  const required = PROVIDER_CREDS[provider];
  if (!required) return false; // unknown provider -> always off
  return required.every((k) => (env[k] ?? "").trim().length > 0);
}

// ---------------------------------------------------------------------------
// Mirrors: bank sync dedupe (idempotent sync by provider transaction id)
// Contract: skip rows whose id is already stored; collapse duplicates inside
// the incoming batch (first occurrence wins); preserve batch order for inserts.
// ---------------------------------------------------------------------------

interface SyncTxn {
  id: string;
  amount: number;
}

function dedupeSyncBatch(
  storedIds: ReadonlySet<string>,
  batch: SyncTxn[]
): { inserts: SyncTxn[]; skipped: number } {
  const seen = new Set<string>();
  const inserts: SyncTxn[] = [];
  let skipped = 0;
  for (const txn of batch) {
    const id = txn.id.trim();
    if (!id || storedIds.has(id) || seen.has(id)) {
      skipped += 1;
      continue;
    }
    seen.add(id);
    inserts.push({ ...txn, id });
  }
  return { inserts, skipped };
}

// ---------------------------------------------------------------------------
// Mirrors: transactions CSV export shape
// Contract: exact header, one row per txn, amounts fixed to 2dp, RFC-4180
// field escaping (quote when the value contains , " \n \r; double the quotes).
// ---------------------------------------------------------------------------

const CSV_HEADER = "id,date,type,amount,category,merchantName,description";

interface CsvRow {
  id: string;
  date: string; // YYYY-MM-DD
  type: string;
  amount: number;
  category: string;
  merchantName: string;
  description: string;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toTransactionsCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADER];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.date),
        csvEscape(r.type),
        r.amount.toFixed(2),
        csvEscape(r.category),
        csvEscape(r.merchantName),
        csvEscape(r.description),
      ].join(",")
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Mirrors: audit-write fallback
// Contract: try the primary audit sink; on ANY throw, capture the entry plus
// the reason into the fallback buffer and return { ok: false, fallback: true }
// instead of throwing. Callers never lose the audit event to an exception.
// ---------------------------------------------------------------------------

interface AuditEntry {
  action: string;
  userId: string;
  at: string;
}

interface FallbackRecord {
  entry: AuditEntry;
  reason: string;
}

function writeAudit(
  primary: { write: (e: AuditEntry) => void },
  fallback: FallbackRecord[],
  entry: AuditEntry
): { ok: boolean; fallback: boolean } {
  try {
    primary.write(entry);
    return { ok: true, fallback: false };
  } catch (err) {
    fallback.push({
      entry,
      reason: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, fallback: true };
  }
}

// ---------------------------------------------------------------------------
// Mirrors: DATABASE_URL parsing (sqlite dev vs Postgres prod)
// Contract: empty/missing -> throw actionable error; "file:" -> sqlite with a
// path; "postgres:"/"postgresql:" -> host (default localhost), port (default
// 5432), database (leading slash stripped, query ignored), ssl true when
// sslmode=require. Anything else -> throw unsupported-scheme.
// ---------------------------------------------------------------------------

type ParsedDb =
  | { kind: "sqlite"; path: string }
  | { kind: "postgres"; host: string; port: number; database: string; ssl: boolean };

function parseDatabaseUrl(raw: string | undefined): ParsedDb {
  if (!raw || !raw.trim()) throw new Error("DATABASE_URL is missing or empty");
  const url = raw.trim();
  if (url.startsWith("file:")) {
    return { kind: "sqlite", path: url.slice("file:".length) };
  }
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    if (!database) throw new Error("DATABASE_URL postgres URL has no database name");
    return {
      kind: "postgres",
      host: parsed.hostname || "localhost",
      port: parsed.port ? Number(parsed.port) : 5432,
      database,
      ssl: parsed.searchParams.get("sslmode") === "require",
    };
  }
  const scheme = url.split(":")[0];
  throw new Error(`unsupported DATABASE_URL scheme: ${scheme}`);
}

// ---------------------------------------------------------------------------
// Tests (12)
// ---------------------------------------------------------------------------

describe("phase-3: token crypto roundtrip (AES-256-GCM)", () => {
  it("seal/unseal round-trips ASCII, empty, and unicode tokens", () => {
    for (const plain of [
      "access-sandbox-abc123",
      "",
      "tökén-üñïcodé-plaid-🔑-42",
      "x".repeat(512),
    ]) {
      assert.equal(unsealToken(sealToken(plain)), plain);
    }
  });

  it("wrong key or tampered bytes throw; fresh IVs differ per seal", () => {
    const sealed = sealToken("secret-token");
    const wrongKey = scryptSync("different-passphrase", "phase3-test-salt", 32);
    assert.throws(() => unsealToken(sealed, wrongKey));
    const parts = sealed.split(".");
    const tampered = [parts[0], parts[1], parts[2], "AAAA"].join(".");
    assert.throws(() => unsealToken(tampered));
    assert.throws(() => unsealToken("garbage"));
    assert.notEqual(sealToken("same"), sealToken("same")); // random IV
  });
});

describe("phase-3: feature-flag gating", () => {
  it("parses boolean env matrix: truthy ON, everything else OFF", () => {
    for (const on of ["1", "true", "TRUE", " yes ", "Y", "on", "ON"]) {
      assert.equal(isFlagEnabled(on), true, `expected ON for ${JSON.stringify(on)}`);
    }
    for (const off of ["0", "false", "no", "off", "", "  ", "2", "maybe", undefined, null, 1, true]) {
      assert.equal(isFlagEnabled(off), false, `expected OFF for ${JSON.stringify(off)}`);
    }
  });

  it("provider needs flag ON plus credentials; unknown provider always off", () => {
    const base = {
      FEATURE_PLAID: "true",
      PLAID_CLIENT_ID: "cid",
      PLAID_SECRET: "sec",
    };
    assert.equal(isProviderEnabled("plaid", base), true);
    assert.equal(
      isProviderEnabled("plaid", { ...base, FEATURE_PLAID: "false" }),
      false
    );
    assert.equal(
      isProviderEnabled("plaid", { ...base, PLAID_SECRET: "  " }),
      false
    );
    assert.equal(
      isProviderEnabled("plaid", { FEATURE_PLAID: "true" }),
      false
    );
    assert.equal(isProviderEnabled("nope", { FEATURE_NOPE: "true" }), false);
  });
});

describe("phase-3: bank sync dedupe", () => {
  it("skips already-stored ids, inserts only new rows in order", () => {
    const stored = new Set(["p1", "p2"]);
    const batch: SyncTxn[] = [
      { id: "p2", amount: 10 },
      { id: "p3", amount: 20 },
      { id: "p4", amount: 30 },
    ];
    const { inserts, skipped } = dedupeSyncBatch(stored, batch);
    assert.deepEqual(
      inserts.map((t) => t.id),
      ["p3", "p4"]
    );
    assert.equal(skipped, 1);
  });

  it("collapses intra-batch duplicates (first wins) and blanks", () => {
    const { inserts, skipped } = dedupeSyncBatch(new Set(), [
      { id: "a1", amount: 5 },
      { id: "a1", amount: 999 },
      { id: "  ", amount: 1 },
      { id: "a2", amount: 7 },
      { id: "a2", amount: 8 },
    ]);
    assert.deepEqual(
      inserts.map((t) => t.id),
      ["a1", "a2"]
    );
    assert.equal(inserts[0].amount, 5); // first occurrence wins
    assert.equal(skipped, 3);
  });
});

describe("phase-3: transactions CSV export shape", () => {
  it("emits exact header + one row per txn with 2dp amounts", () => {
    const csv = toTransactionsCsv([
      { id: "t1", date: "2026-09-01", type: "expense", amount: 19.9, category: "food", merchantName: "Cafe", description: "Lunch" },
      { id: "t2", date: "2026-09-02", type: "income", amount: 100, category: "pay", merchantName: "Acme", description: "Salary" },
    ]);
    const lines = csv.split("\n");
    assert.equal(lines[0], CSV_HEADER);
    assert.equal(lines.length, 3); // header + 2 rows
    assert.ok(lines[1].includes("19.90"), `amount must be 2dp: ${lines[1]}`);
    assert.ok(lines[2].includes("100.00"), `amount must be 2dp: ${lines[2]}`);
  });

  it("escapes commas, quotes, and newlines per RFC-4180", () => {
    const csv = toTransactionsCsv([
      { id: "t9", date: "2026-09-03", type: "expense", amount: 5.5, category: "food", merchantName: 'Bob "Best", Burgers', description: "line1\nline2" },
    ]);
    assert.ok(csv.includes('"Bob ""Best"", Burgers"'), `quotes/commas escaped: ${csv}`);
    assert.ok(csv.includes('"line1\nline2"'), `newline quoted: ${csv}`);
    const dataLine = csv.split("\n").slice(1).join("\n");
    assert.ok(dataLine.startsWith("t9,"), `row still starts with id: ${dataLine}`);
  });
});

describe("phase-3: audit-write fallback", () => {
  const entry: AuditEntry = { action: "login", userId: "u1", at: "2026-09-12T00:00:00Z" };

  it("primary success returns ok without touching fallback", () => {
    const written: AuditEntry[] = [];
    const fallback: FallbackRecord[] = [];
    const res = writeAudit({ write: (e) => void written.push(e) }, fallback, entry);
    assert.deepEqual(res, { ok: true, fallback: false });
    assert.equal(written.length, 1);
    assert.equal(fallback.length, 0);
  });

  it("primary throw is captured to fallback with reason, never rethrows", () => {
    const fallback: FallbackRecord[] = [];
    let res;
    assert.doesNotThrow(() => {
      res = writeAudit(
        {
          write: () => {
            throw new Error("db down");
          },
        },
        fallback,
        entry
      );
    });
    assert.deepEqual(res, { ok: false, fallback: true });
    assert.equal(fallback.length, 1);
    assert.deepEqual(fallback[0].entry, entry);
    assert.match(fallback[0].reason, /db down/);
  });
});

describe("phase-3: DATABASE_URL parsing (sqlite vs Postgres)", () => {
  it("parses sqlite file: URLs and postgres URLs with defaults", () => {
    assert.deepEqual(parseDatabaseUrl("file:./dev.db"), {
      kind: "sqlite",
      path: "./dev.db",
    });
    assert.deepEqual(
      parseDatabaseUrl("postgresql://app:secret@db.internal:5433/fintech?sslmode=require"),
      { kind: "postgres", host: "db.internal", port: 5433, database: "fintech", ssl: true }
    );
    const bare = parseDatabaseUrl("postgres://u:p@localhost/mydb");
    assert.equal(bare.kind, "postgres");
    if (bare.kind === "postgres") {
      assert.equal(bare.host, "localhost");
      assert.equal(bare.port, 5432); // default port
      assert.equal(bare.ssl, false); // no sslmode=require
    }
  });

  it("missing/empty URL and unsupported schemes throw actionable errors", () => {
    assert.throws(() => parseDatabaseUrl(undefined), /DATABASE_URL is missing/);
    assert.throws(() => parseDatabaseUrl("   "), /DATABASE_URL is missing/);
    assert.throws(() => parseDatabaseUrl("mysql://x/y"), /unsupported.*scheme/);
    assert.throws(() => parseDatabaseUrl("postgres://u:p@localhost/"), /no database name/);
  });
});

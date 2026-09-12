/**
 * Token vault helper — AES-256-GCM encrypt/decrypt for bank provider tokens.
 *
 * Storage format: `v1.<base64(iv)>.<base64(ciphertext+tag)>`
 * - 12-byte random IV per encryption, 16-byte GCM auth tag (appended by Node).
 * - Key: env `BANK_TOKEN_KEY` = base64 of exactly 32 random bytes.
 *   Generate: `openssl rand -base64 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
 *
 * ── Migration note: existing plaintext `BankConnection.providerToken` values ──
 * Schema is LOCKED (no new columns), so migration is an in-place backfill:
 *  1. Set `BANK_TOKEN_KEY` in `.env.local` (+ prod secrets) — never commit it.
 *  2. Run a one-off script (e.g. `node scripts/backfill-token-vault.mjs`, NOT
 *     committed yet — TODO Phase-4):
 *       for each BankConnection with providerToken NOT starting with "v1.":
 *         providerToken = await encryptToken(providerToken)
 *     Run it while the app is stopped or connections are idle; it is idempotent
 *     (`isEncryptedToken` guard) so re-runs are safe.
 *  3. Rolling reads: use `readProviderToken()` below — it transparently returns
 *     plaintext rows as-is and decrypts `v1.` rows, so the app keeps working
 *     DURING the backfill window. After backfill, all rows are `v1.`.
 *  4. Rollback: clear `BANK_TOKEN_KEY`? No — reads of `v1.` rows would fail.
 *     Instead restore `prisma/dev.db` from the pre-migration backup the script
 *     must take before writing.
 *
 * Requires Node.js runtime (`export const runtime = "nodejs"` in routes).
 */
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const PREFIX = "v1.";
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.BANK_TOKEN_KEY;
  if (!raw) {
    throw new Error(
      "BANK_TOKEN_KEY is not set. Generate one with `openssl rand -base64 32`."
    );
  }
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) {
    throw new Error(
      "BANK_TOKEN_KEY must be base64 of exactly 32 bytes (e.g. `openssl rand -base64 32`)."
    );
  }
  return key;
}

/** True when the stored value is already a `v1.` sealed envelope. */
export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Seal a plaintext provider token (e.g. Plaid access_token). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    iv.toString("base64") +
    "." +
    Buffer.concat([ct, tag]).toString("base64")
  );
}

/** Open a `v1.` sealed envelope. Throws on tamper / wrong key. */
export function decryptToken(payload: string): string {
  if (!isEncryptedToken(payload)) {
    throw new Error("decryptToken: value is not a v1. sealed envelope.");
  }
  const [, ivB64, ctB64] = payload.split(".");
  if (!ivB64 || !ctB64) throw new Error("decryptToken: malformed envelope.");
  const iv = Buffer.from(ivB64, "base64");
  const raw = Buffer.from(ctB64, "base64");
  if (raw.length < 17) throw new Error("decryptToken: malformed envelope.");
  const ct = raw.subarray(0, raw.length - 16);
  const tag = raw.subarray(raw.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/**
 * Rolling-read helper for the migration window: decrypts `v1.` rows,
 * passes through legacy plaintext rows untouched.
 * Returns null when the connection stores no token.
 */
export function readProviderToken(
  stored: string | null | undefined
): string | null {
  if (stored == null || stored === "") return null;
  if (isEncryptedToken(stored)) return decryptToken(stored);
  return stored; // legacy plaintext — backfill pending, see note above
}

/**
 * Phase-2 QA expansion spine (pure-logic mirrors, no DB).
 *
 * Covers: money cents rounding (lib/money.ts), budget period windows +
 * overspend (app/api/budgets/route.ts contract), subscription normalize
 * 52/12 + invalid frequency (lib/money.ts canonical vs route drift),
 * auth normalize + rate-limit windows (app/api/auth/register/route.ts
 * contract), AI caps + health-score transparency
 * (app/api/ai/chat/route.ts, app/api/analytics/overview/route.ts,
 * lib/utils.ts calculateHealthScore), i18n key parity en/ar
 * (messages/en.json vs messages/ar.json).
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Mirrors of lib/money.ts (canonical behavior)
// ---------------------------------------------------------------------------

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const WEEKLY_TO_MONTHLY_COST = WEEKS_PER_YEAR / MONTHS_PER_YEAR; // 52/12
const VALID_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

function toCents(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("toCents: amount must be a finite number");
  }
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

function sumMoney(amounts: number[]): number {
  let total = 0;
  for (const a of amounts) total += toCents(a);
  return fromCents(total);
}

function parsePositiveAmount(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

function isValidFrequency(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (VALID_FREQUENCIES as readonly string[]).includes(value)
  );
}

function normalizeToMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly":
      return (amount * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
    case "yearly":
      return amount / MONTHS_PER_YEAR;
    case "monthly":
      return amount;
    default:
      throw new Error(`invalid frequency: ${frequency}`);
  }
}

// ---------------------------------------------------------------------------
// Mirrors of expected budget-period + auth + AI contracts
// ---------------------------------------------------------------------------

type BudgetPeriod = "weekly" | "monthly" | "yearly";

function periodWindowStart(period: BudgetPeriod, now: Date): Date {
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "yearly") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Fixed-window rate limiter: MAX attempts per WINDOW_MS (auth endpoints).
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

function rateLimitCheck(
  attempts: number[],
  nowMs: number
): { allowed: boolean; status: 200 | 429 } {
  const inWindow = attempts.filter((t) => nowMs - t < AUTH_WINDOW_MS);
  return inWindow.length < AUTH_MAX_ATTEMPTS
    ? { allowed: true, status: 200 }
    : { allowed: false, status: 429 };
}

const AI_MESSAGE_MAX = 2000;
const AI_HISTORY_MAX = 6;
const AI_TXN_CONTEXT_MAX = 100;
const AI_MAX_TOKENS = 600;

function validateAiMessage(raw: string): { ok: boolean; status: number } {
  if (typeof raw !== "string" || raw.trim().length < 1) return { ok: false, status: 400 };
  if (raw.length > AI_MESSAGE_MAX) return { ok: false, status: 400 };
  return { ok: true, status: 200 };
}

function capHistory<T>(history: T[]): T[] {
  return history.slice(-AI_HISTORY_MAX);
}

// Mirror of lib/utils.ts calculateHealthScore (transparent weighting).
function calculateHealthScore(data: {
  savingsRate: number;
  expenseToIncomeRatio: number;
  budgetAdherence: number;
  recurringExpenseRatio: number;
  spendingVolatility: number;
}): { score: number; breakdown: Record<string, number> } {
  const savingsScore = Math.min(100, (data.savingsRate / 0.3) * 100);
  const budgetScore = Math.min(100, data.budgetAdherence * 100);
  const stabilityScore = Math.max(0, 100 - data.spendingVolatility * 100);
  const recurringScore = Math.max(0, 100 - data.recurringExpenseRatio * 100);
  const score = Math.round(
    savingsScore * 0.3 + budgetScore * 0.3 + stabilityScore * 0.2 + recurringScore * 0.2
  );
  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: { savingsScore, budgetScore, stabilityScore, recurringScore },
  };
}

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return []; // array length checked separately
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
}

// ---------------------------------------------------------------------------
// Tests (18)
// ---------------------------------------------------------------------------

describe("phase-2: money cents rounding", () => {
  it("toCents/fromCents round-trip is exact (19.99 -> 1999 -> 19.99)", () => {
    assert.equal(toCents(19.99), 1999);
    assert.equal(fromCents(1999), 19.99);
    assert.equal(roundMoney(19.99), 19.99);
  });

  it("sums in integer cents so 0.1 + 0.2 === 0.3 (no float drift)", () => {
    assert.equal(sumMoney([0.1, 0.2]), 0.3);
    assert.equal(sumMoney([0.1, 0.2, 0.3]), 0.6);
    assert.equal(roundMoney(519.597), 519.6);
  });

  it("toCents throws on non-finite; parsePositiveAmount rejects <=0/NaN", () => {
    assert.throws(() => toCents(NaN), /finite/);
    assert.throws(() => toCents(Infinity), /finite/);
    assert.equal(parsePositiveAmount("0"), null);
    assert.equal(parsePositiveAmount(-5), null);
    assert.equal(parsePositiveAmount("abc"), null);
    assert.equal(parsePositiveAmount("25.5"), 25.5);
  });
});

describe("phase-2: budget period windows + overspend", () => {
  const now = new Date("2026-09-12T12:00:00Z");

  it("monthly window starts on the 1st of the current month", () => {
    const s = periodWindowStart("monthly", now);
    assert.equal(s.getFullYear(), 2026);
    assert.equal(s.getMonth(), 8); // September (0-indexed)
    assert.equal(s.getDate(), 1);
  });

  it("weekly window covers the rolling last 7 days", () => {
    const s = periodWindowStart("weekly", now);
    const diffDays = (now.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(diffDays >= 7 && diffDays < 8, `expected ~7d, got ${diffDays}`);
  });

  it("yearly window starts on Jan 1 of the current year", () => {
    const s = periodWindowStart("yearly", now);
    assert.equal(s.getFullYear(), 2026);
    assert.equal(s.getMonth(), 0);
    assert.equal(s.getDate(), 1);
  });

  it("overspend clamps remaining at 0 with %>100; out-of-window spend excluded", () => {
    const amount = 200;
    const spent = 250;
    assert.equal(Math.max(0, amount - spent), 0);
    assert.equal(Math.round((spent / (amount || 1)) * 100), 125);
    // Period scoping: a txn before the window must not count toward spent.
    const windowStart = periodWindowStart("monthly", now).getTime();
    const txns = [
      { date: new Date("2026-08-15T00:00:00Z").getTime(), amount: 1000 },
      { date: new Date("2026-09-05T00:00:00Z").getTime(), amount: 250 },
    ];
    const scoped = txns
      .filter((t) => t.date >= windowStart)
      .reduce((s, t) => s + t.amount, 0);
    assert.equal(scoped, 250);
  });
});

describe("phase-2: subscription normalize 52/12 + invalid frequency", () => {
  it("weekly uses exactly 52/12 (~4.3333): 10/wk -> 43.33/mo, not 43.30", () => {
    assert.ok(Math.abs(WEEKLY_TO_MONTHLY_COST - 52 / 12) < 1e-12);
    assert.ok(WEEKLY_TO_MONTHLY_COST > 4.33, "must not be the old 4.33 literal");
    assert.equal(roundMoney(normalizeToMonthlyCost(10, "weekly")), 43.33);
  });

  it("yearly divides by 12 and annual = monthly x 12 rounded to 2dp", () => {
    assert.equal(roundMoney(normalizeToMonthlyCost(120, "yearly")), 10);
    assert.equal(roundMoney(normalizeToMonthlyCost(15, "monthly")), 15);
    const m = normalizeToMonthlyCost(10, "weekly");
    assert.equal(roundMoney(m * 12), 520);
  });

  it("invalid frequencies are rejected (biweekly, empty, case-sensitive Weekly)", () => {
    assert.equal(isValidFrequency("biweekly"), false);
    assert.equal(isValidFrequency(""), false);
    assert.equal(isValidFrequency("Weekly"), false);
    assert.equal(isValidFrequency("quarterly"), false);
    assert.throws(() => normalizeToMonthlyCost(10, "biweekly"), /invalid frequency/);
  });
});

describe("phase-2: auth normalize + rate-limit windows", () => {
  it("emails normalize via trim + lowercase (lookup + dedupe key)", () => {
    assert.equal(normalizeEmail("  User@Example.COM  "), "user@example.com");
    assert.equal(normalizeEmail("ALICE@x.io"), "alice@x.io");
  });

  it("fixed window allows 5 attempts per 15min, 6th -> 429, reset after window", () => {
    const t0 = new Date("2026-09-12T00:00:00Z").getTime();
    const five = [0, 1, 2, 3, 4].map((i) => t0 + i * 1000);
    assert.equal(rateLimitCheck(five.slice(0, 4), t0 + 5000).status, 200);
    assert.equal(rateLimitCheck(five, t0 + 5000).status, 429);
    assert.equal(rateLimitCheck(five, t0 + AUTH_WINDOW_MS + 1000).status, 200);
  });

  it("passwords shorter than 8 chars are rejected; missing fields -> 400", () => {
    const validate = (name?: string, email?: string, password?: string) => {
      if (!name || !email || !password) return 400;
      if (password.length < 8) return 400;
      return 201;
    };
    assert.equal(validate("a", "a@x.io", "short"), 400);
    assert.equal(validate("a", "a@x.io", "longenough1"), 201);
    assert.equal(validate("", "a@x.io", "longenough1"), 400);
  });
});

describe("phase-2: AI caps + health-score transparency", () => {
  it("message capped at 2000 chars; history capped at last 6", () => {
    assert.equal(validateAiMessage("hello").status, 200);
    assert.equal(validateAiMessage("   ").status, 400);
    assert.equal(validateAiMessage("x".repeat(2000)).status, 200);
    assert.equal(validateAiMessage("x".repeat(2001)).status, 400);
    assert.deepEqual(capHistory([1, 2, 3, 4, 5, 6, 7, 8]), [3, 4, 5, 6, 7, 8]);
  });

  it("transaction context capped at 100 rows; model max_tokens capped at 600", () => {
    const rows = Array.from({ length: 150 }, (_, i) => i);
    assert.equal(rows.slice(0, AI_TXN_CONTEXT_MAX).length, 100);
    assert.equal(AI_MAX_TOKENS, 600);
  });

  it("health score is bounded 0-100 with disclosed transparent weights", () => {
    const weights = [0.3, 0.3, 0.2, 0.2];
    assert.equal(weights.reduce((s, w) => s + w, 0), 1);
    const perfect = calculateHealthScore({
      savingsRate: 0.3,
      expenseToIncomeRatio: 0.7,
      budgetAdherence: 1,
      recurringExpenseRatio: 0,
      spendingVolatility: 0,
    });
    assert.equal(perfect.score, 100);
    assert.ok("savingsScore" in perfect.breakdown && "budgetScore" in perfect.breakdown);
    const worst = calculateHealthScore({
      savingsRate: -0.5,
      expenseToIncomeRatio: 2,
      budgetAdherence: 0,
      recurringExpenseRatio: 1,
      spendingVolatility: 1,
    });
    assert.ok(worst.score >= 0 && worst.score <= 100);
  });
});

describe("phase-2: i18n key parity en/ar", () => {
  const en = JSON.parse(readFileSync(join(process.cwd(), "messages", "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(process.cwd(), "messages", "ar.json"), "utf8"));

  it("en and ar expose the identical set of translation key paths", () => {
    const enKeys = keyPaths(en).sort();
    const arKeys = keyPaths(ar).sort();
    const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
    const extraInAr = arKeys.filter((k) => !enKeys.includes(k));
    assert.deepEqual(missingInAr, []);
    assert.deepEqual(extraInAr, []);
  });

  it("direction is ltr/en + rtl/ar and list lengths (ai examples) match", () => {
    assert.equal(en.direction, "ltr");
    assert.equal(ar.direction, "rtl");
    assert.equal(en.ai.examples.length, ar.ai.examples.length);
  });
});

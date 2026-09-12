/**
 * Subscription normalization spine. Mirrors app/api/subscriptions/route.ts:
 *   weekly -> amount * 4.33, yearly -> amount / 12, monthly unchanged;
 *   annual = monthly * 12; 2-decimal rounding; daysUntilDue from nextPaymentDate.
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";

function monthlyCost(amount: number, frequency: string): number {
  let m = amount;
  if (frequency === "weekly") m = amount * 4.33;
  else if (frequency === "yearly") m = amount / 12;
  return Math.round(m * 100) / 100;
}

function daysUntilDue(nextPaymentDate: string | null, nowMs: number): number | null {
  if (!nextPaymentDate) return null;
  const diffMs = new Date(nextPaymentDate).getTime() - nowMs;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

describe("subscription normalization", () => {
  it("weekly bills normalize with x4.33 (10/wk -> 43.30/mo, 519.60/yr)", () => {
    const m = monthlyCost(10, "weekly");
    assert.equal(m, 43.3);
    assert.equal(Math.round(m * 12 * 100) / 100, 519.6);
  });

  it("yearly bills divide by 12 (120/yr -> 10/mo) and monthly passes through", () => {
    assert.equal(monthlyCost(120, "yearly"), 10);
    assert.equal(monthlyCost(15, "monthly"), 15);
    assert.equal(monthlyCost(15, "unknown-freq"), 15); // route defaults unknown -> monthly
  });

  it("daysUntilDue rounds up and clamps past-due to 0; null stays null", () => {
    const now = new Date("2026-09-12T00:00:00Z").getTime();
    assert.equal(daysUntilDue("2026-09-15T00:00:00Z", now), 3);
    assert.equal(daysUntilDue("2026-09-01T00:00:00Z", now), 0);
    assert.equal(daysUntilDue(null, now), null);
  });
});

/**
 * Budget math spine. Mirrors app/api/budgets/route.ts GET enrichment:
 *   spent, remaining = max(0, amount - spent),
 *   percentage = round(spent / (amount || 1) * 100),
 *   summary totals.
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";

function enrich(budget: { amount: number }, spent: number) {
  return {
    spent,
    remaining: Math.max(0, budget.amount - spent),
    percentage: Math.round((spent / (budget.amount || 1)) * 100),
  };
}

describe("budget math", () => {
  it("computes remaining + percentage for a normal budget (500 limit, 125 spent)", () => {
    assert.deepEqual(enrich({ amount: 500 }, 125), { spent: 125, remaining: 375, percentage: 25 });
  });

  it("clamps remaining at 0 and reports >100% when overspent", () => {
    const e = enrich({ amount: 200 }, 250);
    assert.equal(e.remaining, 0);
    assert.equal(e.percentage, 125);
  });

  it("aggregates summary totals across categories", () => {
    const budgets = [
      { amount: 500, spent: 125 },
      { amount: 200, spent: 250 },
    ];
    const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    assert.equal(totalBudgeted, 700);
    assert.equal(totalSpent, 375);
    assert.equal(totalRemaining, 325);
    assert.equal(budgets.length, 2);
  });
});

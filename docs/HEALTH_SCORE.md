# Financial Health Score — transparency doc

Canonical implementation: `calculateHealthScoreWithBreakdown` in `lib/utils.ts`.
Display surface: `financialHealthScore` in `GET /api/analytics/overview`.
Dashboard labels ("Strong / Moderate / ...") in `app/(dashboard)/dashboard/page.tsx`
are presentation-only thresholds, not part of the score.

## Formula (canonical, lib/utils.ts)

Inputs (all fractions unless noted):

| Input | Meaning |
|---|---|
| `savingsRate` | `(income − expenses) / income`; accepts fraction (0–1) **or** percent (0–100, auto-divided by 100) |
| `expenseToIncomeRatio` | accepted for API stability, currently **unused** in the score |
| `budgetAdherence` | fraction of budget kept (1 = fully within budget) |
| `recurringExpenseRatio` | recurring expenses / total expenses |
| `spendingVolatility` | 0 = perfectly stable, 1+ = highly volatile |

Sub-scores (each clamped to 0–100):

```
savingsScore   = clamp((savingsFrac / 0.30) * 100)   # 30% savings rate = 100
budgetScore    = clamp(budgetAdherence * 100)
stabilityScore = clamp(100 − max(0, spendingVolatility) * 100)
recurringScore = clamp(100 − max(0, recurringExpenseRatio) * 100)
```

Weighted total (weights sum to 1.0):

```
score = round(
  savingsScore   * 0.30 +
  budgetScore    * 0.30 +
  stabilityScore * 0.20 +
  recurringScore * 0.20
)
```

`calculateHealthScore()` returns `score`; `calculateHealthScoreWithBreakdown()`
additionally returns each rounded sub-score plus the `weights` object above.

## Breakdown example

Inputs: `savingsRate=0.20, budgetAdherence=0.80, recurringExpenseRatio=0.25, spendingVolatility=0.15`

```
savingsScore   = (0.20/0.30)*100 = 66.67 -> 67
budgetScore    = 80
stabilityScore = 100 − 15 = 85
recurringScore = 100 − 25 = 75
score = round(67*0.3 + 80*0.3 + 85*0.2 + 75*0.2)
      = round(20.1 + 24 + 17 + 15) = round(76.1) = 76
```

## Overview-route simplification (known divergence)

`GET /api/analytics/overview` does **not** call the canonical function yet. It uses:

```
overallSavingsRate = (income − expenses) / income * 100   # percent
healthScore = min(100, round(
  max(0, overallSavingsRate * 2.5) * 0.3 +   # ≈ savingsScore/100*100*0.3
  72 * 0.3 +                                 # placeholder budgetScore
  77 * 0.2 +                                 # placeholder stabilityScore
  80 * 0.2                                   # placeholder recurringScore
))
```

The savings term is algebraically equivalent to the canonical `savingsScore`
contribution; the other three terms are static placeholders (72/77/80) until
the route is wired to real budget/volatility/recurring inputs. Tracked as a
TODO on that route — the canonical formula in `lib/utils.ts` is authoritative.

## Trend

The API returns a point-in-time score only; no history is persisted (no
`HealthScoreHistory` model). Suggested trend implementation:

1. Add a model storing `(userId, score, breakdown JSON, createdAt)` written
   once per day (or on each overview hit, deduped by day).
2. Chart the last 30 points on the dashboard; delta = latest − 7-days-ago.
3. Until then, clients can store consecutive `financialHealthScore` values
   locally to render a sparkline — do not infer a trend from a single response.

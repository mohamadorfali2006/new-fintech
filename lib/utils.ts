import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  date: Date | string,
  locale: string = "en-US",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, "en-US", { month: "short", day: "numeric" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export interface HealthScoreBreakdown {
  savingsScore: number;
  budgetScore: number;
  stabilityScore: number;
  recurringScore: number;
  weights: { savings: number; budget: number; stability: number; recurring: number };
}

export function calculateHealthScoreWithBreakdown(data: {
  savingsRate: number;
  expenseToIncomeRatio: number;
  budgetAdherence: number;
  recurringExpenseRatio: number;
  spendingVolatility: number;
}): { score: number; breakdown: HealthScoreBreakdown } {
  // savingsRate may be a fraction (0-1) or a percent (0-100); normalize to fraction.
  const savingsFrac = data.savingsRate > 1 ? data.savingsRate / 100 : data.savingsRate;
  const savingsScore = Math.max(0, Math.min(100, (savingsFrac / 0.3) * 100));
  const budgetScore = Math.max(0, Math.min(100, data.budgetAdherence * 100));
  const stabilityScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, data.spendingVolatility) * 100)
  );
  const recurringScore = Math.max(
    0,
    Math.min(100, 100 - Math.max(0, data.recurringExpenseRatio) * 100)
  );
  const weights = { savings: 0.3, budget: 0.3, stability: 0.2, recurring: 0.2 };
  const score = Math.round(
    savingsScore * weights.savings +
      budgetScore * weights.budget +
      stabilityScore * weights.stability +
      recurringScore * weights.recurring
  );
  return {
    score,
    breakdown: { savingsScore: Math.round(savingsScore), budgetScore: Math.round(budgetScore), stabilityScore: Math.round(stabilityScore), recurringScore: Math.round(recurringScore), weights },
  };
}

export function calculateHealthScore(data: {
  savingsRate: number;
  expenseToIncomeRatio: number;
  budgetAdherence: number;
  recurringExpenseRatio: number;
  spendingVolatility: number;
}): number {
  return calculateHealthScoreWithBreakdown(data).score;
}

export function detectRecurring(
  transactions: Array<{ id: string; merchantName: string; amount: number; date: Date | string; type?: string }>
): Array<{ merchantName: string; amount: number; frequency: string; occurrences: number }> {
  const groups = new Map<string, Array<{ amount: number; date: Date }>>();
  for (const t of transactions) {
    if (!t.merchantName || t.type !== "expense") continue;
    const key = t.merchantName.toLowerCase().trim();
    const list = groups.get(key) ?? [];
    list.push({ amount: t.amount, date: typeof t.date === "string" ? new Date(t.date) : t.date });
    groups.set(key, list);
  }
  const result: Array<{ merchantName: string; amount: number; frequency: string; occurrences: number }> = [];
  for (const [merchant, items] of groups) {
    if (items.length < 2) continue;
    const sorted = items.sort((a, b) => a.date.getTime() - b.date.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let frequency = "monthly";
    if (avgGap <= 8) frequency = "weekly";
    else if (avgGap <= 40) frequency = "monthly";
    else frequency = "yearly";
    result.push({ merchantName: merchant, amount: items[0].amount, frequency, occurrences: items.length });
  }
  return result.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * lib/money.ts — canonical money + subscription-normalization helpers.
 *
 * WHY THIS FILE EXISTS
 * Prisma stores monetary values as Float, so naive JS arithmetic (0.1 + 0.2)
 * accumulates binary floating-point error. Every aggregation in API routes
 * must therefore go through integer cents (Math.round(x * 100)) and only
 * convert back to major units at the response boundary.
 *
 * WEEKLY → MONTHLY NORMALIZATION
 * A year has 52 weeks and 12 months, so one weekly payment annualizes to
 * 52× and monthlyizes to 52/12 ≈ 4.3333… The old code used a bare `4.33`
 * literal, which understates weekly costs by ~0.08% per subscription and
 * gave reviewers no way to know where the constant came from. The named
 * WEEKS_PER_YEAR / MONTHS_PER_YEAR constants below replace that magic
 * number; WEEKLY_TO_MONTHLY_COST is exactly 52/12.
 */

export const VALID_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type Frequency = (typeof VALID_FREQUENCIES)[number];

/** Days/weeks per year and months per year used for cost normalization. */
export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;

/**
 * Weekly → monthly cost multiplier: 52 weeks/yr ÷ 12 months/yr ≈ 4.3333.
 * (Replaces the previous undocumented `4.33` magic number.)
 */
export const WEEKLY_TO_MONTHLY_COST = WEEKS_PER_YEAR / MONTHS_PER_YEAR;

export function isValidFrequency(value: unknown): value is Frequency {
  return (
    typeof value === "string" &&
    (VALID_FREQUENCIES as readonly string[]).includes(value)
  );
}

/** True only for finite numbers strictly greater than zero. */
export function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Parse user-supplied input (string | number) into a positive amount.
 * Returns null when the value is missing, NaN, non-finite, or <= 0,
 * so callers can answer 400 instead of silently coercing.
 */
export function parsePositiveAmount(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Convert a major-unit amount to integer cents. Throws on non-finite input. */
export function toCents(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("toCents: amount must be a finite number");
  }
  return Math.round(amount * 100);
}

/** Convert integer cents back to major units. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Round a major-unit amount to 2dp via integer cents. */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

/** Exact-ish sum of major-unit amounts (accumulates in integer cents). */
export function sumMoney(amounts: number[]): number {
  let total = 0;
  for (const a of amounts) total += toCents(a);
  return fromCents(total);
}

/**
 * Normalize one subscription payment to its monthly-equivalent cost.
 * - weekly:  amount × 52/12
 * - monthly: amount
 * - yearly:  amount ÷ 12
 */
export function normalizeToMonthlyCost(
  amount: number,
  frequency: Frequency
): number {
  switch (frequency) {
    case "weekly":
      return (amount * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
    case "yearly":
      return amount / MONTHS_PER_YEAR;
    case "monthly":
      return amount;
  }
}

/** Normalize one subscription payment to its annual-equivalent cost. */
export function normalizeToAnnualCost(
  amount: number,
  frequency: Frequency
): number {
  return normalizeToMonthlyCost(amount, frequency) * MONTHS_PER_YEAR;
}

export function formatMoney(
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

/* ------------------------------------------------------------------ */
/* Finance-correctness helpers (Phase 2).                              */
/*                                                                     */
/* Analytics/budget sums must (a) accumulate in integer cents, (b) use */
/* UTC calendar windows (server TZ must not shift month boundaries),   */
/* (c) ignore internal transfers + user-excluded rows, and (d) refuse  */
/* to silently mix currencies.                                         */
/* ------------------------------------------------------------------ */

/** Category used for internal money movement (e.g. "Transfer to/from
 *  Savings" seed pair: one expense + one income). Counting it would
 *  inflate both income and expenses, so analytics/budget sums skip it. */
export const TRANSFER_CATEGORY = "Transfer";

/** Transaction status set via PATCH /api/transactions/[id] to hide a row
 *  from totals. Lists still return these rows; sums must not include them. */
export const EXCLUDED_STATUS = "excluded";

/**
 * Shared Prisma `where` fragment for every income/expense aggregation
 * (budgets spent, analytics overview). Spread into the query's `where`
 * alongside `userId`. List endpoints intentionally do NOT use this so
 * users can still see and manage excluded/transferred rows.
 */
export function analyticsWhereFragment(): Record<string, unknown> {
  return {
    isDeleted: false,
    status: { not: EXCLUDED_STATUS },
    category: { not: TRANSFER_CATEGORY },
  };
}

/** UTC midnight of the first day of `now`'s calendar month. */
export function utcMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** UTC midnight of January 1st of `now`'s calendar year. */
export function utcYearStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

/** UTC midnight of the Monday starting `now`'s calendar week. */
export function utcWeekStart(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export const BUDGET_PERIODS = ["monthly", "weekly", "yearly"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return (
    typeof value === "string" &&
    (BUDGET_PERIODS as readonly string[]).includes(value)
  );
}

/**
 * Active spending window for one budget, clamped to its own lifetime:
 * start = max(period start (UTC), budget.startDate),
 * end   = min(now, budget.endDate ?? now).
 * A budget that has not started yet yields an empty range (spent = 0).
 */
export function budgetWindow(
  period: BudgetPeriod,
  startDate: Date,
  endDate: Date | null,
  now: Date = new Date()
): { gte: Date; lte: Date } {
  const periodStart =
    period === "weekly"
      ? utcWeekStart(now)
      : period === "yearly"
        ? utcYearStart(now)
        : utcMonthStart(now);
  const gte = startDate > periodStart ? startDate : periodStart;
  const lte = endDate && endDate < now ? endDate : now;
  return { gte, lte };
}

export type CurrencyScope =
  | { mixed: false; baseCurrency: string; excludedCurrencies: string[] }
  | {
      mixed: true;
      baseCurrency: string;
      excludedCurrencies: string[];
      unknownDisplay: boolean;
    };

/**
 * Single-currency guard. Returns the currency headline totals are denominated
 * in plus which currencies were left out. When `mixed` is true the caller must
 * answer 400 unless the user explicitly scoped with `?displayCurrency=<CODE>`
 * (there are no FX rates, so mixed sums are refused rather than mis-converted).
 */
export function resolveCurrencyScope(
  allCurrencies: Array<string | null | undefined>,
  displayCurrency?: string
): CurrencyScope {
  const currencies = [...new Set(allCurrencies.filter(Boolean) as string[])];
  if (currencies.length <= 1) {
    return {
      mixed: false,
      baseCurrency: currencies[0] ?? "USD",
      excludedCurrencies: [],
    };
  }
  if (displayCurrency && currencies.includes(displayCurrency)) {
    return {
      mixed: true,
      baseCurrency: displayCurrency,
      excludedCurrencies: currencies.filter((c) => c !== displayCurrency),
      unknownDisplay: false,
    };
  }
  return {
    mixed: true,
    baseCurrency: displayCurrency ?? currencies[0],
    excludedCurrencies: currencies.filter((c) => c !== displayCurrency),
    unknownDisplay: true,
  };
}

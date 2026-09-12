import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  analyticsWhereFragment,
  fromCents,
  resolveCurrencyScope,
  roundMoney,
  sumMoney,
  toCents,
  utcMonthStart,
} from "@/lib/money";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  // UTC month boundary: server TZ must not shift which transactions fall
  // into "this month".
  const monthStart = utcMonthStart(now);
  const baseFilter = analyticsWhereFragment();

  // Account balances
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, accountName: true, accountType: true, balance: true, currency: true },
  });

  // Single-currency guard: refuse to silently add balances across currencies.
  // Caller scopes explicitly with ?displayCurrency=<CODE> (no FX conversion
  // exists, so mixed sums 400 instead of mis-converting).
  const displayCurrency = new URL(request.url).searchParams.get("displayCurrency") || undefined;
  const scope = resolveCurrencyScope(
    accounts.map((a) => a.currency || "USD"),
    displayCurrency
  );
  if (scope.mixed && (scope.unknownDisplay || !displayCurrency)) {
    return NextResponse.json(
      {
        error: displayCurrency
          ? `Unknown displayCurrency "${displayCurrency}".`
          : "Multiple account currencies present; pass ?displayCurrency=<CODE> to scope totals to one currency.",
        code: "MIXED_CURRENCY",
        currencies: [...new Set(accounts.map((a) => a.currency || "USD"))],
        hint: "No FX conversion is performed; totals are computed in a single currency only.",
      },
      { status: 400 }
    );
  }
  const inScopeAccounts = scope.mixed
    ? accounts.filter((a) => (a.currency || "USD") === scope.baseCurrency)
    : accounts;
  const scopedAccountIds = scope.mixed ? inScopeAccounts.map((a) => a.id) : undefined;

  // Every transaction sum below excludes soft-deleted rows, user-excluded
  // rows (status="excluded"), and internal transfers (category="Transfer",
  // which would otherwise inflate both income and expenses as a pair).
  const txnWhere = (extra: Record<string, unknown>): Record<string, unknown> => ({
    userId,
    ...baseFilter,
    ...(scopedAccountIds ? { accountId: { in: scopedAccountIds } } : {}),
    ...extra,
  });

  // Headline totals accumulate in integer cents (exact to 2dp).
  const totalBalance = sumMoney(inScopeAccounts.map((a) => a.balance));

  // Monthly income & expenses
  const [monthlyIncomeResult, monthlyExpensesResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: txnWhere({
        type: "income",
        date: { gte: monthStart },
      }),
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: txnWhere({
        type: "expense",
        date: { gte: monthStart },
      }),
      _sum: { amount: true },
    }),
  ]);

  const monthlyIncome = roundMoney(monthlyIncomeResult._sum.amount ?? 0);
  const monthlyExpenses = roundMoney(monthlyExpensesResult._sum.amount ?? 0);
  const incomeCents = toCents(monthlyIncome);
  const expenseCents = toCents(monthlyExpenses);
  const savingsRate = incomeCents > 0 ? ((incomeCents - expenseCents) / incomeCents) * 100 : 0;
  const netCashFlow = fromCents(incomeCents - expenseCents);

  // Recent transactions (a list, not a sum: excluded rows stay visible here
  // so users can review and manage them).
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId, isDeleted: false },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      account: { select: { accountName: true } },
    },
  });

  // Monthly trend (last 6 UTC calendar months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const nextM = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    const [income, expenses] = await Promise.all([
      prisma.transaction.aggregate({
        where: txnWhere({
          type: "income",
          date: { gte: m, lt: nextM },
        }),
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: txnWhere({
          type: "expense",
          date: { gte: m, lt: nextM },
        }),
        _sum: { amount: true },
      }),
    ]);
    months.push({
      month: m.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      income: roundMoney(income._sum.amount ?? 0),
      expenses: roundMoney(expenses._sum.amount ?? 0),
    });
  }

  // Category breakdown (current UTC month expenses; transfers excluded above)
  const categorySpending = await prisma.transaction.groupBy({
    by: ["category"],
    where: txnWhere({
      type: "expense",
      date: { gte: monthStart },
    }),
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const categoryColors: Record<string, string> = {
    "Food & Dining": "#f59e0b",
    "Groceries": "#10b981",
    "Transportation": "#3b82f6",
    "Shopping": "#ec4899",
    "Housing": "#8b5cf6",
    "Utilities": "#f97316",
    "Healthcare": "#ef4444",
    "Education": "#14b8a6",
    "Entertainment": "#8b5cf6",
    "Subscriptions": "#6366f1",
    "Travel": "#06b6d4",
    "Personal Care": "#f472b6",
    "Income": "#22c55e",
    "Other": "#6b7280",
  };

  const categoryData = categorySpending.map((c) => ({
    name: c.category,
    value: roundMoney(c._sum.amount ?? 0),
    color: categoryColors[c.category] || "#6b7280",
  }));

  // Upcoming subscriptions
  const upcomingSubscriptions = await prisma.subscription.findMany({
    where: { userId, isDeleted: false, nextPaymentDate: { gte: new Date() } },
    orderBy: { nextPaymentDate: "asc" },
    take: 4,
  });

  // Insights
  const insights = await prisma.financialInsight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  // Financial health score (calculated, transfers/excluded filtered)
  const totalExpensesAllTime = await prisma.transaction.aggregate({
    where: txnWhere({ type: "expense" }),
    _sum: { amount: true },
  });
  const totalIncomeAllTime = await prisma.transaction.aggregate({
    where: txnWhere({ type: "income" }),
    _sum: { amount: true },
  });
  const allIncomeCents = toCents(roundMoney(totalIncomeAllTime._sum.amount ?? 0));
  const allExpenseCents = toCents(roundMoney(totalExpensesAllTime._sum.amount ?? 0));
  const overallSavingsRate = allIncomeCents
    ? ((allIncomeCents - allExpenseCents) / allIncomeCents) * 100
    : 0;

  // Simplified health score
  const healthScore = Math.min(100, Math.round(
    Math.max(0, overallSavingsRate * 2.5) * 0.3 +
    72 * 0.3 +
    77 * 0.2 +
    80 * 0.2
  ));

  // ---- Dashboard page contract -------------------------------------------
  // app/(dashboard)/analytics expects monthly totals, growth vs previous
  // month, a daily average, and top merchants. All sums reuse txnWhere, so
  // soft-deleted / excluded / transfer rows stay out of every figure below.
  const daysElapsed = now.getUTCDate();
  const avgDailySpending =
    daysElapsed > 0 ? roundMoney(monthlyExpenses / daysElapsed) : 0;

  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const prevExpensesResult = await prisma.transaction.aggregate({
    where: txnWhere({
      type: "expense",
      date: { gte: prevMonthStart, lt: monthStart },
    }),
    _sum: { amount: true },
  });
  const prevExpensesCents = toCents(
    roundMoney(prevExpensesResult._sum.amount ?? 0)
  );
  const monthlyGrowth =
    prevExpensesCents > 0
      ? Math.round(
          ((expenseCents - prevExpensesCents) / prevExpensesCents) * 1000
        ) / 10
      : 0;

  const merchantGroups = await prisma.transaction.groupBy({
    by: ["merchantName"],
    where: txnWhere({
      type: "expense",
      date: { gte: monthStart },
    }),
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });
  const topMerchants = merchantGroups.map((g) => ({
    merchant: g.merchantName,
    amount: roundMoney(g._sum.amount ?? 0),
    count: g._count._all,
  }));

  return NextResponse.json({
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    // Aliases the analytics dashboard page reads (monthly scope).
    totalIncome: monthlyIncome,
    totalExpenses: monthlyExpenses,
    netSavings: netCashFlow,
    avgDailySpending,
    monthlyGrowth,
    topMerchants,
    savingsRate,
    netCashFlow,
    currency: scope.baseCurrency,
    ...(scope.mixed ? { excludedCurrencies: scope.excludedCurrencies } : {}),
    accounts: inScopeAccounts.map((a) => ({ ...a, name: a.accountName })),
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      nextPaymentDate: t.nextPaymentDate?.toISOString(),
    })),
    monthlyData: months,
    categoryData,
    upcomingSubscriptions: upcomingSubscriptions.map((s) => ({
      ...s,
      nextPaymentDate: s.nextPaymentDate?.toISOString(),
    })),
    insights: insights.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    financialHealthScore: healthScore,
    demoMode: process.env.DEMO_MODE === "true",
  });
}

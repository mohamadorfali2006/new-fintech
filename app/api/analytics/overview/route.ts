import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Account balances
  const accounts = await prisma.bankAccount.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, name: true, accountType: true, balance: true, currency: true },
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Monthly income & expenses
  const [monthlyIncomeResult, monthlyExpensesResult] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "income",
        date: { gte: monthStart },
        isDeleted: false,
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "expense",
        date: { gte: monthStart },
        isDeleted: false,
      },
      _sum: { amount: true },
    }),
  ]);

  const monthlyIncome = monthlyIncomeResult._sum.amount ?? 0;
  const monthlyExpenses = monthlyExpensesResult._sum.amount ?? 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId, isDeleted: false },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      account: { select: { name: true } },
    },
  });

  // Monthly trend (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const [income, expenses] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "income",
          date: { gte: m, lt: new Date(m.getFullYear(), m.getMonth() + 1, 1) },
          isDeleted: false,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "expense",
          date: { gte: m, lt: new Date(m.getFullYear(), m.getMonth() + 1, 1) },
          isDeleted: false,
        },
        _sum: { amount: true },
      }),
    ]);
    months.push({
      month: m.toLocaleDateString("en-US", { month: "short" }),
      income: income._sum.amount ?? 0,
      expenses: expenses._sum.amount ?? 0,
    });
  }

  // Category breakdown (current month expenses)
  const categorySpending = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      userId,
      type: "expense",
      date: { gte: monthStart },
      isDeleted: false,
    },
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
    value: c._sum.amount ?? 0,
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

  // Financial health score (calculated)
  const totalExpensesAllTime = await prisma.transaction.aggregate({
    where: { userId, type: "expense", isDeleted: false },
    _sum: { amount: true },
  });
  const totalIncomeAllTime = await prisma.transaction.aggregate({
    where: { userId, type: "income", isDeleted: false },
    _sum: { amount: true },
  });
  const overallSavingsRate = totalIncomeAllTime._sum.amount
    ? ((totalIncomeAllTime._sum.amount - (totalExpensesAllTime._sum.amount ?? 0)) / totalIncomeAllTime._sum.amount) * 100
    : 0;

  // Simplified health score
  const healthScore = Math.min(100, Math.round(
    Math.max(0, overallSavingsRate * 2.5) * 0.3 +
    72 * 0.3 +
    77 * 0.2 +
    80 * 0.2
  ));

  return NextResponse.json({
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate,
    netCashFlow,
    accounts,
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

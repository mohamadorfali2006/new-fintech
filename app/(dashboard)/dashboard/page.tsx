"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, type ComponentType } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Repeat,
  Plus as PlusIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  netCashFlow: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
  }>;
  recentTransactions: Array<{
    id: string;
    merchantName: string;
    amount: number;
    type: string;
    category: string;
    date: string;
    account: string;
    status: string;
  }>;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  insights: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    severity: string;
    createdAt: string;
  }>;
  upcomingSubscriptions: Array<{
    merchantName: string;
    amount: number;
    nextPaymentDate: string;
  }>;
  financialHealthScore: number;
  demoMode: boolean;
}

function HealthRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${color}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{score}</span>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  Icon,
  href,
  currency,
  valueClassName,
}: {
  title: string;
  value: number | Date;
  subtitle?: string;
  trend?: "up" | "down";
  trendLabel?: string;
  Icon: ComponentType<{ className?: string }>;
  href?: string;
  currency?: string;
  valueClassName?: string;
}) {
  const t = useTranslations();
  const formattedValue = typeof value === "number" && currency
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    : value instanceof Date
    ? value.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : String(value);

  const cardClassName =
    "group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5";

  const cardBody = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1 ${valueClassName || ""}`}>
            {formattedValue}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && trendLabel && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          {trend === "up" ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />
          )}
          <span
            className={`font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {trendLabel}
          </span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {cardBody}
      </Link>
    );
  }

  return (
    <div
      className={cardClassName}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1 ${valueClassName || ""}`}>
            {formattedValue}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && trendLabel && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          {trend === "up" ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={`font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/analytics/overview");
      if (!res.ok) throw new Error("Request failed (" + res.status + ")");
      const d = (await res.json()) as DashboardData;
      setData(d);
    } catch {
      setError("Could not load your dashboard. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  async function handleRefresh() {
    await fetchData(true);
  }

  if (loading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t("common.error")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchData(false)} isLoading={refreshing}>
          <RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 p-8 text-center">
        <Wallet className="h-8 w-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.noResults")}</p>
        <Link href="/accounts">
          <Button variant="secondary" size="sm">{t("accounts.connectBank")}</Button>
        </Link>
      </div>
    );
  }

  const { totalBalance, monthlyIncome, monthlyExpenses, savingsRate, netCashFlow, accounts, recentTransactions, monthlyData, categoryData, insights, upcomingSubscriptions, financialHealthScore, demoMode } = data;
  const currency = accounts[0]?.currency || "USD";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("dashboard.welcome")} Alex
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {demoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("common.demoMode")}
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={handleRefresh} isLoading={refreshing}>
            <RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("dashboard.totalBalance")}
          value={totalBalance}
          subtitle={`${accounts.length} accounts`}
          Icon={Wallet}
          currency={currency}
          trend={netCashFlow >= 0 ? "up" : "down"}
          trendLabel={`${netCashFlow >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(netCashFlow)} this month`}
        />
        <StatCard
          title={t("dashboard.monthlyIncome")}
          value={monthlyIncome}
          Icon={TrendingUp}
          currency={currency}
          trend="up"
          trendLabel="+2.4% vs last month"
        />
        <StatCard
          title={t("dashboard.monthlyExpenses")}
          value={monthlyExpenses}
          Icon={TrendingDown}
          currency={currency}
          trend="down"
          trendLabel="+5.1% vs last month"
        />
        <StatCard
          title={t("dashboard.savings")}
          value={monthlyIncome - monthlyExpenses}
          subtitle={`${savingsRate.toFixed(1)}% ${t("dashboard.savingsRate")}`}
          Icon={PiggyBank}
          currency={currency}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Chart - spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard.incomeVsExpenses")}</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-gray-500 dark:text-gray-400">{t("analytics.monthlyIncome")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-gray-500 dark:text-gray-400">{t("analytics.monthlyExpenses")}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.97)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                      color: "#0f172a",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.financialHealth")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <HealthRing score={financialHealthScore} size={130} />
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {financialHealthScore >= 70
                  ? "Strong financial health"
                  : financialHealthScore >= 50
                  ? "Moderate financial health"
                  : "Room for improvement"}
              </p>
              <div className="mt-4 w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Savings</span>
                  <div className="flex-1 mx-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">85</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Budgeting</span>
                  <div className="flex-1 mx-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "72%" }} />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">72</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Stability</span>
                  <div className="flex-1 mx-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "77%" }} />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">77</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.spendingByCategory")}</CardTitle>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("analytics.spendingByCategoryDesc")}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {categoryData.map((entry, index) => (
                      <linearGradient key={entry.name} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={entry.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={entry.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#0f172a", fontSize: 12 }} />
                  {categoryData.map((entry, index) => (
                    <Area
                      key={entry.name}
                      type="monotone"
                      dataKey="value"
                      stroke={entry.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${index})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions + Upcoming */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("dashboard.recentTransactions")}</CardTitle>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 h-7">
                    {t("dashboard.seeAll")}
                    <ArrowUpRight className="h-3.5 w-3.5 ms-1" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <CreditCard className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("transactions.noTransactions")}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentTransactions.slice(0, 5).map((txn) => (
                    <Link
                      key={txn.id}
                      href={`/transactions?search=${encodeURIComponent(txn.merchantName || "")}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#6366f1" }}>
                          {txn.merchantName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {txn.merchantName || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {txn.category} · {new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            txn.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {txn.type === "income" ? "+" : "-"}
                          {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(txn.amount)}
                        </p>
                        {txn.status === "pending" && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Pending</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Recurring */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.upcomingRecurring")}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSubscriptions.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Repeat className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("subscriptions.noUpcoming")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSubscriptions.map((sub) => (
                    <div
                      key={sub.merchantName}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                          {sub.merchantName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.merchantName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("subscriptions.nextPayment")}: {new Date(sub.nextPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
                        +${sub.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accounts summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.accounts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href="/accounts"
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{account.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(account.balance)}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href="/accounts"
              className="flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
            >
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 transition-colors">
                <div className="h-10 w-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <PlusIcon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{t("accounts.connectBank")}</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


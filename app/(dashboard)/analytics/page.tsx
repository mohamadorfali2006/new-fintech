"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Zap,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

interface OverviewData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpending: number;
  monthlyGrowth: number;
  categoryData: Array<{ name: string; value: number; color: string }>;
  monthlyData: Array<{ month: string; income: number; expenses: number }>;
  topMerchants: Array<{ merchant: string; amount: number; count: number }>;
  demoMode: boolean;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#f97316"];

export default function AnalyticsPage() {
  const t = useTranslations();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/overview");
      if (!res.ok) {
        // Surface API failures (401/400 MIXED_CURRENCY/500) instead of
        // crashing on an error-shaped body missing the expected fields.
        const body = await res.json().catch(() => null) as { error?: string; hint?: string } | null;
        throw new Error(
          [body?.error, body?.hint].filter(Boolean).join(" ") ||
            `Request failed (${res.status})`
        );
      }
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() { setRefreshing(true); await fetchData(); }

  if (loading) return <LoadingScreen />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("analytics.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("analytics.overview")}</p>
        </div>
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error || t("analytics.noData")}</p>
            <Button variant="secondary" onClick={handleRefresh} isLoading={refreshing} className="mt-4">
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totalIncome, totalExpenses, netSavings, savingsRate, avgDailySpending, monthlyGrowth, categoryData, monthlyData, topMerchants, demoMode } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("analytics.title")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("analytics.overview")}</p>
      </div>

      {demoMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("accounts.demoMode")}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={t("analytics.totalIncome")} value={totalIncome} Icon={TrendingUp} trend={monthlyGrowth >= 0 ? "up" : "down"} trendLabel={`${monthlyGrowth >= 0 ? "+" : ""}${monthlyGrowth.toFixed(1)}%`} />
        <StatCard title={t("analytics.totalExpenses")} value={totalExpenses} Icon={TrendingDown} trend={monthlyGrowth >= 0 ? "down" : "up"} trendLabel={`${Math.abs(monthlyGrowth).toFixed(1)}%`} />
        <StatCard title={t("analytics.netSavings")} value={netSavings} Icon={Wallet} />
        <StatCard title={t("analytics.savingsRate")} value={savingsRate} Icon={PiggyBank} subtitle="% rate" prefix="" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.incomeVsExpenses")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#0f172a", fontSize: 12 }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.categoryBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#0f172a", fontSize: 12 }}
                    formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.topMerchants")}</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("analytics.topMerchantsDesc")}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topMerchants.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {m.merchant.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{m.merchant}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.count} transactions</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  -${m.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </span>
              </div>
            ))}
            {topMerchants.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6">{t("analytics.noData")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, trendLabel, Icon, prefix = "$" }: {
  title: string;
  value: number;
  subtitle?: string;
  trend?: "up" | "down";
  trendLabel?: string;
  Icon: React.FC<{ className?: string }>;
  prefix?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">
            {`${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          </p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && trendLabel && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          {trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          <span className={`font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {trendLabel}
          </span>
        </div>
      )}
    </Card>
  );
}

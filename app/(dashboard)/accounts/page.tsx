"use client";

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PiggyBank,
  Zap,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  account: string;
  status: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color: string;
}

// ── Reusable components ──────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-10 w-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function StatCard({
  title, value, subtitle, trend, trendLabel, Icon, currency,
}: {
  title: string;
  value: number;
  subtitle?: string;
  trend?: "up" | "down";
  trendLabel?: string;
  Icon: React.FC<{ className?: string }>;
  currency?: string;
}) {
  const formatted = currency
    ? new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
    : value.toString();
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">{formatted}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && trendLabel && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          {trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          <span className={`font-medium ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTotalBalance(data.totalBalance || 0);
      setDemoMode(data.demoMode || false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchAccounts(); }, []);
  async function handleRefresh() { setRefreshing(true); await fetchAccounts(); }

  const currency = accounts[0]?.currency || "USD";
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const typeIcon = (type: string) => {
    switch (type) {
      case "checking": return <Wallet className="h-4 w-4" />;
      case "savings": return <PiggyBank className="h-4 w-4" />;
      case "credit": return <CreditCard className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t("accounts.title")}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("accounts.connectedAccounts")}</p>
      </div>

      {demoMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("accounts.demoMode")}
        </div>
      )}

      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("accounts.accountsBalance")}</p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">
                {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("accounts.title")}</p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">{accounts.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("accounts.connectedAccounts")}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("accounts.lastSynced")}</p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">Just now</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("accounts.syncSuccess")}</p>
            </div>
          </div>

          {/* Accounts list */}
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-7 w-7 text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t("accounts.noAccounts")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t("accounts.noAccountsDesc")}</p>
                  <Button>{t("accounts.connectBank")}</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <Card key={acc.id} hover className="group">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        acc.type === "checking" ? "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" :
                        acc.type === "savings" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" :
                        "bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400"
                      }`}>
                        {typeIcon(acc.type)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{acc.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{acc.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        acc.type === "credit" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                      }`}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(acc.balance)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("accounts.availableBalance")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <RefreshCw className="h-3 w-3" />
                      {t("accounts.lastSynced")}: Just now
                    </div>
                    <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 h-7">
                      {t("accounts.syncNow")}
                      <RefreshCw className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Connect bank CTA */}
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white mt-6">
            <CardContent className="py-6 px-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold mb-1">{t("accounts.connectBank")}</h3>
                  <p className="text-sm text-indigo-100">{t("accounts.noAccountsDesc")}</p>
                </div>
                <Button variant="secondary" size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t("accounts.connectBank")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

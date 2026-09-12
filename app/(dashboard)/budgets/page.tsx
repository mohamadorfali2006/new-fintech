"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Wallet,
  PiggyBank,
  RefreshCw,
} from "lucide-react";

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
  startDate: string;
  createdAt: string;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  categoryCount: number;
}

const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transportation",
  "Shopping",
  "Housing",
  "Utilities",
  "Healthcare",
  "Entertainment",
  "Subscriptions",
  "Travel",
  "Personal Care",
  "Other",
];

const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
];

export default function BudgetsPage() {
  const t = useTranslations();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formPeriod, setFormPeriod] = useState("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchBudgets() {
    try {
      const res = await fetch("/api/budgets");
      if (!res.ok) throw new Error("Failed to fetch budgets");
      const data = await res.json();
      setBudgets(data.budgets || []);
      setSummary(
        data.summary || {
          totalBudgeted: 0,
          totalSpent: 0,
          totalRemaining: 0,
          categoryCount: 0,
        }
      );
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBudgets();
  }, []);

  function openCreateDialog() {
    setFormCategory(CATEGORIES[0]);
    setFormAmount("");
    setFormPeriod("monthly");
    setEditingBudget(null);
    setIsCreateOpen(true);
  }

  function openEditDialog(b: Budget) {
    setEditingBudget(b);
    setFormCategory(b.category);
    setFormAmount(String(b.amount));
    setFormPeriod(b.period || "monthly");
    setIsCreateOpen(true);
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid positive budget amount");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (editingBudget) {
        // Edit existing
        const res = await fetch("/api/budgets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingBudget.id,
            amount: amountNum,
            period: formPeriod,
          }),
        });
        if (!res.ok) throw new Error("Failed to update budget");
        setSuccessMsg(t("budgets.edit") + " " + t("settings.savedSuccessfully"));
      } else {
        // Create new
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: formCategory,
            amount: amountNum,
            period: formPeriod,
          }),
        });
        if (!res.ok) throw new Error("Failed to create budget");
        setSuccessMsg(t("budgets.createBudget") + " " + t("settings.savedSuccessfully"));
      }

      setIsCreateOpen(false);
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBudget() {
    if (!deletingBudgetId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/budgets?id=${deletingBudgetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete budget");
      setSuccessMsg(t("budgets.delete") + " " + t("settings.savedSuccessfully"));
      setDeletingBudgetId(null);
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amt);

  if (loading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  const chartData = budgets.map((b) => ({
    name: b.category,
    budgeted: b.amount,
    spent: b.spent,
  }));

  const pieData = budgets.map((b) => ({
    name: b.category,
    value: b.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("budgets.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {summary?.categoryCount || 0} active categories tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setIsRefreshing(true);
              fetchBudgets();
            }}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("budgets.createBudget")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("budgets.totalBudgeted")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(summary?.totalBudgeted || 0)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("budgets.totalSpent")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(summary?.totalSpent || 0)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("budgets.totalRemaining")}
                </p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(summary?.totalRemaining || 0)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <PiggyBank className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      {budgets.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Budget vs. Actual Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17, 24, 39, 0.95)",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                    }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Bar dataKey="budgeted" name="Budgeted" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget List */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t("budgets.myBudgets")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-5">
          {budgets.length === 0 ? (
            <div className="py-12 text-center px-4">
              <AlertCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("budgets.noBudgets")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                {t("budgets.noBudgetsDesc")}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t("budgets.createBudget")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-0">
              {budgets.map((b) => {
                const percent = Math.min(100, Math.round((b.spent / (b.amount || 1)) * 100));
                const isOver = b.spent > b.amount;
                const isClose = !isOver && percent >= 80;

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-base">
                          {b.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              isOver
                                ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                                : isClose
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {isOver ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                {t("budgets.overBudget")}
                              </>
                            ) : isClose ? (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                {t("budgets.closeToLimit")}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                {t("budgets.onTrack")}
                              </>
                            )}
                          </span>
                          <button
                            onClick={() => openEditDialog(b)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"
                            title={t("budgets.edit")}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingBudgetId(b.id)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600"
                            title={t("budgets.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Numbers */}
                      <div className="flex items-baseline justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {t("budgets.spent")}: <strong className="text-gray-900 dark:text-white">{formatCurrency(b.spent)}</strong>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {t("budgets.amount")}: <strong className="text-gray-900 dark:text-white">{formatCurrency(b.amount)}</strong>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? "bg-red-500" : isClose ? "bg-amber-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                      <span>{percent}% utilized</span>
                      <span>
                        {isOver ? (
                          <span className="text-red-500 font-medium">
                            {formatCurrency(b.spent - b.amount)} over
                          </span>
                        ) : (
                          <span>
                            {t("budgets.remaining")}:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(b.remaining)}
                            </strong>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Budget Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleSaveBudget}>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? t("budgets.edit") : t("budgets.createBudget")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("budgets.category")}
                </label>
                {editingBudget ? (
                  <Input value={formCategory} disabled className="bg-gray-100 dark:bg-gray-800" />
                ) : (
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("budgets.amount")} ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("budgets.period")}
                </label>
                <Select value={formPeriod} onValueChange={setFormPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("budgets.monthly")}</SelectItem>
                    <SelectItem value="weekly">{t("budgets.weekly")}</SelectItem>
                    <SelectItem value="yearly">{t("budgets.yearly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingBudgetId}
        onOpenChange={(open) => !open && setDeletingBudgetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("budgets.delete")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            {t("budgets.deleteConfirm")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingBudgetId(null)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBudget}
              isLoading={isSubmitting}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Toast */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}
    </div>
  );
}

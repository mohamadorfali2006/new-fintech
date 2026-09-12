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
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Subscription {
  id: string;
  merchantName: string;
  amount: number;
  currency: string;
  frequency: string;
  category: string;
  monthlyCost: number;
  annualCost: number;
  nextPaymentDate: string | null;
  daysUntilDue: number | null;
  createdAt: string;
}

interface Summary {
  totalMonthly: number;
  totalAnnual: number;
  count: number;
  potentialSavings: number;
}

const CATEGORIES = [
  "Entertainment",
  "Productivity",
  "Utilities",
  "Health & Fitness",
  "Cloud & Hosting",
  "Education",
  "Other",
];

export default function SubscriptionsPage() {
  const t = useTranslations();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dialog state for adding subscription
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [nextPaymentDate, setNextPaymentDate] = useState("");

  async function fetchSubscriptions() {
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to load subscriptions");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setSummary(
        data.summary || {
          totalMonthly: 0,
          totalAnnual: 0,
          count: 0,
          potentialSavings: 0,
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
    fetchSubscriptions();
  }, []);

  async function handleAddSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantName.trim() || !amount) {
      setError("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName,
          amount: parseFloat(amount),
          frequency,
          category,
          nextPaymentDate: nextPaymentDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to add subscription");

      setSuccessMsg("Subscription added successfully!");
      setIsAddOpen(false);
      setMerchantName("");
      setAmount("");
      setNextPaymentDate("");
      fetchSubscriptions();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSubscription() {
    if (!deletingSubId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/subscriptions?id=${deletingSubId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel subscription");
      setSuccessMsg("Subscription cancelled successfully");
      setDeletingSubId(null);
      fetchSubscriptions();
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

  const chartData = subscriptions.map((s) => ({
    name: s.merchantName,
    monthly: s.monthlyCost,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            {t("subscriptions.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {summary?.count || 0} recurring subscriptions tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setIsRefreshing(true);
              fetchSubscriptions();
            }}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subscription
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
                  {t("subscriptions.totalMonthly")}
                </p>
                <h3 className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">
                  {formatCurrency(summary?.totalMonthly || 0)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("subscriptions.totalAnnual")}
                </p>
                <h3 className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white mt-1">
                  {formatCurrency(summary?.totalAnnual || 0)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("subscriptions.potentialSavings")}
                </p>
                <h3 className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(summary?.potentialSavings || 0)}/yr
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart if subscriptions exist */}
      {subscriptions.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-white">
              Monthly Cost by Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
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
                  <Bar dataKey="monthly" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions Table */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            {t("subscriptions.mySubscriptions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="py-12 text-center p-4">
              <CreditCard className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("subscriptions.noSubscriptions")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                {t("subscriptions.noSubscriptionsDesc")}
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Subscription
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("subscriptions.merchant")}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>{t("subscriptions.frequency")}</TableHead>
                    <TableHead>{t("subscriptions.nextPayment")}</TableHead>
                    <TableHead className="text-right">{t("subscriptions.monthlyCost")}</TableHead>
                    <TableHead className="text-right">{t("subscriptions.annualCost")}</TableHead>
                    <TableHead className="w-20 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className="group hover:bg-gray-100/60 dark:hover:bg-gray-800 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.merchantName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {sub.merchantName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {sub.category}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize text-sm tabular-nums text-gray-600 dark:text-gray-300">
                        {sub.frequency}
                      </TableCell>
                      <TableCell>
                        {sub.nextPaymentDate ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span>
                              {new Date(sub.nextPaymentDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {sub.daysUntilDue !== null && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                ({t("subscriptions.daysAway", { days: sub.daysUntilDue })})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white text-sm">
                        {formatCurrency(sub.monthlyCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400 text-sm">
                        {formatCurrency(sub.annualCost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setDeletingSubId(sub.id)}
                          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title={t("subscriptions.cancel")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subscription Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <form onSubmit={handleAddSubscription}>
            <DialogHeader>
              <DialogTitle>Add Subscription</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("subscriptions.merchant")}
                </label>
                <Input
                  placeholder="e.g. Netflix, Spotify, AWS"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                    Amount ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 14.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                    {t("subscriptions.frequency")}
                  </label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t("subscriptions.monthly")}</SelectItem>
                      <SelectItem value="weekly">{t("subscriptions.weekly")}</SelectItem>
                      <SelectItem value="yearly">{t("subscriptions.yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                    Category
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                    {t("subscriptions.nextPayment")}
                  </label>
                  <Input
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                  />
                </div>
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
                onClick={() => setIsAddOpen(false)}
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

      {/* Delete/Cancel Dialog */}
      <Dialog
        open={!!deletingSubId}
        onOpenChange={(open) => !open && setDeletingSubId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">
              {t("subscriptions.cancel")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            Are you sure you want to remove this subscription? You will no longer track upcoming renewal reminders for it.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSubId(null)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubscription}
              isLoading={isSubmitting}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}
    </div>
  );
}

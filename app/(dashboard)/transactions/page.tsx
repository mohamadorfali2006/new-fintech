"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Search, Filter, ArrowUpDown, Download, X,
  ChevronLeft, ChevronRight, MoreHorizontal, Edit2,
  CheckCircle, XCircle, MessageSquare, Eye,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

interface Transaction {
  id: string;
  merchantName: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  status: string;
  isReviewed: boolean;
  isDeleted?: boolean;
  notes: string | null;
  account?: string;
}

interface Category { id: string; name: string; color: string; }
interface Account { id: string; name: string; }

export default function TransactionsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingTxn, setViewingTxn] = useState<Transaction | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const currency = "USD";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(currentPage));
      params.set("limit", "20");

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();

      if (data.transactions) {
        setTransactions(data.transactions);
        setCategories(data.categories || []);
        setAccounts(data.accounts || []);
        setPagination(data.pagination || null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchTransactions(); }, [currentPage]);

  async function handleReview(txn: Transaction) {
    const res = await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isReviewed: !txn.isReviewed }),
    });
    if (res.ok) {
      setSuccessMsg(txn.isReviewed ? "Marked as unreviewed" : "Marked as reviewed");
      fetchTransactions();
    }
  }

  async function handleExclude(txn: Transaction) {
    const res = await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "excluded" }),
    });
    if (res.ok) {
      setSuccessMsg("Transaction excluded");
      fetchTransactions();
    }
  }

  const visibleTxs = transactions.filter((t) => !(
    t.status === "excluded" || t.isDeleted
  ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("transactions.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination?.total || 0} transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setRefreshing(true); fetchTransactions(); }} isLoading={refreshing}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("transactions.searchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("transactions.allCategories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.allCategories")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("transactions.allTypes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.allTypes")}</SelectItem>
                <SelectItem value="income">{t("transactions.income")}</SelectItem>
                <SelectItem value="expense">{t("transactions.expense")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("transactions.allAccounts")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("transactions.allAccounts")}</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <LoadingScreen />
      ) : visibleTxs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("transactions.noTransactions")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("transactions.noTransactionsDesc")}
              </p>
              <Button className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                {t("transactions.export")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("transactions.merchant")}</TableHead>
                    <TableHead>{t("transactions.category")}</TableHead>
                    <TableHead>{t("transactions.date")}</TableHead>
                    <TableHead className="text-right">{t("transactions.amount")}</TableHead>
                    <TableHead className="text-right">{t("transactions.amount") === "Amount" ? "Amount" : t("transactions.amount")}</TableHead>
                    <TableHead className="text-right">{t("transactions.status")}</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTxs.map((txn) => (
                    <TableRow key={txn.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-indigo-500">
                            {txn.merchantName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {txn.merchantName || "Unknown"}
                            </p>
                            {txn.account && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{txn.account}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {txn.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(txn.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums text-sm ${
                          txn.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            txn.status === "posted"
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                              : txn.status === "pending"
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {txn.isReviewed && <CheckCircle className="h-3 w-3" />}
                          {t("transactions.reviewed")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setViewingTxn(txn)}
                            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 dark:hover:text-indigo-400"
                            title={t("transactions.details")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReview(txn)}
                            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 dark:hover:text-indigo-400"
                            title={txn.isReviewed ? t("transactions.markUnreviewed") : t("transactions.markReviewed")}
                          >
                            {txn.isReviewed ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-lg z-50 animate-in slide-in-from-bottom-4">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Transaction detail dialog */}
      <Dialog
        open={!!viewingTxn}
        onOpenChange={() => setViewingTxn(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                {viewingTxn?.merchantName?.charAt(0) || "?"}
              </div>
              {viewingTxn?.merchantName || "Transaction"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("transactions.amount")}
              </span>
              <span
                className={`text-xl font-bold ${
                  viewingTxn?.type === "income"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {viewingTxn?.type === "income" ? "+" : "-"}
                {formatCurrency(viewingTxn?.amount || 0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("transactions.merchant"), value: viewingTxn?.merchantName || "-" },
                { label: t("transactions.category"), value: viewingTxn?.category || "-" },
                {
                  label: t("transactions.date"),
                  value: viewingTxn?.date
                    ? new Date(viewingTxn.date).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })
                    : "-",
                },
                {
                  label: t("transactions.account"),
                  value: viewingTxn?.account || "-",
                },
                { label: t("transactions.status"), value: viewingTxn?.status || "-" },
                {
                  label: t("transactions.reviewed"),
                  value: viewingTxn?.isReviewed ? "Yes" : "No",
                },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTxn(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

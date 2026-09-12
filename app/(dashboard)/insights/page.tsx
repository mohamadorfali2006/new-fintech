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
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Filter,
  Check,
  Eye,
  Calendar,
  Layers,
  RefreshCw,
} from "lucide-react";

interface Insight {
  id: string;
  title: string;
  body: string;
  type: string; // spending | savings | subscription | budget | alert
  severity: string; // info | warning | good
  isRead: boolean;
  createdAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  good: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
};

export default function InsightsPage() {
  const t = useTranslations();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // all | unread | warning | good | info
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchInsights() {
    try {
      const res = await fetch("/api/insights");
      if (!res.ok) throw new Error("Failed to fetch insights");
      const data = await res.json();
      setInsights(data.insights || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchInsights();
  }, []);

  async function handleMarkAsRead(id: string) {
    // Optimistic update
    setInsights((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isRead: true } : i))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch("/api/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      });
    } catch (err) {
      console.error("Failed to mark as read", err);
      fetchInsights();
    }
  }

  async function handleMarkAllAsRead() {
    setInsights((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.error("Failed to mark all as read", err);
      fetchInsights();
    }
  }

  if (loading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  // Filter insights
  const filteredInsights = insights.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.type.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "unread") return !i.isRead;
    if (activeFilter === "warning") return i.severity === "warning";
    if (activeFilter === "good") return i.severity === "good";
    if (activeFilter === "info") return i.severity === "info";
    return true;
  });

  const severityCounts = {
    good: insights.filter((i) => i.severity === "good").length,
    warning: insights.filter((i) => i.severity === "warning").length,
    info: insights.filter((i) => i.severity === "info").length,
  };

  const pieData = [
    { name: t("insights.good"), value: severityCounts.good, color: "#10b981" },
    { name: t("insights.warning"), value: severityCounts.warning, color: "#f59e0b" },
    { name: t("insights.info"), value: severityCounts.info, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            {t("insights.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? t("insights.unreadCount", { count: unreadCount })
              : t("insights.generatedFromData")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setIsRefreshing(true);
              fetchInsights();
            }}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              {t("insights.markAllAsRead")}
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                Total Insights
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {insights.length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Lightbulb className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                {t("insights.good")}
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {severityCounts.good}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                {t("insights.warning")}
              </p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {severityCounts.warning}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                {t("insights.info")}
              </p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {severityCounts.info}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Filter insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: `${t("insights.unread")} (${unreadCount})` },
              { id: "good", label: t("insights.good") },
              { id: "warning", label: t("insights.warning") },
              { id: "info", label: t("insights.info") },
            ].map((f) => (
              <Button
                key={f.id}
                variant={activeFilter === f.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      {filteredInsights.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t("insights.noInsights")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {t("insights.noInsightsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInsights.map((insight) => {
            const isGood = insight.severity === "good";
            const isWarning = insight.severity === "warning";

            return (
              <Card
                key={insight.id}
                className={`transition-all duration-200 hover:shadow-md bg-gray-50 dark:bg-gray-800/50 ${
                  !insight.isRead
                    ? "border-l-4 border-l-indigo-600 dark:border-l-indigo-500"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                        isGood
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                          : isWarning
                          ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                          : "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {isGood ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <Info className="h-5 w-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                          {insight.title}
                        </h3>

                        {/* Severity Badge */}
                        <span
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                            isGood
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : isWarning
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {insight.severity}
                        </span>

                        {/* Type Badge */}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">
                          {insight.type}
                        </span>

                        {!insight.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {insight.body}
                      </p>

                      <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(insight.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedInsight(insight)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    {!insight.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(insight.id)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t("insights.markAsRead")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Insight Detail Dialog */}
      <Dialog
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      >
        <DialogContent className="max-w-md">
          {selectedInsight && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      selectedInsight.severity === "good"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                        : selectedInsight.severity === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {selectedInsight.severity}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 capitalize">
                    {selectedInsight.type}
                  </span>
                </div>
                <DialogTitle>{selectedInsight.title}</DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedInsight.body}
                </p>

                <div className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3 flex items-center justify-between">
                  <span>
                    Generated:{" "}
                    {new Date(selectedInsight.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span>
                    Status: {selectedInsight.isRead ? t("insights.read") : t("insights.unread")}
                  </span>
                </div>
              </div>

              <DialogFooter>
                {!selectedInsight.isRead && (
                  <Button
                    onClick={() => {
                      handleMarkAsRead(selectedInsight.id);
                      setSelectedInsight(null);
                    }}
                  >
                    {t("insights.markAsRead")}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedInsight(null)}>
                  {t("common.close")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

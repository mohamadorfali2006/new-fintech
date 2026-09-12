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
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit2,
  Sparkles,
  Globe,
  DollarSign,
  RefreshCw,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  currency: string;
  theme: string;
  language: string;
  country: string;
  timezone: string;
  createdAt: string;
}

export default function ProfilePage() {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit profile dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchUserProfile() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setUser(data.user);
      setDemoMode(Boolean(data.demoMode));
      setEditName(data.user?.name || "");
      setEditCurrency(data.user?.currency || "USD");
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          currency: editCurrency,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      const data = await res.json();
      setUser(data.user);
      setSuccessMsg(t("profile.profileUpdated"));
      setIsEditOpen(false);
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  const memberSinceFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-indigo-500" />
            {t("profile.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal profile and account credentials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setIsRefreshing(true);
              fetchUserProfile();
            }}
            isLoading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            {t("profile.updateProfile")}
          </Button>
        </div>
      </div>

      {/* Main Profile Card */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90" />
        <CardContent className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 mb-6 gap-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 rounded-2xl bg-indigo-600 border-4 border-white dark:border-gray-800 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.name || "NewFinTech User"}
                  </h2>
                  {demoMode && (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                      <Sparkles className="h-3 w-3" />
                      {t("profile.demoUser")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user?.email || "No email provided"}
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                {t("profile.memberSince")}
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {memberSinceFormatted}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Default Currency
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white uppercase">
                {user?.currency || "USD"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                Language
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                {user?.language === "ar" ? "العربية (Arabic)" : "English (US)"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-500" />
                Account Security
              </p>
              <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Protected (Session active)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Theme
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                {user?.theme || "System"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Country
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {user?.country || "United States (US)"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateProfile}>
            <DialogHeader>
              <DialogTitle>{t("profile.updateProfile")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("profile.displayName")}
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  {t("profile.emailAddress")}
                </label>
                <Input value={user?.email || ""} disabled className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Email address cannot be changed directly.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Default Currency
                </label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="SAR">SAR (ر.س)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
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
                onClick={() => setIsEditOpen(false)}
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

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}
    </div>
  );
}

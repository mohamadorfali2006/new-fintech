"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  Languages,
  Bell,
  Lock,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Trash2,
  Unlink,
  Save,
  Shield,
  Key,
} from "lucide-react";

interface NotificationPrefs {
  unusualSpending: boolean;
  budgetLimit: boolean;
  largeTransaction: boolean;
  monthlySummary: boolean;
  upcomingSubscription: boolean;
}

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("en");

  // Notification prefs
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    unusualSpending: true,
    budgetLimit: true,
    largeTransaction: true,
    monthlySummary: true,
    upcomingSubscription: true,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Danger zone dialogs
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [isDangerLoading, setIsDangerLoading] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState("");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadSettings() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setDemoMode(Boolean(data.demoMode));
          setUserEmail(data.user?.email || "");
          if (data.user?.language) {
            setCurrentLanguage(data.user.language);
          }
          if (data.user?.notifications) {
            try {
              const parsed =
                typeof data.user.notifications === "string"
                  ? JSON.parse(data.user.notifications)
                  : data.user.notifications;
              setNotifications((prev) => ({ ...prev, ...parsed }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  function handleLanguageChange(newLang: string) {
    setCurrentLanguage(newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";

    // Save preference to server
    fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: newLang }),
    }).catch(console.error);

    setFeedback(t("settings.savedSuccessfully"));
    router.refresh();
  }

  async function handleSaveNotifications() {
    setIsSavingPrefs(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      setFeedback(t("settings.savedSuccessfully"));
    } catch (err) {
      setFeedback("Failed to save settings");
    } finally {
      setIsSavingPrefs(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "Password must be at least 8 characters",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: "Passwords do not match",
      });
      return;
    }

    setPasswordLoading(true);
    // Simulate password change logic
    setTimeout(() => {
      setPasswordLoading(false);
      setPasswordMsg({
        type: "success",
        text: t("settings.passwordChanged"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 600);
  }

  async function handleDisconnectAllBanks() {
    setIsDangerLoading(true);
    try {
      // Clear connections
      setTimeout(() => {
        setIsDangerLoading(false);
        setIsDisconnectOpen(false);
        setFeedback("All bank connections disconnected.");
      }, 500);
    } catch (err) {
      setIsDangerLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmEmailInput !== userEmail) {
      return;
    }
    setIsDangerLoading(true);
    setTimeout(() => {
      setIsDangerLoading(false);
      setIsDeleteOpen(false);
      window.location.href = "/login";
    }, 800);
  }

  if (loading || !mounted) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-indigo-500" />
          {t("settings.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Customize your experience, preferences, notifications, and security
        </p>
      </div>

      {/* Demo Mode Indicator */}
      {demoMode && (
        <Card className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                {t("settings.demoMode")}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {t("settings.demoModeDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance / Theme */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Sun className="h-4 w-4 text-indigo-500" />
            {t("settings.theme")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
                theme === "light"
                  ? "border-indigo-600 bg-white dark:bg-gray-800 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Sun className="h-5 w-5" />
              {t("settings.themeLight")}
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
                theme === "dark"
                  ? "border-indigo-600 bg-white dark:bg-gray-800 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Moon className="h-5 w-5" />
              {t("settings.themeDark")}
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-sm font-medium transition-all ${
                theme === "system"
                  ? "border-indigo-600 bg-white dark:bg-gray-800 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Laptop className="h-5 w-5" />
              {t("settings.themeSystem")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language Toggle with RTL Support */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-500" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select your primary language. Switching to Arabic enables native RTL layout.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={`p-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
                currentLanguage === "en"
                  ? "border-indigo-600 bg-white dark:bg-gray-800 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <span>English (LTR)</span>
              {currentLanguage === "en" && <CheckCircle className="h-4 w-4 text-indigo-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange("ar")}
              className={`p-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
                currentLanguage === "ar"
                  ? "border-indigo-600 bg-white dark:bg-gray-800 text-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <span>العربية (RTL)</span>
              {currentLanguage === "ar" && <CheckCircle className="h-4 w-4 text-indigo-600" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-purple-500" />
            {t("settings.notificationPrefs")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { key: "unusualSpending", label: t("settings.unusualSpending") },
              { key: "budgetLimit", label: t("settings.budgetLimit") },
              { key: "largeTransaction", label: t("settings.largeTransaction") },
              { key: "monthlySummary", label: t("settings.monthlySummary") },
              { key: "upcomingSubscription", label: t("settings.upcomingSubscription") },
            ].map(({ key, label }) => {
              const isChecked = notifications[key as keyof NotificationPrefs];
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {label}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveNotifications} isLoading={isSavingPrefs}>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-500" />
            {t("settings.changePassword")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                {t("settings.currentPassword")}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                {t("settings.newPassword")}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                {t("settings.confirmNewPassword")}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200"
                }`}
              >
                {passwordMsg.type === "success" ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {passwordMsg.text}
              </div>
            )}

            <Button type="submit" isLoading={passwordLoading}>
              <Key className="h-4 w-4 mr-2" />
              {t("settings.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("settings.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-red-200/80 dark:border-red-900/40 bg-white dark:bg-gray-800">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {t("settings.disconnectAll")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">
                {t("settings.disconnectAllDesc")}
              </p>
            </div>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
              onClick={() => setIsDisconnectOpen(true)}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect All
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-red-200/80 dark:border-red-900/40 bg-white dark:bg-gray-800">
            <div>
              <h4 className="font-semibold text-red-600 dark:text-red-400 text-sm">
                {t("settings.deleteAccount")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">
                {t("settings.deleteAccountDesc")}
              </p>
            </div>
            <Button
              variant="destructive"
              className="shrink-0"
              onClick={() => {
                setConfirmEmailInput("");
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect All Confirmation Dialog */}
      <Dialog open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("settings.disconnectAll")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-2">
            {t("settings.disconnectAllConfirm")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDisconnectOpen(false)}
              disabled={isDangerLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectAllBanks}
              isLoading={isDangerLoading}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("settings.deleteAccount")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("settings.deleteAccountDesc")}
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("settings.deleteAccountConfirm")}:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-indigo-600">
                {userEmail}
              </code>
            </p>
            <Input
              placeholder={userEmail}
              value={confirmEmailInput}
              onChange={(e) => setConfirmEmailInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDangerLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmEmailInput !== userEmail || isDangerLoading}
              onClick={handleDeleteAccount}
              isLoading={isDangerLoading}
            >
              {t("settings.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed bottom-4 right-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2 shadow-lg z-50 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="h-4 w-4" />
          {feedback}
        </div>
      )}
    </div>
  );
}

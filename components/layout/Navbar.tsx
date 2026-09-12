"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  PieChart,
  BarChart3,
  Lightbulb,
  Repeat,
  Bot,
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  Globe,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "nav.transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "nav.accounts", icon: Building2 },
  { href: "/budgets", label: "nav.budgets", icon: PieChart },
  { href: "/analytics", label: "nav.analytics", icon: BarChart3 },
  { href: "/insights", label: "nav.insights", icon: Lightbulb },
  { href: "/subscriptions", label: "nav.subscriptions", icon: Repeat },
  { href: "/ai", label: "nav.aiAssistant", icon: Bot },
  { href: "/notifications", label: "nav.notifications", icon: Bell },
];

const bottomNavItems = [
  { href: "/settings", label: "nav.settings", icon: Settings, labelKey: "nav.settings" },
  { href: "/profile", label: "nav.profile", icon: User, labelKey: "nav.profile" },
];

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const locale = typeof window !== "undefined" ? (window as any).__NEXT_DATA__.params?.locale ?? "en" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <>
      {/* Top navbar */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors",
          transparent && "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 lg:px-6" dir={dir}>
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:inline">{t("common.appName")}</span>
          </Link>

          {/* Desktop nav — show first 5 items + dropdown */}
          <nav className="hidden md:flex items-center gap-1" dir={dir}>
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey || item.label)}
              </Link>
            ))}
            <div className="relative">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden lg:inline">{t("common.settings")}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                  {bottomNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname === item.href
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/50"
                      )}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.labelKey!)}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border/50" />
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.logout")}
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2" dir={dir}>
            <Link
              href={`/i18n/${locale === "ar" ? "en" : "ar"}`}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t("common.language")}
            >
              <Globe className="h-4 w-4" />
            </Link>
            {session ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                    {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {session.user?.name || session.user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {bottomNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-popover-foreground hover:bg-accent/50"
                        )}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {t(item.labelKey!)}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-border/50" />
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-full"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {t("common.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">
                  {t("common.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pt-3 pb-safe" dir={dir}>
          <div className="flex items-center justify-around max-h-[60vh] overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(item.label)}</span>
              </Link>
            ))}
            <Link
              href="/settings"
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-colors",
                pathname === "/settings"
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t("nav.settings")}</span>
            </Link>
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t("common.logout")}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Re-export MoreHorizontal from lucide
import { MoreHorizontal } from "lucide-react";

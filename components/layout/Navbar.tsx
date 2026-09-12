"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
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
  Globe,
  ChevronDown,
  MoreHorizontal,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
  { href: "/accounts", labelKey: "nav.accounts", icon: Building2 },
  { href: "/budgets", labelKey: "nav.budgets", icon: PieChart },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/insights", labelKey: "nav.insights", icon: Lightbulb },
  { href: "/subscriptions", labelKey: "nav.subscriptions", icon: Repeat },
  { href: "/ai", labelKey: "nav.aiAssistant", icon: Bot },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
];

const bottomNavItems = [
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/profile", labelKey: "nav.profile", icon: User },
];

const PRIMARY_NAV_COUNT = 5;

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const primaryItems = navItems.slice(0, PRIMARY_NAV_COUNT);
  const overflowItems = navItems.slice(PRIMARY_NAV_COUNT);

  function closeAllMenus() {
    setUserMenuOpen(false);
    setMoreMenuOpen(false);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Top navbar */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors",
          transparent && "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold" aria-label={t("common.appName")}>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="hidden sm:inline">{t("common.appName")}</span>
          </Link>

          {/* Desktop nav — first 5 items + "More" overflow */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {t(item.labelKey)}
              </Link>
            ))}
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
                aria-label={t("common.settings")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  overflowItems.some((i) => pathname.startsWith(i.href)) || pathname.startsWith("/settings")
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                onClick={() => {
                  setMoreMenuOpen(!moreMenuOpen);
                  setUserMenuOpen(false);
                }}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">{t("common.settings")}</span>
              </button>
              {moreMenuOpen && (
                <div role="menu" className="absolute end-0 mt-2 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                  {overflowItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname.startsWith(item.href)
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/50"
                      )}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  {bottomNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        pathname === item.href
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/50"
                      )}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border/50" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("common.logout")}
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t("components.collapse") : t("components.expand")}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <Link
              href="/settings"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t("common.language")}
              aria-label={t("common.language")}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
            </Link>
            {session ? (
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 ps-2 pe-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setMoreMenuOpen(false);
                  }}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold" aria-hidden="true">
                    {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {session.user?.name || session.user?.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                </button>
                {userMenuOpen && (
                  <div role="menu" className="absolute end-0 mt-2 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {bottomNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-popover-foreground hover:bg-accent/50"
                        )}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        {t(item.labelKey)}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-border/50" />
                    <button
                      type="button"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-full"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
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
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pt-3 pb-safe">
          <nav aria-label="Mobile" className="flex items-center justify-around max-h-[60vh] overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              </Link>
            ))}
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-colors",
                pathname === "/settings"
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{t("nav.settings")}</span>
            </Link>
            <button
              type="button"
              className="flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                closeAllMenus();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{t("common.logout")}</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

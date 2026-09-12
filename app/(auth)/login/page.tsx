"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Mail, Lock, AlertCircle, BarChart3, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Shape rule: controls rounded-lg, cards rounded-2xl, pills rounded-full.
// Accent lock: indigo-600 only. Motion: CSS transitions only.

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError(t("auth.invalidCredentials"));
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } catch {
        // Non-standard failure (e.g. HTTP 429 rate-limit JSON has no `url`
        // field, which makes next-auth's client throw TypeError). Never
        // white-screen: show a retryable message instead.
        setError("Sign-in failed. If you tried several times, wait a minute and try again.");
      }
    });
  }

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Brand panel: hidden on mobile, explicit collapse */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
          <img
            src="https://picsum.photos/seed/newfintech-signin/900/1100"
            alt=""
            aria-hidden="true"
            width={900}
            height={1100}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-zinc-950/70 dark:bg-zinc-950/75" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">{t("common.appName")}</span>
          </div>
          <div className="relative">
            <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-white">
              {t("auth.welcomeBack")}
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                { icon: <BarChart3 className="h-4 w-4" />, text: "Dashboard" },
                { icon: <Sparkles className="h-4 w-4" />, text: "AI Insights" },
                { icon: <Shield className="h-4 w-4" />, text: "Secure" },
              ].map((row) => (
                <li key={row.text} className="flex items-center gap-3 text-sm text-zinc-200">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                    {row.icon}
                  </span>
                  {row.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-zinc-400">256-bit encryption. You control what is shared.</p>
        </div>

        {/* Form column */}
        <div className="flex items-center justify-center bg-zinc-50 px-4 py-10 sm:px-8 dark:bg-zinc-950">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-6">
                <h1 className="mb-1 text-2xl font-bold tracking-tight">
                  {t("auth.welcomeBack")}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("auth.signIn")}</p>
              </div>

              {/* Demo credentials hint */}
              <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800/50 dark:bg-indigo-950/40">
                <p className="mb-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">{t("accounts.demoMode")}</p>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  demo@newfintech.app / Demo1234!
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pe-4 ps-10 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pe-4 ps-10 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  {isPending ? t("auth.loggingIn") : t("auth.signIn")}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    {t("auth.orContinueWith")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32c-.12.06-.26.1-.41.13a5.06 5.06 0 01-3.46 0 5.06 5.06 0 01-.41-.13 5.06 5.06 0 01-2.2-3.32V6.5h5.15c.67 1.2 1.03 2.53 1.03 3.75z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.66c-.58.26-1.26.42-2.06.42-2.22 0-4.04-1.82-4.04-4.04 0-.53.12-1.04.34-1.49l2.86-2.34C6.92 15.8 6 14.06 6 12.25c0-3.06 2.46-5.56 5.56-5.56.35 0 .69.04 1.02.12l2.56 2.56c-.08.33-.12.67-.12 1.02 0 2.22 1.82 4.04 4.04 4.04 1.78 0 3.38-1.18 3.94-2.86z" />
                </svg>
                {t("auth.signInWithGoogle")}
              </button>

              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("auth.noAccount")}{" "}
                <a href="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  {t("auth.signUpInstead")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

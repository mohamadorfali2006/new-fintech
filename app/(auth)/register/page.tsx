"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Mail, Lock, User, AlertCircle, CheckCircle, BarChart3, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Shape rule: controls rounded-lg, cards rounded-2xl, pills rounded-full.
// Accent lock: indigo-600 only. Motion: CSS transitions only.

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Auto sign in after registration via NextAuth
      try {
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInResult?.error) {
          // Account exists but auto sign-in failed - let them sign in manually.
          router.push("/login");
          return;
        }
      } catch {
        // Rate-limit/network failure must not white-screen (see login page).
        router.push("/login");
        return;
      }
      setSuccess(true);
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (success) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t("common.appName")}
          </h1>
          <p className="mb-6 text-zinc-500 dark:text-zinc-400">
            Account created successfully! Redirecting...
          </p>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Brand panel: hidden on mobile, explicit collapse */}
        <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
          <img
            src="https://picsum.photos/seed/newfintech-register/900/1100"
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
              {t("auth.createAccount")}
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
          <p className="relative text-xs text-zinc-400">Free to start. No credit card required.</p>
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
                  {t("auth.createAccount")}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("auth.signUp")}</p>
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
                    {t("auth.name")}
                  </label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pe-4 ps-10 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

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
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pe-4 ps-10 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pe-4 ps-10 text-zinc-900 placeholder-zinc-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Use at least 8 characters with a mix of letters and numbers.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  {isPending ? t("auth.creatingAccount") : t("common.register")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("auth.hasAccount")}{" "}
                <a href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  {t("auth.signInInstead")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-100/50 to-transparent dark:from-indigo-950/20" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-t from-purple-100/30 to-transparent dark:from-purple-950/20" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{t("common.appName")}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-black/5 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {t("auth.welcomeBack")}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">{t("auth.signIn")}</p>
            </div>

            {/* Demo credentials hint */}
            <div className="mb-6 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t("accounts.demoMode")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                demo@newfintech.app / demo1234
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 mb-4 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isPending}
                isLoading={isPending}
              >
                {isPending ? t("auth.loggingIn") : t("auth.signIn")}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  {t("auth.orContinueWith")}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32c-.12.06-.26.1-.41.13a5.06 5.06 0 01-3.46 0 5.06 5.06 0 01-.41-.13 5.06 5.06 0 01-2.2-3.32V6.5h5.15c.67 1.2 1.03 2.53 1.03 3.75z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.66c-.58.26-1.26.42-2.06.42-2.22 0-4.04-1.82-4.04-4.04 0-.53.12-1.04.34-1.49l2.86-2.34C6.92 15.8 6 14.06 6 12.25c0-3.06 2.46-5.56 5.56-5.56.35 0 .69.04 1.02.12l2.56 2.56c-.08.33-.12.67-.12 1.02 0 2.22 1.82 4.04 4.04 4.04 1.78 0 3.38-1.18 3.94-2.86z" />
              </svg>
              {t("auth.signInWithGoogle")}
            </button>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("auth.noAccount")}{" "}
              <a href="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                {t("auth.signUpInstead")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

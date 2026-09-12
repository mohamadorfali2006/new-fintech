import Link from "next/link";
import { ArrowRight, CreditCard, BarChart3, Wallet, Sparkles, Globe, Shield, Landmark } from "lucide-react";

// Shape rule: controls rounded-lg, cards rounded-2xl, pills rounded-full.
// Accent lock: indigo-600 only (dark: indigo-500/400 for text). No secondary hue.
// Motion: CSS transitions only (MOTION 4). Decorative motion gated with motion-safe.

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Nav: single line, h-16 */}
      <nav className="sticky top-0 z-40 h-16 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <span className="truncate text-lg font-bold tracking-tight">NewFinTech</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-indigo-700 active:scale-[0.98]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero: asymmetric split, left content / right asset. pt capped at pt-24. */}
      <section className="px-4 pb-12 pt-16 sm:px-6 lg:pt-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="text-start lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Financial Intelligence
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-none tracking-tighter md:text-5xl lg:text-6xl">
              Your money, fully understood
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Connect accounts, track spending, and get AI tips to save more each month.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98]"
              >
                Get started
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                See how it works
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <img
              src="https://picsum.photos/seed/newfintech-dashboard/800/640"
              alt="Personal finance dashboard showing budgets and spending trends"
              width={800}
              height={640}
              fetchPriority="high"
              className="aspect-[5/4] w-full rounded-2xl border border-zinc-200 object-cover shadow-xl shadow-zinc-900/5 dark:border-zinc-800"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="text-xl font-bold tabular-nums">10M+</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Transactions analyzed</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="text-xl font-bold tabular-nums">256-bit</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Bank grade encryption</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bank wall: logo only, directly under hero */}
      <section className="border-y border-zinc-200/70 px-4 py-10 sm:px-6 dark:border-zinc-800/70 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Works with your bank
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {banks.map((b) => (
              <div
                key={b.name}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-indigo-700"
              >
                <Landmark className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features: asymmetric bento, 6 items in 6 cells */}
      <section id="features" className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-md text-3xl font-bold tracking-tight">Everything you need</h2>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            From transaction tracking to AI insights in one place for your financial life.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            {/* Large cell with real image */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5 motion-safe:hover:-translate-y-0.5 md:col-span-6 lg:col-span-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                <div className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Smart Dashboard</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    See your entire financial picture at a glance: income, expenses, budgets, and net worth.
                  </p>
                </div>
                <img
                  src="https://picsum.photos/seed/newfintech-insights/640/480"
                  alt="Charts summarizing monthly income and expenses"
                  width={640}
                  height={480}
                  loading="lazy"
                  className="h-48 w-full object-cover sm:h-full"
                />
              </div>
            </div>
            {/* Tinted cell */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5 motion-safe:hover:-translate-y-0.5 md:col-span-3 lg:col-span-2 dark:border-indigo-800/50 dark:bg-indigo-950/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Budget Control</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Set spending limits per category and get alerts before you go over.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5 motion-safe:hover:-translate-y-0.5 md:col-span-3 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI Insights</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Get intelligent recommendations to save money, cut waste, and reach your goals faster.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5 motion-safe:hover:-translate-y-0.5 md:col-span-3 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Secure Connections</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Bank grade encryption for every connection. We never store your credentials.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-600/5 motion-safe:hover:-translate-y-0.5 md:col-span-3 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Multi-Currency</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Track finances in any currency with automatic conversion and exchange rates.
              </p>
            </div>
            {/* Full width closing cell */}
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between md:col-span-6 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold">Subscription Manager</h3>
                  <p className="max-w-[65ch] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Know exactly what you pay for each month and catch forgotten subscriptions.
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-indigo-700 active:scale-[0.98]"
              >
                Get started
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy stats: plain metrics, same theme both modes */}
      <section className="border-y border-zinc-200/70 bg-zinc-50 px-4 py-14 sm:px-6 dark:border-zinc-800/70 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">Built for your privacy</h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold tabular-nums tracking-tight">{s.value}</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA: split layout, solid accent both modes */}
      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 rounded-2xl bg-indigo-600 px-6 py-12 sm:px-10 lg:grid-cols-2 dark:bg-indigo-600">
          <div>
            <h2 className="max-w-md text-3xl font-bold tracking-tight text-white">
              Take control of your finances
            </h2>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-indigo-100">
              Join thousands of users who understand their spending and save more every month.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:justify-end">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 font-medium text-indigo-700 transition-all duration-300 hover:bg-indigo-50 active:scale-[0.98]"
            >
              Get started
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 px-8 py-3 font-medium text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-4 py-8 sm:px-6 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600">
              <CreditCard className="h-3 w-3 text-white" />
            </div>
            NewFinTech, personal finance intelligence
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/login" className="transition-colors hover:text-zinc-900 dark:hover:text-white">Sign in</Link>
            <Link href="/register" className="transition-colors hover:text-zinc-900 dark:hover:text-white">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const banks = [
  { name: "Chase" },
  { name: "Bank of America" },
  { name: "Wells Fargo" },
  { name: "Citibank" },
  { name: "Capital One" },
  { name: "Mock (Demo)" },
];

const stats = [
  { value: "256-bit", label: "Encryption" },
  { value: "SOC 2", label: "Compliance" },
  { value: "10M+", label: "Transactions" },
  { value: "<50ms", label: "API Latency" },
];

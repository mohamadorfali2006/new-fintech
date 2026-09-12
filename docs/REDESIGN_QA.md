# Redesign QA Gate Report

**Date:** 2026-09-12 (snapshot ~23:03 local, after final re-run)
**Scope:** READ-ONLY audit. No source edits made. Sibling redesign agents were still landing edits during this audit (observed `app/page.tsx` 184 → 279 lines and `dashboard/page.tsx` edited mid-audit); all four gates were therefore run **twice**, and results below are from the second (final) run.
**Baseline:** tsc 0, lint 0, tests 45/45, build green.

## 1. Gate results (final run)

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | **PASS** — exit 0, empty output, 0 errors |
| Lint | `pnpm run lint` | **PASS** — exit 0, 0 errors, 4 warnings (all `@next/next/no-img-element`, see defects) |
| Tests | `pnpm test` (`vitest run`) | **PASS** — 6 files, **45/45** passed |
| Build | `pnpm run build` | **PASS** — exit 0, all 30 routes compiled, no errors |

First run (pre-sibling-landing) was also green on all four; no retry-for-red was needed. `dashboard/page.tsx` changed between run 1 and run 2 (2 new lint `<img>` warnings appeared), which is why the full matrix was re-executed.

## 2. Mechanical taste-skill pre-flight spot-checks

Applies to touched pages: `app/page.tsx`, `app/(auth)/login|register/page.tsx`, `app/(dashboard)/accounts|analytics|budgets|dashboard|transactions|notifications/page.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `app/layout.tsx`, `components/layout/Navbar.tsx`. (Dashboard/data surfaces noted where the taste skill declares itself out of scope for dashboards, §13.)

| Check | Result |
|-------|--------|
| Em-dash grep (`—`/`–`) in changed pages | **FAIL** — 3 files with user-visible hits (see defects). Landing `app/page.tsx` itself is clean (0 hits, verified on disk post-edit). |
| Eyebrow count (`uppercase tracking` micro-labels) | **PASS (landing)** — `app/page.tsx`: 0 eyebrows / 5 `<section>`s (limit ceil(5/3)=2). Dashboard hits are form `<label>`s, not section eyebrows; skill is out of scope for dashboards. |
| Single-line nav | **PASS** — marketing nav: `h-16`, one flex row, truncate brand. App `Navbar`: `h-16` (64px ≤ 80px cap), `hidden md:flex` desktop row with first-5 + "More" overflow menu, separate mobile bottom nav. |
| `dark:` coverage on touched files | **PASS with 1 minor** — all touched UI files carry `dark:` (landing 27, login 20, register 23, accounts 34, analytics 15, budgets 43, dashboard 57, transactions 24, notifications 9, Navbar 14, error 4, not-found 4). `app/loading.tsx` has 0 (see defects). `app/layout.tsx` / `Analytics.tsx` carry no color utilities (structural/placeholder, N/A). |
| Mobile classes present | **PASS** — landing 5 (`sm:`/`md:`/`lg:` grid collapse `grid-cols-1 → lg:grid-cols-12`), dashboard 7, login/register use base `grid-cols-1` + `lg:grid-cols-2` (explicit `<768px` single-column fallback, no breakpoint prefix needed). `error`/`not-found`/`loading` are single-column centered layouts, no multi-col fallback required. |
| Reduced-motion where transitions added | **PARTIAL** — decorative lifts added in redesign are gated (`motion-safe:hover:-translate-y-0.5`, per owner's "MOTION 4, CSS transitions only" comment). But: color/opacity `transition-all duration-300` on buttons/cards, `animate-spin` loader, and `animate-in fade-in-0 zoom-in-95` dialog are ungated; **no** `prefers-reduced-motion` / `useReducedMotion` / `motion-reduce` rule exists anywhere in `app/`/`components/`/`lib/`. Strictly fails skill §6.B at MOTION 4; practically low-risk (CSS-only, no scroll-hijack). |
| Viewport stability (`h-screen` ban) | **PASS** — zero `h-screen`; all full-height layouts use `min-h-[100dvh]`. |
| Hero discipline (landing) | **PASS** — 1-line headline, 13-word subtext (≤20), `pt-16 lg:pt-24` (capped), 4-element stack (pill, H1, sub, 2 CTAs), logo wall under hero, real picsum image with descriptive alt + `fetchPriority="high"`. One label per CTA intent ("Get started" reused consistently). |

## 3. Defect list by owner file

Owner areas inferred from file roles (lead/tokens, marketing, shell, data).

### FAIL (must fix before sign-off)

1. **`app/(dashboard)/transactions/page.tsx`** (data) — user-visible em-dash placeholders `"—"` ×7 (lines ~377–391: merchant, category, account, status fallbacks). Taste skill §9.G: zero tolerance. Fix: `-` or `N/A`.
2. **`app/(dashboard)/subscriptions/page.tsx`** (data) — user-visible `<span>—</span>` empty-state dash (line ~387). Same fix.
3. **`app/(dashboard)/profile/page.tsx`** (data) — user-visible `"—"` fallback (line ~125). Same fix.
4. **`app/layout.tsx`** (shell) — metadata title `"NewFinTech — Personal Finance Intelligence"` (line ~16) renders in the browser tab. Fix: hyphen.

### ADVISORY (warnings, non-blocking)

5. **`app/page.tsx`** (marketing) — 2× `no-img-element` lint warnings (lines ~68 hero, ~130). Hero `<img>` uses picsum + `fetchPriority="high"`; acceptable placeholder strategy per skill §4.8, but `next/image` would clear the warning and improve LCP accounting.
6. **`app/(dashboard)/dashboard/page.tsx`** (data) — 2× `no-img-element` lint warnings (lines ~51, ~99), added by the latest sibling edit.
7. **`app/loading.tsx`** (shell) — 0 `dark:` utilities; `animate-spin` loader (`border-indigo-200 …`) ungated by `motion-safe` and untested in dark mode. Tiny file, low risk, but it is the only touched UI file with zero dark coverage.
8. **Global** (lead/tokens) — no `prefers-reduced-motion` baseline in `app/globals.css`; ungated `transition-all duration-300`, `animate-spin`, `animate-in` noted in §2. Recommend one global `@media (prefers-reduced-motion: reduce)` kill-switch if motion intensity ever exceeds CSS-hover level.

### Non-issues explicitly triaged (not defects)

- Em-dashes inside **code comments** (`register/page.tsx:55`, `chat/route.ts`, `bank/*`, `export/route.ts`, `Analytics.tsx`, Navbar comment): not user-visible, rule governs visible strings. Left alone.
- `uppercase tracking` hits in budgets/subscriptions/insights/profile/settings pages: form `<label>`s, not section eyebrows; dashboards out of skill scope.
- Earlier in this audit a stale search showed em-dashes in `app/page.tsx` copy; on-disk verification after the sibling's final edit shows **0 hits** — already resolved, no action.

## 4. Verdict

**Gates: 4/4 GREEN** (tsc 0 errors, lint 0 errors, tests 45/45, build green).
**Taste pre-flight: CONDITIONAL PASS** — 6/7 checks pass (1 partial); 4 FAIL-class defects, all confined to user-visible em-dash characters in **data-owner** (`transactions`, `subscriptions`, `profile`) and **shell-owner** (`layout.tsx` title) files. No defect touches the marketing landing page, nav, theming, or responsiveness. Recommend fix-and-merge for the 4 FAIL items (each a one-character edit by the owning agent) with no re-audit beyond a grep for `—|–` in `app/`.

# NewFinTech — Intelligent Personal Finance & Expense Analytics Platform

## Overview
A production-ready personal finance intelligence platform. Users connect bank accounts, track transactions, analyze spending, set budgets, and get AI-powered financial insights. Built as a modern full-stack web app with bank integration abstraction, RTL support, and demo mode.

## Tech Stack
- **Frontend / Full-stack framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui + Lucide React icons
- **Charts:** Recharts
- **Database / ORM:** Prisma + SQLite (dev) / PostgreSQL (prod)
- **Authentication:** NextAuth.js (credentials + Google OAuth)
- **State:** React Server Components + Server Actions + minimal client state
- **Bank abstraction:** Pluggable provider interface (Plaid/TrueLayer/Teller-ready) + mock provider
- **AI Assistant:** LLM-powered chat over user transaction data (OpenAI-compatible endpoint)
- **Internationalization:** next-intl (en + ar, RTL-ready)
- **Testing:** Jest + React Testing Library (backend + critical UI flows)
- **Deployment:** Docker-ready, environment-variable-driven

## Design Direction
Premium FinTech aesthetic inspired by Revolut, Monzo, N26, and Wise. Dark/light mode. Mobile-first responsive. Clean typography (Inter), card-based layout, subtle motion, clear data hierarchy. No generic admin-template look.

## Architecture (high level)
```
Client (Next.js App Router)
  │
  ├── Server Components / Server Actions
  │
  ├── API Routes (Next.js)  ←  Authentication, Accounts, Transactions, Budgets, Analytics, Insights, AI
  │
  ├── Prisma ORM  ←  SQLite/PostgreSQL
  │
  ├── Bank Integration Layer  ←  Provider interface → Mock / Plaid / TrueLayer
  │
  ├── Categorization Engine  ←  Rules + merchant map + AI fallback
  │
  └── AI Assistant Module  ←  LLM query over user data
```

## Core Modules
1. Auth (register, login, logout, password reset, profile)
2. Dashboard (balance, income/expense, savings rate, charts, recent transactions, health score)
3. Accounts (list, connect, disconnect, sync, balances)
4. Transactions (table, search, filters, pagination, details, edit category/notes, mark reviewed)
5. Categories + categorization engine (rules + merchant map + manual override)
6. Analytics (income/expense, net savings, trends, category distribution, top merchants, time filters)
7. Budgets (monthly, per-category, progress, overspend alerts)
8. Insights (natural-language financial observations from real data)
9. AI Assistant (chat over user transactions, disclaimers, no hallucinated data)
10. Subscriptions (recurring detection, monthly cost, next payment, annual estimate)
11. Financial Health Score (savings, budgeting, stability — educational, transparent)
12. Notifications & alerts (unusual spending, budget limit, large transaction, upcoming subscription, monthly summary)
13. Settings (profile, currency, theme, language, notifications, security, data export, disconnect)
14. i18n (en + ar with RTL)

## Demo Mode
Seeded with realistic mock data: multiple accounts, income, recurring subscriptions, varied spending across categories and months. Clear "Demo Mode" indicator. App fully functional without real bank API keys.

## Security
- Auth secured, users isolated (row-level ownership checks everywhere)
- Input validation, SQL injection protection via Prisma, XSS via React, CSRF via NextAuth
- No bank credentials stored; only tokens/IDs from providers
- Environment variables for all secrets; .env excluded from git
- Rate limiting on auth endpoints

## Database Schema (core entities)
- User, BankConnection, BankAccount, Transaction, Category, Budget, Subscription, FinancialInsight, Notification, UserPreference
- All financial entities owned by user; indexes on foreign keys and query hotspots

## Pages (minimum)
Landing, Login, Register, Dashboard, Transactions, Transaction Details, Accounts, Connect Bank, Budgets, Analytics, Insights, AI Assistant, Subscriptions, Notifications, Settings, Profile

## Quality Gates
- Builds cleanly (`pnpm build`)
- No runtime/console errors
- Auth flows end-to-end
- Responsive on mobile and desktop
- Dark/light mode functional
- Arabic RTL architecture ready
- Charts render with real data
- Empty/loading/error states for all lists
- README.md with setup, architecture, screenshots, disclaimer
- .gitignore excludes .env, node_modules, prisma dev artifacts appropriately

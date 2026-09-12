# Regression Checklist (manual + automated)

Automated spine: `pnpm test` (vitest, `tests/*.test.ts`, 45 tests: 15 Phase-1 + 18 Phase-2 + 12 Phase-3).
These checks mirror known gaps: zero tests, weak validation, red build.

## Auth isolation (tests/auth-isolation.test.ts)
- [ ] Unauthenticated GET /api/transactions, /api/budgets, /api/subscriptions -> 401
- [ ] User A cannot list, update, or delete user B's budgets/subscriptions (expect 404, never 200)
- [ ] New POST /api/* rows always stamped with session userId

## Transactions (tests/transaction-filters.test.ts)
- [ ] Search filters merchant + description + category (case-insensitive)
- [ ] Category / type / accountId / date-range filters compose correctly
- [ ] Pagination: page 3 of 95 at limit 20 -> skip 40, 5 pages
- [ ] Invalid page (0), limit (>100), type (transfer) rejected with 4xx
- [ ] Soft-deleted rows (`isDeleted`) never appear in lists

## Budgets (tests/budget-math.test.ts)
- [ ] remaining = max(0, amount - spent); overspend shows 0 remaining, %>100
- [ ] Summary totals (budgeted / spent / remaining / categoryCount) reconcile
- [ ] Unknown category spend does not leak into another budget's `spent`

## Subscriptions (tests/subscription-normalize.test.ts)
- [ ] weekly x4.33, yearly /12, monthly passthrough; unknown freq -> monthly
- [ ] annualCost = monthlyCost x 12, rounded to 2dp
- [ ] daysUntilDue ceil + clamp at 0; null nextPaymentDate -> null
- [ ] DELETE is soft-delete (`isDeleted: true`), row stays in DB

## Build / quality gates
- [ ] `pnpm run lint` clean
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm run build` succeeds

## Phase-2 expansion (tests/phase2-expansion.test.ts, 18 tests)
Money cents rounding (`lib/money.ts` canonical)
- [ ] toCents/fromCents round-trip exact (19.99 -> 1999 -> 19.99)
- [ ] sums accumulate in integer cents (0.1 + 0.2 === 0.3, no float drift)
- [ ] toCents throws on non-finite; parsePositiveAmount rejects <= 0 / NaN
Budget period windows + overspend (`app/api/budgets/route.ts` contract)
- [ ] monthly window starts on the 1st of the current month
- [ ] weekly window covers the rolling last 7 days
- [ ] yearly window starts on Jan 1
- [ ] overspend clamps remaining at 0 with % > 100; out-of-window spend excluded
Subscriptions (`lib/money.ts` canonical vs route drift)
- [ ] weekly uses exactly 52/12 (~4.3333): 10/wk -> 43.33/mo, not 43.30
- [ ] yearly /12, annual = monthly x 12 rounded to 2dp
- [ ] invalid frequencies rejected (biweekly, empty, case-sensitive `Weekly`)
Auth (`app/api/auth/register/route.ts` contract)
- [ ] emails normalize via trim + lowercase (lookup + dedupe key)
- [ ] fixed window: 5 attempts per 15 min, 6th -> 429, reset after window
- [ ] passwords < 8 chars rejected; missing fields -> 400
AI caps + health-score transparency (`app/api/ai/chat/route.ts`, `app/api/analytics/overview/route.ts`, `lib/utils.ts`)
- [ ] message capped at 2000 chars; history capped at last 6
- [ ] transaction context capped at 100 rows; model max_tokens capped at 600
- [ ] health score bounded 0-100 with disclosed transparent weights (0.3/0.3/0.2/0.2)
i18n key parity (`messages/en.json` vs `messages/ar.json`)
- [ ] identical recursive translation key paths en <-> ar
- [ ] direction ltr/en + rtl/ar; `ai.examples` list lengths match

### Phase-2 known defects for owners (pure-logic mirrors surfaced these)
- Subscriptions route still uses `4.33` magic literal; canonical is 52/12 (`lib/money.ts`). Weekly totals understate by ~0.08%.
- Budgets GET ignores `period`: always windows from month start; weekly/yearly need `periodWindowStart`.
- Register route does not normalize email (no trim/lowercase) and has no rate limiting; SPEC requires auth rate limits.
- Overview `healthScore` uses opaque magic constants (72/77/80); use transparent `calculateHealthScore` + return breakdown.
- `messages/ar.json`: `ai.examples[9]` untranslated (English); several mixed-language strings (`auth.signUpInstead`, `auth.emailExists`, `accounts.accountsTotal`, `budgets.overBudget`).

## Phase-3 expansion (tests/phase3-expansion.test.ts, 12 tests — pure-logic mirrors, no source edits)
Token crypto at rest (AES-256-GCM seal/unseal contract for `BankConnection.providerToken`)
- [ ] seal/unseal round-trips ASCII, empty, unicode, and 512-char tokens exactly
- [ ] wrong key or tampered bytes throw (never return garbage); fresh IVs differ per seal
Feature-flag gating (`FEATURE_<PROVIDER>` env contract)
- [ ] boolean matrix: 1/true/yes/y/on (trimmed, case-insensitive) ON; 0/false/no/off/""/unknown types OFF
- [ ] provider enabled only when flag ON **plus** all required creds non-blank; unknown provider always off
Bank sync dedupe (idempotent sync by provider transaction id)
- [ ] already-stored ids skipped, only new rows inserted in batch order
- [ ] intra-batch duplicates collapse (first wins), blank ids skipped
Transactions CSV export shape
- [ ] exact header `id,date,type,amount,category,merchantName,description`; rows = txns + header; amounts 2dp
- [ ] RFC-4180 escaping: commas/quotes/newlines quoted, quotes doubled
Audit-write fallback (primary sink + fallback buffer)
- [ ] primary success returns `{ok:true}` with empty fallback
- [ ] primary throw captured to fallback with reason, never rethrows, entry preserved
`DATABASE_URL` parsing (sqlite dev vs Postgres prod)
- [ ] `file:` -> sqlite path; `postgres://`/`postgresql://` -> host/port (default 5432)/database/ssl (`sslmode=require`)
- [ ] missing/empty URL and unsupported schemes throw actionable errors; postgres URL without db name throws

### Phase-3 known defects for owners (pure-logic mirrors surfaced these)
- No token-crypto helper exists in `lib/` yet: `providerToken` is stored as plaintext (`String?` on `BankConnection`). Needs AES-256-GCM seal/unseal + `ENCRYPTION_KEY` env before live bank wiring.
- No `FEATURE_*` flag helper exists: provider enablement is implicit (empty-key checks scattered in routes). Centralize `isProviderEnabled` + `PROVIDER_CREDS` map.
- No sync-dedupe path exists: `lib/bank/providers.ts` `sync()` returns raw streams with no stored-id / intra-batch dedupe; re-syncs would duplicate rows.
- No CSV export route exists: header/escaping/2dp contract above is the spec to build against.
- No audit sink exists: no `AuditLog` model or fallback buffer; auth/money mutations have no durable trail.
- `prisma/schema.prisma` datasource is `sqlite` + `file:./dev.db`: Postgres prod needs `provider = "postgresql"`, `directUrl`, and a migration check.

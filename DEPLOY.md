# DEPLOY.md — NewFinTech infrastructure & deploy notes (Phase-3)

Dev stays boring: `pnpm dev` + SQLite (`DATABASE_URL="file:./dev.db"`).
Prod is Docker Compose: app + Postgres 16. This file is the runbook.

## 1. First: untrack secrets + dev database (do this once, now)

`.env` and `prisma/dev.db` are currently **tracked in git** — they must not be.
These commands remove them from the index only; **working files are untouched**:

```bash
git rm --cached .env prisma/dev.db
git status --short          # both should show as `D` (staged delete from index)
ls -la .env prisma/dev.db   # both files MUST still exist on disk — if not, stop
git commit -m "chore(infra): untrack .env and prisma/dev.db (secrets/dev db)"
```

After the commit, verify they stay ignored (no output = still tracked, fix `.gitignore`):

```bash
git check-ignore -v .env prisma/dev.db
git status --short --ignored | grep -E "\.env|dev\.db"
```

`.gitignore` already covers `.env`, `.env.local`, `dev.db`, `*.db-journal`.
Also untrack `.env.local` if it ever gets committed: `git rm --cached .env.local`.

> History still contains the old blobs. If `.env` ever held a REAL secret
> (not just localhost placeholders), rotate it per §4 and consider
> `git filter-repo` / BFG to purge history before making the repo public.

## 2. AUTH_SECRET rotation (do before first prod deploy)

The repo history once contained a placeholder secret — treat any
previously-used value as compromised.

```bash
openssl rand -base64 32     # -> paste as AUTH_SECRET in prod env only
```

1. Generate a fresh value (command above, ≥32 chars).
2. Set it as `AUTH_SECRET` in the prod environment (`.env.production` / host env).
3. Redeploy. Rotation invalidates all existing sessions/JWTs — users sign in again; no grace period.
4. Never reuse a dev secret in prod. Never commit the real value.

## 3. SQLite → Postgres migration

Prisma 5 requires a **literal** `provider` string — it cannot come from env.
So the switch is one line + env + migrations. Nothing else changes: all
models/queries are provider-agnostic (no `$queryRaw`/`$executeRaw` in the app).

**No `prisma/migrations/` exists yet** — the baseline is generated as part of
this switch (migration SQL is provider-specific, so generate it against Postgres).

```bash
# 0. Start Postgres (from this repo):
#    POSTGRES_PASSWORD=$(openssl rand -base64 24) docker compose up -d db
#    (or point at any managed Postgres 15/16)

# 1. Prod env (never commit this file):
cp .env.example .env.production
# edit .env.production:
#   DATABASE_PROVIDER="postgresql"
#   DATABASE_URL="postgresql://fintech:<pw>@localhost:5432/fintech?schema=public"
#   AUTH_SECRET="<fresh, §2>"

# 2. One-line provider switch in prisma/schema.prisma:
#      provider = "sqlite"  ->  provider = "postgresql"

# 3. Baseline migration against Postgres + regenerate client:
DATABASE_URL="postgresql://fintech:<pw>@localhost:5432/fintech?schema=public" \
  npx prisma migrate dev --name init
#    -> creates prisma/migrations/<ts>_init/, applies it, regenerates client

# 4. Commit the migrations dir (it IS meant to be committed):
git add prisma/migrations prisma/schema.prisma && git commit -m "chore(infra): postgres baseline migration"

# 5. Back to SQLite dev (default): revert the provider line to "sqlite",
#    ensure .env has DATABASE_URL="file:./dev.db", then:
npx prisma generate && npx prisma migrate dev --name auditlog-reset-token
#    (applies AuditLog + PasswordResetToken + type indexes to dev.db)
```

Notes:

- **Dev never changes**: default `DATABASE_URL="file:./dev.db"`, `provider = "sqlite"`.
- **Docker image builds against Postgres**: switch the provider line to
  `"postgresql"` before `docker build` (CI should do this + `prisma generate`
  against it — the Dockerfile runs `prisma generate` at build time).
- **Container boot runs `prisma migrate deploy`** (see Dockerfile CMD) — it
  applies the committed `prisma/migrations/` to the prod DB. It does NOT create
  migrations; if the dir is missing, boot fails fast (by design).
- **Data**: this is a greenfield cutover (no SQLite→Postgres data copy).
  If seed data is needed in prod, run the seed script against `DATABASE_URL`
  explicitly after `migrate deploy`.
- **Postgres version**: 16 (compose pins `postgres:16-alpine`); 15 works too.
- **New tables**: `AuditLog`, `PasswordResetToken` (+ `@@index([userId, type])`
  on Transaction/FinancialInsight/Notification). `lib/audit.ts` auto-activates:
  once migrated, its `auditLog` delegate check passes and writes go to the DB
  instead of the `audit.fallback` log. The reset route still uses its in-memory
  Map until it is wired to `PasswordResetToken` (separate change, out of scope).

## 4. Prod deploy (compose)

```bash
cp .env.example .env.production   # set AUTH_SECRET (§2), POSTGRES_PASSWORD
# switch prisma provider to "postgresql" + commit migrations (§3) first, then:
POSTGRES_PASSWORD='<pw>' AUTH_SECRET='<secret>' docker compose up -d --build
docker compose logs -f app        # expect: migrations applied, "Ready on :3000"
```

## 5. Verification checklist

```bash
npx prisma validate               # schema must be valid (both providers)
npx tsc --noEmit                  # typecheck green
npm run test -- --run 2>/dev/null || pnpm test   # suite stays green (33 tests)
# dev still works on SQLite:
DATABASE_PROVIDER=sqlite npx prisma migrate dev   # dev.db migrates cleanly
pnpm dev                                           # app boots, no [db] warnings
# prod path:
docker compose up -d --build && docker compose logs app | grep -iE "ready|error"
```

`lib/db.ts` guards: missing `DATABASE_URL` throws with a fix hint; a Postgres
URL with `DATABASE_PROVIDER != "postgresql"` logs a `[db]` warning at boot.

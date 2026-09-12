import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ---- Datasource handling (infra only — no query/API changes) ---------------
// Dev default is SQLite: DATABASE_URL="file:./dev.db" (see .env.example).
// Prod is Postgres: DATABASE_URL="postgresql://..." PLUS a one-line provider
// switch in prisma/schema.prisma (Prisma 5 requires a literal provider — see
// DEPLOY.md). PrismaClient is generated against ONE provider, so fail fast on
// a missing URL and warn early on a URL/provider mismatch instead of throwing
// obscure errors on the first query.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    '[db] Missing DATABASE_URL. Copy .env.example to .env (dev default: DATABASE_URL="file:./dev.db").'
  );
}

const isPostgresUrl = /^(postgres(ql)?):\/\//i.test(databaseUrl);
const providerClaim = (process.env.DATABASE_PROVIDER ?? "sqlite").toLowerCase();
if (isPostgresUrl && providerClaim !== "postgresql") {
  // Warn only: the client may already be (correctly) generated for Postgres
  // while DATABASE_PROVIDER was left unset. If queries fail with a provider
  // error, switch the provider in prisma/schema.prisma and regenerate.
  console.warn(
    '[db] DATABASE_URL is Postgres but DATABASE_PROVIDER is not "postgresql". ' +
      "If the Prisma client was generated for SQLite, queries will fail — see DEPLOY.md."
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

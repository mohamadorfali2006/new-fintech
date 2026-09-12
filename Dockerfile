# NewFinTech — production image (Next.js 14 + Prisma).
# Dev stays bare-metal (`pnpm dev` + SQLite). This image is for prod deploys
# (Postgres via DATABASE_URL, `prisma migrate deploy` on boot — see DEPLOY.md).

FROM node:20-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate against the target provider: for a Postgres image, switch
# `provider` to "postgresql" in prisma/schema.prisma BEFORE building
# (see DEPLOY.md). SQLite default works for smoke-testing the image only.
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
# Runtime needs: server code, client bundle, Prisma client + schema/CLI (for
# `migrate deploy` on boot). Source files are bundled into .next at build time.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json /app/next.config.mjs ./
EXPOSE 3000
# Apply committed migrations, then serve. Fails fast if DATABASE_URL is wrong.
CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]

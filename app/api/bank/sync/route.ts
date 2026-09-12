/**
 * POST /api/bank/sync — pull accounts + transactions for one connection.
 *
 * Body: { connectionId: string, idempotencyKey?: string }
 * Also accepts an `Idempotency-Key` header (echoed back on success).
 *
 * Idempotency / dedup (schema-locked: no providerTxnId column, no cron table):
 * - Provider transaction IDs are persisted inside `Transaction.originalData`
 *   as `{ ..., provider, providerTxnId: "<provider>:<provider-txn-id>" }`.
 * - Re-POSTing a sync is safe: rows whose providerTxnId already exists for
 *   this user are skipped and reported as `transactionsSkipped`.
 * - There is NO server-side idempotency-key store (that would need a schema
 *   change — TODO Phase-4). The key is accepted + echoed so clients can
 *   safely retry, with dedup-by-provider-id providing the actual guarantee.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getProvider } from "@/lib/bank/providers";

const SyncBodySchema = z.object({
  connectionId: z.string().min(1),
  idempotencyKey: z.string().max(128).optional(),
});

/** Pull the dedup key back out of a stored originalData JSON blob. */
function extractProviderTxnId(originalData: string | null): string | null {
  if (!originalData) return null;
  try {
    const parsed = JSON.parse(originalData) as Record<string, unknown>;
    return typeof parsed.providerTxnId === "string" ? parsed.providerTxnId : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = SyncBodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid body: connectionId is required" },
      { status: 400 }
    );
  const idempotencyKey =
    request.headers.get("idempotency-key") ?? parsed.data.idempotencyKey ?? null;

  const connection = await prisma.bankConnection.findFirst({
    where: { id: parsed.data.connectionId, userId },
  });
  if (!connection)
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  let provider;
  try {
    provider = getProvider(connection.provider);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provider unavailable" },
      { status: 400 }
    );
  }

  const result = await provider.sync(connection.id);

  // Upsert accounts. Schema has no providerAccountId column, so match on the
  // natural key (accountName + accountNumber) within this connection.
  const existing = await prisma.bankAccount.findMany({
    where: { userId, connectionId: connection.id, isDeleted: false },
  });
  const dbAccountIdByProviderId = new Map<string, string>();
  let accountsUpserted = 0;
  for (const a of result.accounts) {
    const match = existing.find(
      (e) => e.accountName === a.accountName && (e.accountNumber ?? null) === (a.accountNumber ?? null)
    );
    if (match) {
      await prisma.bankAccount.update({
        where: { id: match.id },
        data: {
          balance: a.balance,
          availableBalance: a.availableBalance,
          currency: a.currency,
          institutionName: a.institutionName,
        },
      });
      dbAccountIdByProviderId.set(a.accountId, match.id);
    } else {
      const created = await prisma.bankAccount.create({
        data: {
          userId,
          connectionId: connection.id,
          institutionName: a.institutionName,
          accountType: a.accountType,
          accountName: a.accountName,
          accountNumber: a.accountNumber,
          currency: a.currency,
          balance: a.balance,
          availableBalance: a.availableBalance,
        },
      });
      existing.push(created);
      dbAccountIdByProviderId.set(a.accountId, created.id);
      accountsUpserted++;
    }
  }

  // Dedup: provider txn ids already stored for these accounts.
  const dbAccountIds = [...new Set(dbAccountIdByProviderId.values())];
  const seen = new Set<string>();
  if (dbAccountIds.length > 0) {
    const rows = await prisma.transaction.findMany({
      where: { userId, accountId: { in: dbAccountIds } },
      select: { originalData: true },
    });
    for (const row of rows) {
      const key = extractProviderTxnId(row.originalData);
      if (key) seen.add(key);
    }
  }

  let transactionsCreated = 0;
  let transactionsSkipped = 0;
  for (const t of result.transactions) {
    const dbAccountId = dbAccountIdByProviderId.get(t.accountId);
    const key = `${connection.provider}:${t.id}`;
    if (!dbAccountId || seen.has(key)) {
      transactionsSkipped++;
      continue;
    }
    seen.add(key); // also guards against duplicates within one provider batch
    await prisma.transaction.create({
      data: {
        userId,
        accountId: dbAccountId,
        amount: t.amount,
        type: t.type,
        description: t.description,
        merchantName: t.merchantName,
        date: t.date,
        status: t.status,
        originalData: JSON.stringify({
          ...(t.originalData ?? {}),
          provider: connection.provider,
          providerTxnId: key,
        }),
      },
    });
    transactionsCreated++;
  }

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: result.lastSyncedAt },
  });

  const response = NextResponse.json({
    connectionId: connection.id,
    provider: connection.provider,
    syncedAt: result.lastSyncedAt.toISOString(),
    accountsUpserted,
    transactionsCreated,
    transactionsSkipped,
    idempotencyKey,
  });
  if (idempotencyKey) response.headers.set("Idempotency-Key", idempotencyKey);
  return response;
}

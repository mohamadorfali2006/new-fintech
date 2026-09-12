import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

const TransactionsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  accountId: z.string().optional(),
  sortBy: z.enum(["date", "amount", "merchant"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["posted", "pending", "excluded"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const query = TransactionsQuerySchema.parse({
    search: url.searchParams.get("search") || undefined,
    category: url.searchParams.get("category") || undefined,
    type: url.searchParams.get("type") || undefined,
    accountId: url.searchParams.get("accountId") || undefined,
    status: url.searchParams.get("status") || undefined,
    sortBy: url.searchParams.get("sortBy") || undefined,
    sortOrder: url.searchParams.get("sortOrder") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  });

  const where: Record<string, unknown> = { userId: session.user.id, isDeleted: false };
  if (query.search) {
    // SQLite-safe: no mode:"insensitive" (unsupported on SQLite).
    // SQLite LIKE is case-insensitive for ASCII by default.
    where.OR = [
      { merchantName: { contains: query.search } },
      { description: { contains: query.search } },
      { category: { contains: query.search } },
    ];
  }
  if (query.category) where.category = query.category;
  if (query.type) where.type = query.type;
  if (query.accountId) where.accountId = query.accountId;
  // Status filter is opt-in: excluded rows stay visible in lists by default
  // (users need to manage them); only analytics/budget sums filter them out.
  if (query.status) where.status = query.status;
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) (where.date as Record<string, Date>).gte = new Date(query.startDate);
    if (query.endDate) (where.date as Record<string, Date>).lte = new Date(query.endDate);
  }

  // Map API sort key "merchant" -> schema field "merchantName"
  const orderField = query.sortBy === "merchant" ? "merchantName" : query.sortBy;

  // Get unique categories and accounts for filters
  const [transactions, total, categories, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [orderField]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { account: { select: { accountName: true } } },
    }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({
      where: { userId: session.user.id, isDeleted: false },
      orderBy: { accountName: "asc" },
      select: { id: true, accountName: true },
    }),
  ]);

  // Observability-only: fire-and-forget audit, does not affect the response.
  void audit({ userId: session.user.id, action: "transactions.list", entity: "transaction" });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      merchantName: t.merchantName,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date.toISOString(),
      status: t.status,
      isReviewed: t.isReviewed,
      notes: t.notes,
      description: t.description,
      account: t.account.accountName,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon })),
    accounts: accounts.map((a) => ({ id: a.id, name: a.accountName, accountName: a.accountName })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    demoMode: process.env.DEMO_MODE === "true",
  });
}

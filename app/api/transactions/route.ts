import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const TransactionsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  accountId: z.string().optional(),
  sortBy: z.enum(["date", "amount", "merchant"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
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
    sortBy: url.searchParams.get("sortBy") || undefined,
    sortOrder: url.searchParams.get("sortOrder") || undefined,
    page: url.searchParams.get("page") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  });

  const where: Record<string, unknown> = { userId: session.user.id, isDeleted: false };
  if (query.search) {
    where.OR = [
      { merchantName: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { category: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.category) where.category = query.category;
  if (query.type) where.type = query.type;
  if (query.accountId) where.accountId = query.accountId;
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) (where.date as Record<string, Date>).gte = new Date(query.startDate);
    if (query.endDate) (where.date as Record<string, Date>).lte = new Date(query.endDate);
  }

  // Get unique categories and accounts for filters
  const [transactions, total, categories, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { account: { select: { name: true } } },
    }),
    prisma.transaction.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({
      where: { userId: session.user.id, isDeleted: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
      account: t.account.name,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon })),
    accounts: accounts,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    demoMode: process.env.DEMO_MODE === "true",
  });
}

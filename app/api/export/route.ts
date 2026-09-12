// CSV export for transactions — GET /api/export?format=transactions.
//
// Auth + same filters as GET /api/transactions (search, category, type,
// accountId, status, startDate, endDate). Returns text/csv with
// Content-Disposition attachment. Audited via lib/audit.ts (safe-fallback).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ExportQuerySchema = z.object({
  format: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  accountId: z.string().optional(),
  status: z.enum(["posted", "pending", "excluded"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const started = Date.now();
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const url = new URL(request.url);
  const parsed = ExportQuerySchema.safeParse({
    format: url.searchParams.get("format") || undefined,
    search: url.searchParams.get("search") || undefined,
    category: url.searchParams.get("category") || undefined,
    type: url.searchParams.get("type") || undefined,
    accountId: url.searchParams.get("accountId") || undefined,
    status: url.searchParams.get("status") || undefined,
    startDate: url.searchParams.get("startDate") || undefined,
    endDate: url.searchParams.get("endDate") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;
  // Only "transactions" is supported today; default keeps bare /api/export working.
  if (q.format && q.format !== "transactions") {
    return NextResponse.json({ error: 'Unsupported format. Use ?format=transactions' }, { status: 400 });
  }

  const where: Record<string, unknown> = { userId, isDeleted: false };
  if (q.search) {
    where.OR = [
      { merchantName: { contains: q.search } },
      { description: { contains: q.search } },
      { category: { contains: q.search } },
    ];
  }
  if (q.category) where.category = q.category;
  if (q.type) where.type = q.type;
  if (q.accountId) where.accountId = q.accountId;
  if (q.status) where.status = q.status;
  if (q.startDate || q.endDate) {
    where.date = {};
    if (q.startDate) (where.date as Record<string, Date>).gte = new Date(q.startDate);
    if (q.endDate) (where.date as Record<string, Date>).lte = new Date(q.endDate);
  }

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: 5000,
    include: { account: { select: { accountName: true } } },
  });

  const header = ["id", "date", "merchant", "description", "category", "type", "amount", "status", "account"];
  const lines = [header.join(",")];
  for (const t of rows) {
    lines.push(
      [
        csvCell(t.id),
        csvCell(t.date.toISOString()),
        csvCell(t.merchantName ?? ""),
        csvCell(t.description ?? ""),
        csvCell(t.category),
        csvCell(t.type),
        csvCell(t.amount),
        csvCell(t.status),
        csvCell(t.account?.accountName ?? ""),
      ].join(",")
    );
  }
  const csv = lines.join("\r\n") + "\r\n";

  // Fire-and-forget audit; never blocks the download.
  void audit({
    userId,
    action: "transactions.export",
    entity: "transaction",
    metadata: { count: rows.length, filters: { ...q } },
  });

  logger.info({
    msg: "GET /api/export -> 200",
    method: "GET",
    route: "/api/export",
    status: 200,
    durationMs: Date.now() - started,
    userId,
    count: rows.length,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
      "Cache-Control": "no-store",
    },
  });
}

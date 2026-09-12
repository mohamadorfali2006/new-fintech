import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";
import {
  TRANSFER_CATEGORY,
  analyticsWhereFragment,
  budgetWindow,
  fromCents,
  isBudgetPeriod,
  parsePositiveAmount,
  toCents,
} from "@/lib/money";

const dateString = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" });

const BudgetSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  amount: z.number().positive(),
  period: z.enum(["monthly", "weekly", "yearly"]).optional().default("monthly"),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const budgets = await prisma.budget.findMany({
    where: { userId },
    orderBy: { category: "asc" },
  });

  const now = new Date();
  const baseFilter = analyticsWhereFragment();

  // One spent query per distinct period window (budgets honor their own
  // period + startDate/endDate instead of sharing a single month window).
  // Transfer-category budgets are pinned to 0: internal transfers are
  // excluded from every sum, so they can never count as budget spend.
  const groups = new Map<string, { gte: Date; lte: Date; categories: string[] }>();
  const windows = budgets.map((b) => {
    const period = isBudgetPeriod(b.period) ? b.period : "monthly";
    if (b.category === TRANSFER_CATEGORY) return null;
    const { gte, lte } = budgetWindow(period, b.startDate, b.endDate, now);
    const key = `${gte.getTime()}:${lte.getTime()}`;
    const g = groups.get(key);
    if (g) {
      if (!g.categories.includes(b.category)) g.categories.push(b.category);
    } else {
      groups.set(key, { gte, lte, categories: [b.category] });
    }
    return { category: b.category, key };
  });

  const spentCents = new Map<string, number>();
  await Promise.all(
    [...groups.values()].map(async (g) => {
      if (g.lte < g.gte) return; // budget not started yet -> spent stays 0
      const rows = await prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          ...baseFilter,
          date: { gte: g.gte, lte: g.lte },
          category: { in: g.categories },
        },
        _sum: { amount: true },
      });
      for (const r of rows) {
        spentCents.set(r.category, (spentCents.get(r.category) ?? 0) + toCents(r._sum.amount ?? 0));
      }
    })
  );

  const enriched = budgets.map((b) => {
    const spent = fromCents(spentCents.get(b.category) ?? 0);
    const amountCents = toCents(b.amount);
    const spentC = spentCents.get(b.category) ?? 0;
    const overspendCents = Math.max(0, spentC - amountCents);
    const { gte, lte } = budgetWindow(
      isBudgetPeriod(b.period) ? b.period : "monthly",
      b.startDate,
      b.endDate,
      now
    );
    return {
      id: b.id,
      category: b.category,
      amount: b.amount,
      period: b.period,
      spent,
      remaining: fromCents(Math.max(0, amountCents - spentC)),
      percentage: Math.round((spent / (b.amount || 1)) * 100),
      overspent: overspendCents > 0,
      overspend: fromCents(overspendCents),
      windowStart: gte.toISOString(),
      windowEnd: lte.toISOString(),
      startDate: b.startDate.toISOString(),
      endDate: b.endDate ? b.endDate.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    };
  });

  // Summary totals accumulate in integer cents (exact to 2dp).
  let budgetedCents = 0;
  let spentTotalCents = 0;
  let overspendTotalCents = 0;
  let overspentCount = 0;
  for (const b of enriched) {
    budgetedCents += toCents(b.amount);
    spentTotalCents += toCents(b.spent);
    overspendTotalCents += toCents(b.overspend);
    if (b.overspent) overspentCount += 1;
  }
  const totalBudgeted = fromCents(budgetedCents);
  const totalSpent = fromCents(spentTotalCents);

  return NextResponse.json({
    budgets: enriched,
    summary: {
      totalBudgeted,
      totalSpent,
      totalRemaining: fromCents(Math.max(0, budgetedCents - spentTotalCents)),
      totalOverspend: fromCents(overspendTotalCents),
      overspentCount,
      categoryCount: enriched.length,
    },
    demoMode: process.env.DEMO_MODE === "true",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validated = BudgetSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid data", details: validated.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.budget.findFirst({
    where: {
      userId: session.user.id,
      category: validated.data.category,
    },
  });

  if (existing) {
    const updated = await prisma.budget.update({
      where: { id: existing.id },
      data: {
        amount: validated.data.amount,
        period: validated.data.period ?? "monthly",
      },
    });
    // Observability-only audit (fire-and-forget).
    void audit({ userId: session.user.id, action: "budget.update", entity: "budget", entityId: updated.id });
    return NextResponse.json(updated);
  }

  const budget = await prisma.budget.create({
    data: {
      userId: session.user.id,
      category: validated.data.category,
      amount: validated.data.amount,
      period: validated.data.period ?? "monthly",
      startDate: validated.data.startDate ? new Date(validated.data.startDate) : new Date(),
      ...(validated.data.endDate ? { endDate: new Date(validated.data.endDate) } : {}),
    },
  });

  // Observability-only audit (fire-and-forget).
  void audit({ userId: session.user.id, action: "budget.create", entity: "budget", entityId: budget.id });
  return NextResponse.json(budget, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, amount, period } = body;

  // Strict validation: id required, amount must be a positive finite number
  // (strings like "50" accepted, negatives/NaN/Infinity rejected with 400).
  const parsedAmount = parsePositiveAmount(amount);
  if (!id || parsedAmount === null) {
    return NextResponse.json({ error: "Invalid request payload: id and a positive amount are required" }, { status: 400 });
  }
  if (period !== undefined && !isBudgetPeriod(period)) {
    return NextResponse.json({ error: "Invalid period: must be monthly, weekly, or yearly" }, { status: 400 });
  }

  const budget = await prisma.budget.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!budget) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      amount: parsedAmount,
      ...(period ? { period } : {}),
    },
  });

  // Observability-only audit (fire-and-forget).
  void audit({ userId: session.user.id, action: "budget.update", entity: "budget", entityId: updated.id });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Budget id is required" }, { status: 400 });
  }

  const budget = await prisma.budget.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!budget) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  await prisma.budget.delete({
    where: { id },
  });

  // Observability-only audit (fire-and-forget).
  void audit({ userId: session.user.id, action: "budget.delete", entity: "budget", entityId: id });
  return NextResponse.json({ success: true });
}

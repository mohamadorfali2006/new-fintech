import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const BudgetSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  amount: z.number().positive(),
  period: z.enum(["monthly", "weekly", "yearly"]).optional().default("monthly"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id },
    orderBy: { category: "asc" },
  });

  // Calculate spent per category this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const spentPerCategory = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      userId: session.user.id,
      type: "expense",
      date: { gte: monthStart },
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  const spentMap = new Map(spentPerCategory.map((s) => [s.category, s._sum.amount ?? 0]));

  const enriched = budgets.map((b) => ({
    id: b.id,
    category: b.category,
    amount: b.amount,
    period: b.period,
    spent: spentMap.get(b.category) ?? 0,
    remaining: Math.max(0, b.amount - (spentMap.get(b.category) ?? 0)),
    percentage: Math.round(((spentMap.get(b.category) ?? 0) / (b.amount || 1)) * 100),
    startDate: b.startDate.toISOString(),
    createdAt: b.createdAt.toISOString(),
  }));

  const totalBudgeted = enriched.reduce((s, b) => s + b.amount, 0);
  const totalSpent = enriched.reduce((s, b) => s + b.spent, 0);

  return NextResponse.json({
    budgets: enriched,
    summary: {
      totalBudgeted,
      totalSpent,
      totalRemaining: Math.max(0, totalBudgeted - totalSpent),
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
    return NextResponse.json(updated);
  }

  const budget = await prisma.budget.create({
    data: {
      userId: session.user.id,
      category: validated.data.category,
      amount: validated.data.amount,
      period: validated.data.period ?? "monthly",
      startDate: new Date(),
    },
  });

  return NextResponse.json(budget, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, amount, period } = body;

  if (!id || typeof amount !== "number") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
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
      amount,
      ...(period ? { period } : {}),
    },
  });

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

  return NextResponse.json({ success: true });
}

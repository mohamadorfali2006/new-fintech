import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { detectRecurring } from "@/lib/utils";
import { generateInsightCandidates } from "@/lib/ai/safety";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const insights = await prisma.financialInsight.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = insights.filter((i) => !i.isRead).length;

  return NextResponse.json({
    insights: insights.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
    unreadCount: unread,
    demoMode: process.env.DEMO_MODE === "true",
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, isRead, markAll } = body;

  if (markAll) {
    await prisma.financialInsight.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "Insight ID required" }, { status: 400 });
  }

  const updated = await prisma.financialInsight.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: isRead !== undefined ? isRead : true },
  });

  return NextResponse.json({ success: true, updated });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, isDeleted: false },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.budget.findMany({ where: { userId } }),
  ]);

  const recurring = detectRecurring(
    transactions.map((t) => ({
      id: t.id,
      merchantName: t.merchantName ?? "",
      amount: t.amount,
      date: t.date,
      type: t.type,
    }))
  );

  const candidates = generateInsightCandidates({
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      category: t.category,
      merchantName: t.merchantName,
      date: t.date,
    })),
    budgets: budgets.map((b) => ({ category: b.category, amount: b.amount })),
    recurring,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ created: 0, insights: [] });
  }

  // Dedupe: skip candidates whose title was already generated in the last 7 days.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await prisma.financialInsight.findMany({
    where: { userId, createdAt: { gte: weekAgo } },
    select: { title: true },
  });
  const seen = new Set(recent.map((r) => r.title));
  const fresh = candidates.filter((c) => !seen.has(c.title));

  if (fresh.length === 0) {
    return NextResponse.json({ created: 0, insights: [] });
  }

  await prisma.financialInsight.createMany({
    data: fresh.map((c) => ({
      userId,
      title: c.title,
      body: c.body,
      type: c.type,
      severity: c.severity,
    })),
  });

  const insights = await prisma.financialInsight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: fresh.length,
  });

  return NextResponse.json({
    created: fresh.length,
    insights: insights.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
  });
}

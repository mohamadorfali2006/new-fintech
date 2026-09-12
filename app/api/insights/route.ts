import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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

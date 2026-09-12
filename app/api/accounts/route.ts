import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id, isDeleted: false },
    orderBy: { name: "asc" },
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.accountName ?? a.name,
      type: a.accountType,
      balance: a.balance,
      availableBalance: a.availableBalance,
      currency: a.currency,
      institutionName: a.institutionName,
      lastSyncedAt: a.updatedAt?.toISOString(),
    })),
    totalBalance,
    count: accounts.length,
    demoMode: process.env.DEMO_MODE === "true",
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: session.user.id,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = subscriptions.map((sub) => {
    let monthlyCost = sub.amount;
    if (sub.frequency === "weekly") {
      monthlyCost = sub.amount * 4.33;
    } else if (sub.frequency === "yearly") {
      monthlyCost = sub.amount / 12;
    }

    const annualCost = monthlyCost * 12;

    let daysUntilDue: number | null = null;
    if (sub.nextPaymentDate) {
      const diffMs = new Date(sub.nextPaymentDate).getTime() - Date.now();
      daysUntilDue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      id: sub.id,
      merchantName: sub.merchantName,
      amount: sub.amount,
      currency: sub.currency || "USD",
      frequency: sub.frequency,
      category: sub.category || "Subscriptions",
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      annualCost: Math.round(annualCost * 100) / 100,
      nextPaymentDate: sub.nextPaymentDate ? sub.nextPaymentDate.toISOString() : null,
      daysUntilDue,
      createdAt: sub.createdAt.toISOString(),
    };
  });

  const totalMonthly = enriched.reduce((acc, s) => acc + s.monthlyCost, 0);
  const totalAnnual = enriched.reduce((acc, s) => acc + s.annualCost, 0);

  return NextResponse.json({
    subscriptions: enriched,
    summary: {
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      totalAnnual: Math.round(totalAnnual * 100) / 100,
      count: enriched.length,
      potentialSavings: Math.round(totalAnnual * 100) / 100,
    },
    demoMode: process.env.DEMO_MODE === "true",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { merchantName, amount, frequency, category, nextPaymentDate } = body;

    if (!merchantName || !amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Merchant name and valid amount are required" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    const validFreq = ["monthly", "weekly", "yearly"].includes(frequency) ? frequency : "monthly";

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        merchantName: merchantName.trim(),
        amount: parsedAmount,
        frequency: validFreq,
        category: category?.trim() || "Subscriptions",
        nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
      },
    });

    let monthlyCost = subscription.amount;
    if (subscription.frequency === "weekly") {
      monthlyCost = subscription.amount * 4.33;
    } else if (subscription.frequency === "yearly") {
      monthlyCost = subscription.amount / 12;
    }

    return NextResponse.json(
      {
        id: subscription.id,
        merchantName: subscription.merchantName,
        amount: subscription.amount,
        currency: subscription.currency,
        frequency: subscription.frequency,
        category: subscription.category,
        monthlyCost: Math.round(monthlyCost * 100) / 100,
        annualCost: Math.round(monthlyCost * 12 * 100) / 100,
        nextPaymentDate: subscription.nextPaymentDate?.toISOString() || null,
        createdAt: subscription.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Subscription id required" }, { status: 400 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  await prisma.subscription.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ success: true });
}

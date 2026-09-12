import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  VALID_FREQUENCIES,
  fromCents,
  isValidFrequency,
  normalizeToAnnualCost,
  normalizeToMonthlyCost,
  parsePositiveAmount,
  resolveCurrencyScope,
  roundMoney,
  sumMoney,
  toCents,
  type Frequency,
} from "@/lib/money";

function mixedCurrencyError(
  currencies: string[],
  unknownDisplay: boolean,
  displayCurrency?: string
) {
  return NextResponse.json(
    {
      error: unknownDisplay
        ? `Unknown displayCurrency "${displayCurrency}".`
        : "Multiple subscription currencies present; pass ?displayCurrency=<CODE> to scope totals to one currency.",
      code: "MIXED_CURRENCY",
      currencies,
      hint: "No FX conversion is performed; totals are computed in a single currency only.",
    },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const displayCurrency = new URL(request.url).searchParams.get("displayCurrency") || undefined;

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: session.user.id,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
  });

  // Single-currency guard: refuse to silently mix per-subscription currencies.
  const scope = resolveCurrencyScope(
    subscriptions.map((s) => s.currency || "USD"),
    displayCurrency
  );
  if (scope.mixed && (scope.unknownDisplay || !displayCurrency)) {
    return mixedCurrencyError(
      [...new Set(subscriptions.map((s) => s.currency || "USD"))],
      scope.unknownDisplay,
      displayCurrency
    );
  }
  const visible = scope.mixed
    ? subscriptions.filter((s) => (s.currency || "USD") === scope.baseCurrency)
    : subscriptions;

  const nowMs = Date.now();
  const enriched = visible.map((sub) => {
    // Read-path tolerance for legacy rows: unknown frequencies fall back to
    // monthly here, but POST (write path) strictly rejects them with 400.
    // Normalization uses 52 weeks/yr ÷ 12 months/yr for weekly (see
    // WEEKLY_TO_MONTHLY_COST in lib/money.ts), never the old 4.33 literal.
    const frequency: Frequency = isValidFrequency(sub.frequency) ? sub.frequency : "monthly";
    const monthlyCost = roundMoney(normalizeToMonthlyCost(sub.amount, frequency));
    const annualCost = roundMoney(normalizeToAnnualCost(sub.amount, frequency));

    let daysUntilDue: number | null = null;
    if (sub.nextPaymentDate) {
      const diffMs = new Date(sub.nextPaymentDate).getTime() - nowMs;
      daysUntilDue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const stale =
      !sub.nextPaymentDate || new Date(sub.nextPaymentDate).getTime() < nowMs;

    return {
      id: sub.id,
      merchantName: sub.merchantName,
      amount: sub.amount,
      currency: sub.currency || "USD",
      frequency: sub.frequency,
      category: sub.category || "Subscriptions",
      monthlyCost,
      annualCost,
      nextPaymentDate: sub.nextPaymentDate ? sub.nextPaymentDate.toISOString() : null,
      daysUntilDue,
      createdAt: sub.createdAt.toISOString(),
      // Internal flag: no upcoming payment, so this may be a forgotten
      // subscription the user could cancel.
      stale,
    };
  });

  // Totals accumulate in integer cents via lib/money.ts.
  const totalMonthly = sumMoney(enriched.map((s) => s.monthlyCost));
  const totalAnnual = sumMoney(enriched.map((s) => s.annualCost));
  // potentialSavings = annualized cost of stale subscriptions (no upcoming
  // payment date): the amount recoverable by cancelling forgotten renewals.
  // Computed in cents from each stale sub's annual cost.
  let staleCents = 0;
  for (const s of enriched) {
    if (s.stale) staleCents += toCents(s.annualCost);
  }

  return NextResponse.json({
    subscriptions: enriched,
    summary: {
      totalMonthly,
      totalAnnual,
      count: enriched.length,
      potentialSavings: fromCents(staleCents),
      currency: scope.baseCurrency,
      ...(scope.mixed ? { excludedCurrencies: scope.excludedCurrencies } : {}),
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

    if (!merchantName || typeof merchantName !== "string" || !merchantName.trim()) {
      return NextResponse.json({ error: "Merchant name is required" }, { status: 400 });
    }

    // Strict amount validation: must be a positive finite number.
    // Strings like "50" are accepted; negatives, zero, NaN, Infinity -> 400.
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Strict frequency validation: unknown values are rejected, never coerced.
    if (!isValidFrequency(frequency)) {
      return NextResponse.json(
        {
          error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let next: Date | null = null;
    if (nextPaymentDate !== undefined && nextPaymentDate !== null && nextPaymentDate !== "") {
      next = new Date(nextPaymentDate);
      if (Number.isNaN(next.getTime())) {
        return NextResponse.json({ error: "Invalid nextPaymentDate" }, { status: 400 });
      }
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        merchantName: merchantName.trim(),
        amount: parsedAmount,
        frequency,
        category: typeof category === "string" && category.trim() ? category.trim() : "Subscriptions",
        nextPaymentDate: next,
      },
    });

    const monthlyCost = roundMoney(normalizeToMonthlyCost(subscription.amount, frequency));
    const annualCost = roundMoney(normalizeToAnnualCost(subscription.amount, frequency));

    // Observability-only audit (fire-and-forget).
    void audit({ userId: session.user.id, action: "subscription.create", entity: "subscription", entityId: subscription.id });
    return NextResponse.json(
      {
        id: subscription.id,
        merchantName: subscription.merchantName,
        amount: subscription.amount,
        currency: subscription.currency,
        frequency: subscription.frequency,
        category: subscription.category,
        monthlyCost,
        annualCost,
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

  // Observability-only audit (fire-and-forget).
  void audit({ userId: session.user.id, action: "subscription.delete", entity: "subscription", entityId: id });
  return NextResponse.json({ success: true });
}

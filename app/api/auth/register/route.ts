import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await import("bcryptjs").then((bcrypt) =>
      bcrypt.hash(password, 12)
    );

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        currency: "USD",
        country: "US",
        timezone: "America/New_York",
        language: "en",
        theme: "system",
        notifications: JSON.stringify({
          unusualSpending: true,
          budgetLimit: true,
          largeTransaction: true,
          monthlySummary: true,
          upcomingSubscription: true,
        }),
      },
    });

    await prisma.userPreference.create({
      data: {
        userId: user.id,
        defaultCurrency: "USD",
        theme: "system",
        language: "en",
        notifications: JSON.stringify({
          unusualSpending: true,
          budgetLimit: true,
          largeTransaction: true,
          monthlySummary: true,
          upcomingSubscription: true,
        }),
      },
    });

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";

// POST /api/auth/register
const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    // Normalize: trim + lowercase so Foo@Example.com and foo@example.com
    // hit the same unique lookup (duplicate detection + login match).
    email: z.string().trim().toLowerCase().pipe(z.email("Invalid email")),
    // bcrypt caps at 72 bytes — reject longer passwords instead of
    // silently truncating them.
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
  })
  .strict();

// Abuse guard: 5 registrations / 15 min per IP.
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

const DEFAULT_NOTIFICATION_PREFS = {
  unusualSpending: true,
  budgetLimit: true,
  largeTransaction: true,
  monthlySummary: true,
  upcomingSubscription: true,
};

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(
    `register:${getClientIp(request)}`,
    REGISTER_LIMIT,
    REGISTER_WINDOW_MS
  );
  if (!rl.allowed) {
    return rateLimitedResponse(
      rl.retryAfterSec,
      "Too many registration attempts. Try again later."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
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
        notificationPrefs: JSON.stringify(DEFAULT_NOTIFICATION_PREFS),
      },
    });

    await prisma.userPreference.create({
      data: {
        userId: user.id,
        defaultCurrency: "USD",
        theme: "system",
        language: "en",
        notifications: JSON.stringify(DEFAULT_NOTIFICATION_PREFS),
      },
    });

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Race guard: two concurrent registers with the same email — the unique
    // constraint fires on the loser. Surface as 409, not 500.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

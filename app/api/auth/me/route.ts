import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const profilePatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. USD)")
      .optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z
      .string()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Language must look like 'en' or 'en-US'")
      .optional(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/, "Country must be a 2-letter ISO code (e.g. US)")
      .optional(),
    timezone: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_+\-/]+$/, "Invalid timezone")
      .optional(),
    // NOTE: `notifications` is intentionally NOT accepted here. On the User
    // model it is a relation, not a scalar — passing raw client input into
    // it previously crashed the update (500). Strict mode rejects it with a
    // clear 400 instead.
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No updatable fields provided",
  });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      currency: true,
      theme: true,
      language: true,
      country: true,
      timezone: true,
      notifications: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
    demoMode: process.env.DEMO_MODE === "true",
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = profilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid profile data",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, currency, theme, language, country, timezone } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(currency !== undefined && { currency }),
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        theme: true,
        language: true,
        country: true,
        timezone: true,
        notifications: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

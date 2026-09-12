import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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
    const { name, currency, theme, language, country, timezone, notifications } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(currency !== undefined && { currency }),
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(country !== undefined && { country }),
        ...(timezone !== undefined && { timezone }),
        ...(notifications !== undefined && { notifications }),
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

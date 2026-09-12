import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Import bcrypt dynamically to avoid module resolution issues
    const bcrypt = (await import("bcryptjs")).default;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email as string },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password as string, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate a simple session token (in production, use proper session management)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })).toString("base64");

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });

    // Set httpOnly cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration callback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

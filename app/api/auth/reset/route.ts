import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";

/**
 * Password-reset flow (request + confirm).
 *
 * Design: single-use opaque token. Only the SHA-256 hash is stored, with an
 * expiry. The raw token is shown to the requester once (it would be emailed
 * in production) and never persisted.
 *
 * SPEC-CUT / PROD TODO (schema change out of scope for Phase-2):
 * - Tokens live in module memory: lost on restart/deploy and not shared
 *   across instances. Persist via a `PasswordResetToken { tokenHash, userId,
 *   expiresAt, usedAt }` model for multi-instance prod.
 * - Deliver the raw token by email (transactional provider) instead of the
 *   dev-only `debugToken` response field below.
 * - Consider invalidating existing JWT sessions on reset (needs DB-backed
 *   sessions or a token-version field — see SESSION REVOCATION NOTE in
 *   auth.ts).
 */

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REQUEST_LIMIT = 5; // reset requests / 15 min per IP
const CONFIRM_LIMIT = 10; // reset confirms / 15 min per IP
const WINDOW_MS = 15 * 60 * 1000;

type ResetEntry = { userId: string; expiresAt: number };
const resetTokens = new Map<string, ResetEntry>();

const emailField = z.string().trim().toLowerCase().pipe(z.email("Invalid email"));

const requestSchema = z
  .object({ action: z.literal("request"), email: emailField })
  .strict();

const resetSchema = z
  .object({
    action: z.literal("reset"),
    token: z.string().trim().min(1, "Token is required").max(512),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
  })
  .strict();

const bodySchema = z.discriminatedUnion("action", [requestSchema, resetSchema]);

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// POST /api/auth/reset
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
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

  const ip = getClientIp(request);

  if (parsed.data.action === "request") {
    const rl = checkRateLimit(`reset-request:${ip}`, REQUEST_LIMIT, WINDOW_MS);
    if (!rl.allowed) {
      return rateLimitedResponse(
        rl.retryAfterSec,
        "Too many reset requests. Try again later."
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Anti-enumeration: identical success shape whether or not the account
    // exists. Only mint a token for a real user.
    let debugToken: string | undefined;
    if (user) {
      const token = randomBytes(TOKEN_BYTES).toString("base64url");
      resetTokens.set(hashToken(token), {
        userId: user.id,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      });
      if (process.env.NODE_ENV !== "production") {
        debugToken = token;
      } else {
        // Prod: send `token` via email here (TODO — no mailer wired yet).
        console.info(
          `Password reset requested for user ${user.id}; email delivery not configured.`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for this email, a reset link has been sent.",
      ...(debugToken ? { debugToken } : {}),
    });
  }

  // action === "reset"
  const rl = checkRateLimit(`reset-confirm:${ip}`, CONFIRM_LIMIT, WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitedResponse(
      rl.retryAfterSec,
      "Too many reset attempts. Try again later."
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const entry = resetTokens.get(tokenHash);
  // Single-use + expiry. Delete eagerly so a raced replay can't reuse it.
  resetTokens.delete(tokenHash);
  if (!entry || Date.now() >= entry.expiresAt) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.user.update({
      where: { id: entry.userId },
      data: { passwordHash },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Password has been reset. Please sign in.",
  });
}

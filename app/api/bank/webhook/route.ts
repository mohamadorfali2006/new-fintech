/**
 * POST /api/bank/webhook — provider webhook receiver (STUB, Phase-3).
 *
 * Verification: HMAC-SHA256 over the RAW body with `PLAID_WEBHOOK_SECRET`,
 * compared timing-safe against the `plaid-verification` header
 * (`x-plaid-signature` accepted as an alias for sandbox tooling).
 * - Secret unset  → 200 `{ verified: false, mode: "stub" }` (dev only; warn).
 * - Bad signature → 401. Never process an unverified payload.
 *
 * TODO(Phase-4):
 *  1. Replace HMAC check with real Plaid verification (JWKS / plaid SDK).
 *  2. Map `item_id` → BankConnection, handle DEFAULT_UPDATE / ITEM_ERROR.
 *  3. Enqueue a sync job (do NOT full-sync inline — webhooks must ack fast).
 *  4. Add a cron route (e.g. /api/bank/cron) for scheduled syncs.
 */
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let event: Record<string, unknown> | null = null;
  try {
    event = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const secret = process.env.PLAID_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[bank/webhook] PLAID_WEBHOOK_SECRET is unset — accepting in stub mode without verification. Set the secret before production."
    );
    // TODO(Phase-4): reject (401/403) instead of stub-accepting once live.
    return NextResponse.json({
      received: true,
      verified: false,
      mode: "stub",
      webhookType:
        event !== null && typeof event.webhook_type === "string"
          ? event.webhook_type
          : null,
    });
  }

  const signature =
    request.headers.get("plaid-verification") ??
    request.headers.get("x-plaid-signature");
  if (!signature || !verifySignature(rawBody, secret, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const code =
    typeof event?.webhook_code === "string"
      ? event.webhook_code
      : typeof event?.webhook_type === "string"
        ? event.webhook_type
        : "unknown";
  console.log(`[bank/webhook] verified event "${code}" — TODO: enqueue sync.`);
  // TODO(Phase-4): enqueue sync for the matching connection; keep this fast.
  return NextResponse.json({ received: true, verified: true, webhook: code });
}

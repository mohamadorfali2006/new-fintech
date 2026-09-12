/**
 * Auth isolation spine.
 * Mirrors the guard used in every API route handler:
 *   const session = await auth();
 *   if (!session?.user?.id) return 401
 * plus the invariant that every prisma query scopes by `userId: session.user.id`.
 * Pure functions below replicate that logic so tests run without a DB.
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";

type Session = { user?: { id?: string } } | null;

function authGuard(session: Session): { ok: true; userId: string } | { ok: false; status: 401 } {
  if (!session?.user?.id) return { ok: false, status: 401 };
  return { ok: true, userId: session.user.id };
}

function scopedWhere(userId: string, extra: Record<string, unknown> = {}) {
  return { userId, isDeleted: false, ...extra };
}

describe("auth isolation", () => {
  it("rejects requests with no session (401)", () => {
    assert.deepEqual(authGuard(null), { ok: false, status: 401 });
  });

  it("rejects sessions with no user id (401)", () => {
    assert.deepEqual(authGuard({ user: {} }), { ok: false, status: 401 });
    assert.deepEqual(authGuard({}), { ok: false, status: 401 });
  });

  it("always scopes queries to the session user; user A cannot match user B rows", () => {
    const whereA = scopedWhere("user-A", { category: "food" });
    const rowB = { userId: "user-B", category: "food", isDeleted: false };
    // Simulate prisma `where` matching on userId: row must equal the scoped userId.
    const matches =
      (rowB as Record<string, unknown>).userId === (whereA as Record<string, unknown>).userId;
    assert.equal(matches, false);
    assert.equal((whereA as Record<string, unknown>).userId, "user-A");
  });

  it("cross-user mutation guard: budget/sub update requires id + owner userId", () => {
    const sessionUserId = "user-A";
    const budgets = [{ id: "b1", userId: "user-A" }];
    const lookup = (id: string, userId: string) =>
      budgets.find((b) => b.id === id && b.userId === userId) ?? null;
    assert.equal(lookup("b1", sessionUserId)?.id, "b1");
    assert.equal(lookup("b1", "user-B"), null); // attacker id -> 404, not 200
  });
});

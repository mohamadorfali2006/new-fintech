/**
 * Transaction filter + pagination spine.
 * Mirrors app/api/transactions/route.ts TransactionsQuerySchema + where-builder
 * + skip/take/totalPages logic. Self-contained so no DB is needed.
 */

import { describe, it } from "vitest";
import assert from "node:assert/strict";

type Query = {
  search?: string;
  category?: string;
  type?: "income" | "expense";
  accountId?: string;
  sortBy?: "date" | "amount" | "merchant";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
};

function parseQuery(raw: Record<string, string | undefined>): Required<Query> {
  const type = raw.type;
  if (type !== undefined && type !== "income" && type !== "expense") throw new Error("Invalid type");
  const sortBy = raw.sortBy ?? "date";
  if (!["date", "amount", "merchant"].includes(sortBy)) throw new Error("Invalid sortBy");
  const sortOrder = raw.sortOrder ?? "desc";
  if (!["asc", "desc"].includes(sortOrder)) throw new Error("Invalid sortOrder");
  const page = raw.page === undefined ? 1 : Number(raw.page);
  const limitRaw = raw.limit === undefined ? 20 : Number(raw.limit);
  if (!Number.isInteger(page) || page < 1) throw new Error("Invalid page");
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 100)
    throw new Error("Invalid limit");
  return {
    search: raw.search ?? "",
    category: raw.category ?? "",
    type: type as Query["type"],
    accountId: raw.accountId ?? "",
    sortBy: sortBy as Query["sortBy"],
    sortOrder: sortOrder as Query["sortOrder"],
    page,
    limit: limitRaw,
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
  } as Required<Query>;
}

function buildWhere(userId: string, q: Required<Query>): Record<string, unknown> {
  const where: Record<string, unknown> = { userId, isDeleted: false };
  if (q.search) {
    where.OR = [
      { merchantName: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
      { category: { contains: q.search, mode: "insensitive" } },
    ];
  }
  if (q.category) where.category = q.category;
  if (q.type) where.type = q.type;
  if (q.accountId) where.accountId = q.accountId;
  if (q.startDate || q.endDate) {
    where.date = {};
    if (q.startDate) (where.date as Record<string, Date>).gte = new Date(q.startDate);
    if (q.endDate) (where.date as Record<string, Date>).lte = new Date(q.endDate);
  }
  return where;
}

function pagination(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit), skip: (page - 1) * limit };
}

describe("transaction filters", () => {
  it("defaults sort/page/limit when params are absent", () => {
    const q = parseQuery({});
    assert.equal(q.sortBy, "date");
    assert.equal(q.sortOrder, "desc");
    assert.equal(q.page, 1);
    assert.equal(q.limit, 20);
  });

  it("builds search OR across merchant/description/category + category/type/account scoping", () => {
    const q = parseQuery({
      search: "aldi",
      category: "groceries",
      type: "expense",
      accountId: "acc-1",
    });
    const where = buildWhere("u1", q);
    assert.equal((where.OR as unknown[]).length, 3);
    assert.equal(where.category, "groceries");
    assert.equal(where.type, "expense");
    assert.equal(where.accountId, "acc-1");
    assert.equal(where.userId, "u1");
  });

  it("applies inclusive date range bounds", () => {
    const q = parseQuery({ startDate: "2026-09-01", endDate: "2026-09-30" });
    const where = buildWhere("u1", q) as { date: { gte: Date; lte: Date } };
    assert.equal(where.date.gte.toISOString().slice(0, 10), "2026-09-01");
    assert.equal(where.date.lte.toISOString().slice(0, 10), "2026-09-30");
  });

  it("computes skip/take/totalPages (page 3 of 95 at limit 20 -> 5 pages, skip 40)", () => {
    const p = pagination(95, 3, 20);
    assert.equal(p.skip, 40);
    assert.equal(p.totalPages, 5);
  });

  it("rejects invalid page/limit/type (page 0, limit 101, bad type)", () => {
    assert.throws(() => parseQuery({ page: "0" }), /Invalid page/);
    assert.throws(() => parseQuery({ limit: "101" }), /Invalid limit/);
    assert.throws(() => parseQuery({ type: "transfer" }), /Invalid type/);
  });
});

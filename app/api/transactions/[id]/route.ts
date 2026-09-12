import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateTransactionSchema = z.object({
  category: z.string().optional(),
  isReviewed: z.boolean().optional(),
  status: z.enum(["posted", "pending", "excluded"]).optional(),
  notes: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const validated = UpdateTransactionSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (validated.data.category !== undefined) updateData.category = validated.data.category;
  if (validated.data.isReviewed !== undefined) updateData.isReviewed = validated.data.isReviewed;
  if (validated.data.status !== undefined) updateData.status = validated.data.status;
  if (validated.data.notes !== undefined) updateData.notes = validated.data.notes;
  if (validated.data.isDeleted !== undefined) updateData.isDeleted = validated.data.isDeleted;

  const updated = await prisma.transaction.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    ...updated,
    date: updated.date.toISOString(),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id, isDeleted: false },
    include: { account: { select: { id: true, name: true, accountType: true, currency: true } } },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...transaction,
    date: transaction.date.toISOString(),
    account: transaction.account,
  });
}

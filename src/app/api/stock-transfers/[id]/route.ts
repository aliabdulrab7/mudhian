import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/stock-transfers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: parseInt(id) },
    include: {
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      items: {
        include: {
          jewelryItem: {
            select: { sku: true, barcode: true, category: true, karat: true, metalType: true, netWeight: true, salePrice: true, status: true },
          },
        },
      },
    },
  });

  if (!transfer) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(transfer);
}

// PATCH /api/stock-transfers/[id] — complete or cancel
// Body: { action: "complete" | "cancel" }
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const transferId = parseInt(id);

  const existing = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: { select: { jewelryItemId: true } } },
  });

  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "يمكن تعديل التحويلات قيد الانتظار فقط" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "complete" && action !== "cancel") {
      return NextResponse.json({ error: "action يجب أن يكون complete أو cancel" }, { status: 400 });
    }

    const itemIds = existing.items.map((i) => i.jewelryItemId);

    const updated = await prisma.$transaction(async (tx) => {
      if (action === "complete") {
        // Move items to toBranch and mark as available
        await tx.jewelryItem.updateMany({
          where: { id: { in: itemIds } },
          data: { branchId: existing.toBranchId, status: "available" },
        });
        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: "completed", completedAt: new Date() },
          include: {
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
            _count: { select: { items: true } },
          },
        });
      } else {
        // Cancel: restore items to available in their original branch
        await tx.jewelryItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: "available" },
        });
        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: "cancelled" },
          include: {
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
            _count: { select: { items: true } },
          },
        });
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

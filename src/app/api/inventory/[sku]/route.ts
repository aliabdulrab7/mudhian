import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ sku: string }> };

// GET /api/inventory/[sku]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sku } = await params;

  const item = await prisma.jewelryItem.findFirst({
    where: { OR: [{ sku }, { barcode: sku }] },
    include: {
      branch: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Branch users can only access their own branch
  if (session.role === "branch" && item.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(item);
}

// PATCH /api/inventory/[sku]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sku } = await params;

  const existing = await prisma.jewelryItem.findFirst({
    where: { OR: [{ sku }, { barcode: sku }] },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      category, metalType, karat,
      grossWeight, netWeight,
      stoneType, stoneWeight, stoneCount, stoneValue,
      makingCharges, cost, salePrice, margin,
      supplierId, notes, status,
    } = body;

    const updated = await prisma.jewelryItem.update({
      where: { id: existing.id },
      data: {
        ...(category !== undefined && { category }),
        ...(metalType !== undefined && { metalType }),
        ...(karat !== undefined && { karat }),
        ...(grossWeight !== undefined && { grossWeight }),
        ...(netWeight !== undefined && { netWeight }),
        ...(stoneType !== undefined && { stoneType }),
        ...(stoneWeight !== undefined && { stoneWeight }),
        ...(stoneCount !== undefined && { stoneCount }),
        ...(stoneValue !== undefined && { stoneValue }),
        ...(makingCharges !== undefined && { makingCharges }),
        ...(cost !== undefined && { cost }),
        ...(salePrice !== undefined && { salePrice }),
        ...(margin !== undefined && { margin }),
        ...(supplierId !== undefined && { supplierId: supplierId ? Number(supplierId) : null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
      include: {
        branch: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/inventory/[sku] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { sku } = await params;

  const existing = await prisma.jewelryItem.findFirst({
    where: { OR: [{ sku }, { barcode: sku }] },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.jewelryItem.update({
    where: { id: existing.id },
    data: { status: "archived" },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/suppliers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id: parseInt(id) },
    include: { _count: { select: { jewelryItems: true } } },
  });

  if (!supplier) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

// PATCH /api/suppliers/[id] — admin only
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { name, phone, email, address, notes, isActive } = body;

    const updated = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { jewelryItems: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "يوجد مورد بهذا الاسم مسبقاً" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id] — soft delete (set isActive=false), admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.supplier.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.supplier.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}

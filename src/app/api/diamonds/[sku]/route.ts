import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

type Params = { params: Promise<{ sku: string }> };

// GET /api/diamonds/[sku]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sku } = await params;
  const stone = await prisma.diamondStone.findUnique({
    where: { sku },
    include: {
      branch: { select: { name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  if (!stone) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && stone.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(stone);
}

// PATCH /api/diamonds/[sku]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sku } = await params;
  const existing = await prisma.diamondStone.findUnique({ where: { sku } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["caratWeight", "color", "clarity", "cut", "shape", "certificateNum",
    "certBody", "origin", "cost", "salePrice", "status", "branchId", "supplierId", "notes"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  for (const key of allowed) {
    if (key in body) {
      if (["caratWeight", "cost", "salePrice", "branchId"].includes(key)) {
        data[key] = Number(body[key]);
      } else if (key === "supplierId") {
        data[key] = body[key] ? Number(body[key]) : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  const stone = await prisma.diamondStone.update({ where: { sku }, data });
  logAction(session, "تعديل ماسة", `SKU: ${sku}`);
  return NextResponse.json(stone);
}

// DELETE /api/diamonds/[sku] — admin only, only if available
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sku } = await params;
  const existing = await prisma.diamondStone.findUnique({ where: { sku } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (existing.status !== "available") {
    return NextResponse.json({ error: "لا يمكن حذف ماسة مباعة أو مركبة" }, { status: 400 });
  }

  await prisma.diamondStone.delete({ where: { sku } });
  logAction(session, "حذف ماسة", `SKU: ${sku}`);
  return NextResponse.json({ ok: true });
}

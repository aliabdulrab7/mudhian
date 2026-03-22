import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// DELETE /api/drawer/[id]/banks/[bankId] — delete a bank transfer row
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; bankId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, bankId } = await params;
  const drawerId = parseInt(id);
  const bankTransferId = parseInt(bankId);

  const drawer = await prisma.dailyDrawer.findUnique({ where: { id: drawerId } });
  if (!drawer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drawer.isLocked && session.role !== "admin") {
    return NextResponse.json({ error: "اليومية مقفلة" }, { status: 403 });
  }

  await prisma.bankTransfer.delete({ where: { id: bankTransferId } });

  return NextResponse.json({ ok: true });
}

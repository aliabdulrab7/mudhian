import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/drawer/[id]/banks — add a new bank transfer row
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const drawerId = parseInt(id);
  const { bankName } = await req.json();

  if (!bankName?.trim()) return NextResponse.json({ error: "bankName required" }, { status: 400 });

  const drawer = await prisma.dailyDrawer.findUnique({ where: { id: drawerId } });
  if (!drawer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drawer.isLocked && session.role !== "admin") {
    return NextResponse.json({ error: "اليومية مقفلة" }, { status: 403 });
  }

  const bank = await prisma.bankTransfer.create({
    data: { drawerId, bankName: bankName.trim(), amount: 0, beneficiary: "", notes: "" },
  });

  return NextResponse.json(bank);
}

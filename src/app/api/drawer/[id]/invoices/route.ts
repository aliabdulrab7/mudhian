import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/drawer/[id]/invoices — add a new invoice row
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const drawerId = parseInt(id);
  const { type } = await req.json();

  if (type !== "صميت" && type !== "عادية") {
    return NextResponse.json({ error: "type must be صميت or عادية" }, { status: 400 });
  }

  const drawer = await prisma.dailyDrawer.findUnique({ where: { id: drawerId } });
  if (!drawer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drawer.isLocked && session.role !== "admin") {
    return NextResponse.json({ error: "اليومية مقفلة" }, { status: 403 });
  }

  const invoice = await prisma.invoice.create({
    data: { drawerId, type, invoiceNum: "", price: 0, employeeName: "", barcodes: "[]" },
  });

  return NextResponse.json(invoice);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/drawer/[id]/invoices/[invoiceId] — update an invoice row
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, invoiceId } = await params;
  const drawerId = parseInt(id);
  const invId = parseInt(invoiceId);

  const drawer = await prisma.dailyDrawer.findUnique({ where: { id: drawerId } });
  if (!drawer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drawer.isLocked && session.role !== "admin") {
    return NextResponse.json({ error: "اليومية مقفلة" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.type !== undefined) data.type = body.type;
  if (body.invoiceNum !== undefined) data.invoiceNum = body.invoiceNum;
  if (body.price !== undefined) data.price = parseFloat(body.price) || 0;
  if (body.employeeName !== undefined) data.employeeName = body.employeeName;
  if ("employeeId" in body) data.employeeId = body.employeeId != null ? parseInt(body.employeeId) : null;
  if (body.barcodes !== undefined) {
    data.barcodes = Array.isArray(body.barcodes) ? JSON.stringify(body.barcodes) : body.barcodes;
  }

  const invoice = await prisma.invoice.update({ where: { id: invId }, data });

  return NextResponse.json(invoice);
}

// DELETE /api/drawer/[id]/invoices/[invoiceId] — delete an invoice row
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; invoiceId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, invoiceId } = await params;
  const drawerId = parseInt(id);
  const invId = parseInt(invoiceId);

  const drawer = await prisma.dailyDrawer.findUnique({ where: { id: drawerId } });
  if (!drawer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (drawer.isLocked && session.role !== "admin") {
    return NextResponse.json({ error: "اليومية مقفلة" }, { status: 403 });
  }

  await prisma.invoice.delete({ where: { id: invId } });

  return NextResponse.json({ ok: true });
}

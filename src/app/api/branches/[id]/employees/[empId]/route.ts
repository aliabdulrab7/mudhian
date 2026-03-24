import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/branches/[id]/employees/[empId] — rename or toggle active
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; empId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { empId } = await params;
  const id = parseInt(empId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: { name?: string; isActive?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const employee = await prisma.employee.update({
    where: { id },
    data,
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json(employee);
}

// DELETE /api/branches/[id]/employees/[empId] — soft delete (set isActive=false)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; empId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { empId } = await params;
  const id = parseInt(empId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.employee.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}

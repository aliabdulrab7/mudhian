import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/branches/[id]/employees — list active employees for a branch
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = parseInt((await params).id);
  if (isNaN(branchId)) return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });

  if (session.role === "branch" && session.branchId !== branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(employees);
}

// POST /api/branches/[id]/employees — create employee (admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const branchId = parseInt((await params).id);
  if (isNaN(branchId)) return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

  const employee = await prisma.employee.create({
    data: { branchId, name: name.trim() },
    select: { id: true, name: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(employee, { status: 201 });
}

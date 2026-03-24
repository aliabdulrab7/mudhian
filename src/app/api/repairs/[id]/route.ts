import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/repairs/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const repair = await prisma.repair.findUnique({
    where: { id: parseInt(id) },
    include: {
      customer: true,
      employee: { select: { name: true } },
      branch: { select: { name: true } },
      statusLogs: { orderBy: { changedAt: "asc" } },
    },
  });

  if (!repair) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && repair.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(repair);
}

// PATCH /api/repairs/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.repair.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { estimatedCost, actualCost, notes, estimatedReady, employeeId } = body;

    const updated = await prisma.repair.update({
      where: { id: parseInt(id) },
      data: {
        ...(estimatedCost !== undefined && { estimatedCost }),
        ...(actualCost !== undefined && { actualCost }),
        ...(notes !== undefined && { notes }),
        ...(estimatedReady !== undefined && { estimatedReady: estimatedReady ? new Date(estimatedReady) : null }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
      },
      include: {
        customer: true,
        employee: { select: { name: true } },
        branch: { select: { name: true } },
        statusLogs: { orderBy: { changedAt: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

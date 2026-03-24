import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/repairs/[id]/status
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const repair = await prisma.repair.findUnique({ where: { id: parseInt(id) } });
  if (!repair) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && repair.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { status, note = "" } = await req.json();
    const validStatuses = ["received", "in_progress", "completed", "delivered"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const updated = await prisma.repair.update({
      where: { id: parseInt(id) },
      data: {
        status,
        ...(status === "delivered" && { deliveredAt: new Date() }),
        statusLogs: {
          create: {
            status,
            note,
            changedBy: session.userId,
          },
        },
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

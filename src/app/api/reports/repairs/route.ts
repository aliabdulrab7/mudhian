import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/repairs?branchId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;
  const effectiveBranchId = session.role === "branch" ? session.branchId! : branchId;

  const where = effectiveBranchId ? { branchId: effectiveBranchId } : {};

  const repairs = await prisma.repair.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      statusLogs: { orderBy: { changedAt: "asc" } },
    },
  });

  // Compute stats
  const statusCounts = { received: 0, in_progress: 0, completed: 0, delivered: 0 };
  let totalTurnaround = 0;
  let deliveredCount = 0;
  let overdue = 0;
  const now = new Date();

  for (const r of repairs) {
    statusCounts[r.status as keyof typeof statusCounts] = (statusCounts[r.status as keyof typeof statusCounts] || 0) + 1;

    if (r.status === "delivered" && r.deliveredAt) {
      const days = (new Date(r.deliveredAt).getTime() - new Date(r.createdAt).getTime()) / 86400000;
      totalTurnaround += days;
      deliveredCount++;
    }

    if (r.estimatedReady && r.status !== "delivered" && new Date(r.estimatedReady) < now) {
      overdue++;
    }
  }

  const avgTurnaround = deliveredCount > 0 ? totalTurnaround / deliveredCount : null;

  // By branch
  // Revenue totals
  const totalRevenue = repairs.reduce((s, r) => s + (r.actualCost || 0), 0);
  const avgRepairCost = repairs.length > 0 ? totalRevenue / repairs.length : null;

  const byBranch: Record<number, {
    branchId: number; branchName: string;
    total: number; overdue: number; revenue: number;
    statusCounts: typeof statusCounts;
  }> = {};

  for (const r of repairs) {
    if (!byBranch[r.branchId]) {
      byBranch[r.branchId] = { branchId: r.branchId, branchName: r.branch.name, total: 0, overdue: 0, revenue: 0, statusCounts: { received: 0, in_progress: 0, completed: 0, delivered: 0 } };
    }
    byBranch[r.branchId].total++;
    byBranch[r.branchId].revenue += r.actualCost || 0;
    byBranch[r.branchId].statusCounts[r.status as keyof typeof statusCounts]++;
    if (r.estimatedReady && r.status !== "delivered" && new Date(r.estimatedReady) < now) {
      byBranch[r.branchId].overdue++;
    }
  }

  return NextResponse.json({
    total: repairs.length,
    statusCounts,
    overdue,
    totalRevenue,
    avgRepairCost: avgRepairCost ? Math.round(avgRepairCost * 10) / 10 : null,
    avgTurnaroundDays: avgTurnaround ? Math.round(avgTurnaround * 10) / 10 : null,
    byBranch: Object.values(byBranch),
  });
}

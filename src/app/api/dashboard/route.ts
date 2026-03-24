import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/dashboard?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "viewer")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const start = new Date(date + "T00:00:00.000Z");
  const end = new Date(date + "T23:59:59.999Z");

  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  const drawers = await prisma.dailyDrawer.findMany({
    where: { date: { gte: start, lte: end } },
    include: { bankTransfers: true, branch: true },
  });

  // Latest submitted drawer date per branch (for staleness badge)
  const latestDrawers = await prisma.dailyDrawer.findMany({
    where: { branchId: { in: branches.map((b) => b.id) } },
    orderBy: { date: "desc" },
    select: { branchId: true, date: true },
  });
  const latestByBranch: Record<number, string> = {};
  for (const d of latestDrawers) {
    if (!latestByBranch[d.branchId]) {
      latestByBranch[d.branchId] = d.date.toISOString().slice(0, 10);
    }
  }

  const result = branches.map((branch) => {
    const drawer = drawers.find((d) => d.branchId === branch.id);
    const lastSubmittedDate = latestByBranch[branch.id] ?? null;
    if (!drawer) return { branch, hasData: false, lastSubmittedDate };

    const bankTotal = drawer.bankTransfers.reduce((s, b) => s + b.amount, 0);
    const cashSales = drawer.totalSales - drawer.balanceValue;
    const bookBalance = drawer.bookBalance;
    const difference = drawer.actualBalance - bookBalance;

    return {
      branch,
      hasData: true,
      totalSales: drawer.totalSales,
      bankTotal,
      cashSales,
      bookBalance,
      actualBalance: drawer.actualBalance,
      difference,
      drawerId: drawer.id,
      lastSubmittedDate,
    };
  });

  return NextResponse.json(result);
}

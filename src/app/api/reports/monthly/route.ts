import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/monthly?year=Y&month=M
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(req.nextUrl.searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  const drawers = await prisma.dailyDrawer.findMany({
    where: { date: { gte: start, lte: end } },
    include: { bankTransfers: true, soldItems: true },
  });

  const result = branches.map((branch) => {
    const branchDrawers = drawers.filter((d) => d.branchId === branch.id);
    if (branchDrawers.length === 0) {
      return { branch, daysCount: 0, totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0, actualBalance: 0, avgDailySales: 0, soldItemsTotal: 0 };
    }

    let totalSales = 0, bankTotal = 0, cashSales = 0, bookBalance = 0, actualBalance = 0, soldItemsTotal = 0;

    for (const d of branchDrawers) {
      const bt = d.bankTransfers.reduce((s, b) => s + b.amount, 0);
      totalSales += d.totalSales;
      bankTotal += bt;
      cashSales += d.totalSales - d.balanceValue;
      bookBalance += d.bookBalance;
      actualBalance += d.actualBalance;
      soldItemsTotal += d.soldItems.reduce((s, i) => s + i.quantity, 0);
    }
    return {
      branch,
      daysCount: branchDrawers.length,
      totalSales,
      bankTotal,
      cashSales,
      bookBalance,
      actualBalance,
      avgDailySales: branchDrawers.length > 0 ? totalSales / branchDrawers.length : 0,
      soldItemsTotal,
    };
  });

  return NextResponse.json(result);
}

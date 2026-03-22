import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/archive?branchId=X&year=2026&month=3
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = parseInt(req.nextUrl.searchParams.get("branchId") || "");
  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(req.nextUrl.searchParams.get("month") || (new Date().getMonth() + 1).toString());

  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  if (session.role === "branch" && session.branchId !== branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const drawers = await prisma.dailyDrawer.findMany({
    where: { branchId, date: { gte: start, lte: end } },
    include: { bankTransfers: true },
    orderBy: { date: "desc" },
  });

  const result = drawers.map((drawer) => {
    const bankTotal = drawer.bankTransfers.reduce((s, b) => s + b.amount, 0);
    const cashSales = drawer.totalSales - bankTotal;
    const bookBalance = cashSales
      + drawer.yesterdayBalance + drawer.earnestReceived
      + drawer.staffDeposits + drawer.customerDepositsIn
      - drawer.adminWithdrawals - drawer.previousEarnest
      - drawer.boxesBags - drawer.cashPurchases
      - drawer.storeExpenses - drawer.customerDepositsOut
      - bankTotal - drawer.returns - drawer.salariesAdvances;
    return {
      id: drawer.id,
      date: drawer.date,
      totalSales: drawer.totalSales,
      bankTotal,
      cashSales,
      bookBalance,
      actualBalance: drawer.actualBalance,
      difference: drawer.actualBalance - bookBalance,
    };
  });

  return NextResponse.json(result);
}

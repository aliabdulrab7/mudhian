import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/dashboard?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const start = new Date(date + "T00:00:00.000Z");
  const end = new Date(date + "T23:59:59.999Z");

  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  const drawers = await prisma.dailyDrawer.findMany({
    where: { date: { gte: start, lte: end } },
    include: { bankTransfers: true, branch: true },
  });

  const result = branches.map((branch) => {
    const drawer = drawers.find((d) => d.branchId === branch.id);
    if (!drawer) return { branch, hasData: false };

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
    };
  });

  return NextResponse.json(result);
}

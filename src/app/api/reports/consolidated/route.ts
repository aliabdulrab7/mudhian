import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/consolidated?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "viewer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const start = new Date(date + "T00:00:00.000Z");
  const end = new Date(date + "T23:59:59.999Z");

  // ── Journal ──────────────────────────────────────────────────────────────
  const drawers = await prisma.dailyDrawer.findMany({
    where: { date: { gte: start, lte: end } },
    include: { branch: true },
  });

  const journalBranches = drawers.map((d) => ({
    branchId: d.branchId,
    branchName: d.branch.name,
    totalSales: d.totalSales,
    bookBalance: d.bookBalance,
    actualBalance: d.actualBalance,
    difference: d.actualBalance - d.bookBalance,
    isLocked: d.isLocked,
  }));

  const journalTotals = journalBranches.reduce(
    (acc, b) => ({
      totalSales: acc.totalSales + b.totalSales,
      bookBalance: acc.bookBalance + b.bookBalance,
      actualBalance: acc.actualBalance + b.actualBalance,
    }),
    { totalSales: 0, bookBalance: 0, actualBalance: 0 }
  );

  // ── POS ───────────────────────────────────────────────────────────────────
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { totalAmount: true, paymentMethod: true },
  });

  const posResult = sales.reduce(
    (acc, s) => {
      acc.saleCount += 1;
      acc.totalRevenue += s.totalAmount;
      if (s.paymentMethod === "cash") acc.byCash += s.totalAmount;
      else if (s.paymentMethod === "card") acc.byCard += s.totalAmount;
      else if (s.paymentMethod === "transfer") acc.byTransfer += s.totalAmount;
      return acc;
    },
    { saleCount: 0, totalRevenue: 0, byCash: 0, byCard: 0, byTransfer: 0 }
  );

  // ── Repairs ───────────────────────────────────────────────────────────────
  const [received, inProgress, completed, delivered] = await Promise.all([
    prisma.repair.count({ where: { status: "received" } }),
    prisma.repair.count({ where: { status: "in_progress" } }),
    prisma.repair.count({ where: { status: "completed" } }),
    prisma.repair.count({ where: { status: "delivered" } }),
  ]);

  const deliveredToday = await prisma.repair.findMany({
    where: { deliveredAt: { gte: start, lte: end } },
    select: { actualCost: true },
  });
  const todayRepairRevenue = deliveredToday.reduce((s, r) => s + r.actualCost, 0);

  // ── Inventory ─────────────────────────────────────────────────────────────
  const [availableItems, soldCount, reservedCount, repairCount] = await Promise.all([
    prisma.jewelryItem.findMany({
      where: { status: "available" },
      select: { salePrice: true },
    }),
    prisma.jewelryItem.count({ where: { status: "sold" } }),
    prisma.jewelryItem.count({ where: { status: "reserved" } }),
    prisma.jewelryItem.count({ where: { status: "repair" } }),
  ]);

  const inventoryTotalValue = availableItems.reduce((s, i) => s + i.salePrice, 0);

  return NextResponse.json({
    date,
    journal: {
      branches: journalBranches,
      totals: journalTotals,
    },
    pos: {
      saleCount: posResult.saleCount,
      totalRevenue: posResult.totalRevenue,
      byCash: posResult.byCash,
      byCard: posResult.byCard,
      byTransfer: posResult.byTransfer,
    },
    repairs: {
      received,
      inProgress,
      completed,
      delivered,
      todayRevenue: todayRepairRevenue,
    },
    inventory: {
      available: availableItems.length,
      sold: soldCount,
      reserved: reservedCount,
      repair: repairCount,
      totalValue: inventoryTotalValue,
    },
  });
}

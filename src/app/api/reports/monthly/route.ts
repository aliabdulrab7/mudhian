import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CATEGORIES = ["طقم", "خاتم", "حلق", "اسوارة", "تعليقة", "نص طقم"];
const BANKS = ["الانماء", "الراجحي", "الرياض", "ساب", "الاهلي"];

// GET /api/reports/monthly?year=Y&month=M
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "viewer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(req.nextUrl.searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  const drawers = await prisma.dailyDrawer.findMany({
    where: { date: { gte: start, lte: end } },
    include: { bankTransfers: true, soldItems: true },
  });

  // Global bank totals across all branches
  const globalBankTotals: Record<string, number> = {};
  for (const bank of BANKS) globalBankTotals[bank] = 0;
  for (const d of drawers) {
    for (const bt of d.bankTransfers) {
      if (globalBankTotals[bt.bankName] !== undefined) {
        globalBankTotals[bt.bankName] += bt.amount;
      }
    }
  }
  const globalBankTotal = Object.values(globalBankTotals).reduce((s, v) => s + v, 0);

  const result = branches.map((branch) => {
    const branchDrawers = drawers.filter((d) => d.branchId === branch.id);
    if (branchDrawers.length === 0) {
      const emptyItems: Record<string, number> = {};
      CATEGORIES.forEach((c) => (emptyItems[c] = 0));
      const emptyBanks: Record<string, number> = {};
      BANKS.forEach((b) => (emptyBanks[b] = 0));
      return { branch, daysCount: 0, totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0, actualBalance: 0, avgDailySales: 0, soldItemsTotal: 0, soldItemsByCategory: emptyItems, banksByName: emptyBanks };
    }

    let totalSales = 0, bankTotal = 0, cashSales = 0, bookBalance = 0, actualBalance = 0, soldItemsTotal = 0;
    const soldItemsByCategory: Record<string, number> = {};
    CATEGORIES.forEach((c) => (soldItemsByCategory[c] = 0));
    const banksByName: Record<string, number> = {};
    BANKS.forEach((b) => (banksByName[b] = 0));

    for (const d of branchDrawers) {
      const bt = d.bankTransfers.reduce((s, b) => s + b.amount, 0);
      totalSales += d.totalSales;
      bankTotal += bt;
      cashSales += d.totalSales - d.balanceValue;
      bookBalance += d.bookBalance;
      actualBalance += d.actualBalance;

      for (const item of d.soldItems) {
        if (soldItemsByCategory[item.category] !== undefined) {
          soldItemsByCategory[item.category] += item.quantity;
          soldItemsTotal += item.quantity;
        }
      }
      for (const transfer of d.bankTransfers) {
        if (banksByName[transfer.bankName] !== undefined) {
          banksByName[transfer.bankName] += transfer.amount;
        }
      }
    }

    return {
      branch,
      daysCount: branchDrawers.length,
      totalSales,
      bankTotal,
      cashSales,
      bookBalance,
      actualBalance,
      avgDailySales: totalSales / branchDrawers.length,
      soldItemsTotal,
      soldItemsByCategory,
      banksByName,
    };
  });

  return NextResponse.json({ branches: result, globalBankTotals, globalBankTotal });
}

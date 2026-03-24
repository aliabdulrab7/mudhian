import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/profit?year=Y&month=M&branchId=X
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "branch") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") || String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") || "0");
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;

  // Date range
  const start = month === 0 ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
  const end = month === 0 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);

  const where = {
    status: "sold",
    soldAt: { gte: start, lt: end },
    ...(branchId ? { branchId } : {}),
  };

  const items = await prisma.jewelryItem.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
    },
    orderBy: { soldAt: "desc" },
  });

  if (items.length === 0) {
    return NextResponse.json({
      summary: { totalRevenue: 0, totalCost: 0, grossProfit: 0, avgMarginPct: 0, soldItemsCount: 0 },
      byCategory: [],
      byKarat: [],
      byBranch: [],
      topItems: [],
    });
  }

  // Summary
  let totalRevenue = 0;
  let totalCost = 0;

  // Aggregation buckets
  const catMap: Record<string, { count: number; revenue: number; cost: number }> = {};
  const karatMap: Record<number, { count: number; revenue: number; cost: number }> = {};
  const branchMap: Record<number, { branchId: number; branchName: string; count: number; revenue: number; cost: number }> = {};

  for (const item of items) {
    const revenue = item.salePrice;
    const cost = item.cost;
    totalRevenue += revenue;
    totalCost += cost;

    // By category
    if (!catMap[item.category]) catMap[item.category] = { count: 0, revenue: 0, cost: 0 };
    catMap[item.category].count++;
    catMap[item.category].revenue += revenue;
    catMap[item.category].cost += cost;

    // By karat
    if (!karatMap[item.karat]) karatMap[item.karat] = { count: 0, revenue: 0, cost: 0 };
    karatMap[item.karat].count++;
    karatMap[item.karat].revenue += revenue;
    karatMap[item.karat].cost += cost;

    // By branch
    const bid = item.branch.id;
    if (!branchMap[bid]) {
      branchMap[bid] = { branchId: bid, branchName: item.branch.name, count: 0, revenue: 0, cost: 0 };
    }
    branchMap[bid].count++;
    branchMap[bid].revenue += revenue;
    branchMap[bid].cost += cost;
  }

  const grossProfit = totalRevenue - totalCost;
  const avgMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const byCategory = Object.entries(catMap)
    .map(([category, d]) => {
      const profit = d.revenue - d.cost;
      const marginPct = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;
      return { category, count: d.count, revenue: d.revenue, cost: d.cost, profit, marginPct };
    })
    .sort((a, b) => b.profit - a.profit);

  const byKarat = Object.entries(karatMap)
    .map(([karat, d]) => {
      const profit = d.revenue - d.cost;
      const marginPct = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;
      return { karat: parseInt(karat), count: d.count, revenue: d.revenue, cost: d.cost, profit, marginPct };
    })
    .sort((a, b) => b.profit - a.profit);

  const byBranch = Object.values(branchMap)
    .map((d) => {
      const profit = d.revenue - d.cost;
      const marginPct = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;
      return { ...d, profit, marginPct };
    })
    .sort((a, b) => b.profit - a.profit);

  const topItems = items
    .map((item) => ({
      sku: item.sku,
      category: item.category,
      karat: item.karat,
      salePrice: item.salePrice,
      cost: item.cost,
      profit: item.salePrice - item.cost,
      marginPct: item.salePrice > 0 ? ((item.salePrice - item.cost) / item.salePrice) * 100 : 0,
      soldAt: item.soldAt ? item.soldAt.toISOString().split("T")[0] : null,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCost,
      grossProfit,
      avgMarginPct,
      soldItemsCount: items.length,
    },
    byCategory,
    byKarat,
    byBranch,
    topItems,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/sales?year=&month=&branchId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const year = parseInt(sp.get("year") || String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") || String(new Date().getMonth() + 1));
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;

  const effectiveBranchId = session.role === "branch" ? session.branchId! : branchId;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const where = {
    createdAt: { gte: start, lt: end },
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true } },
      saleItems: {
        include: {
          jewelryItem: { select: { category: true, metalType: true, karat: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by branch
  const byBranch: Record<number, {
    branchId: number; branchName: string;
    saleCount: number; totalAmount: number;
    byPayment: Record<string, number>;
    byCategory: Record<string, { count: number; amount: number }>;
  }> = {};

  // Aggregate by employee
  const byEmployee: Record<string, {
    employeeId: number | null; employeeName: string;
    saleCount: number; totalAmount: number;
  }> = {};

  for (const sale of sales) {
    const bid = sale.branchId;
    if (!byBranch[bid]) {
      byBranch[bid] = { branchId: bid, branchName: sale.branch.name, saleCount: 0, totalAmount: 0, byPayment: {}, byCategory: {} };
    }
    byBranch[bid].saleCount++;
    byBranch[bid].totalAmount += sale.totalAmount;
    byBranch[bid].byPayment[sale.paymentMethod] = (byBranch[bid].byPayment[sale.paymentMethod] || 0) + sale.totalAmount;

    for (const item of sale.saleItems) {
      const cat = item.jewelryItem?.category || "أخرى";
      if (!byBranch[bid].byCategory[cat]) byBranch[bid].byCategory[cat] = { count: 0, amount: 0 };
      byBranch[bid].byCategory[cat].count++;
      byBranch[bid].byCategory[cat].amount += item.price - item.discount;
    }

    const empKey = String(sale.employeeId ?? "none");
    if (!byEmployee[empKey]) {
      byEmployee[empKey] = {
        employeeId: sale.employeeId,
        employeeName: sale.employee?.name || "غير محدد",
        saleCount: 0, totalAmount: 0,
      };
    }
    byEmployee[empKey].saleCount++;
    byEmployee[empKey].totalAmount += sale.totalAmount;
  }

  const totalAmount = sales.reduce((s, sale) => s + sale.totalAmount, 0);

  return NextResponse.json({
    saleCount: sales.length,
    totalAmount,
    byBranch: Object.values(byBranch),
    byEmployee: Object.values(byEmployee).sort((a, b) => b.totalAmount - a.totalAmount),
  });
}

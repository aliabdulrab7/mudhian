import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/reports/inventory?branchId=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;

  const effectiveBranchId = session.role === "branch" ? session.branchId! : branchId;

  const where = effectiveBranchId ? { branchId: effectiveBranchId } : {};

  // Group by branch and status
  const branches = await prisma.branch.findMany({
    where: effectiveBranchId ? { id: effectiveBranchId } : {},
    select: {
      id: true, name: true,
      jewelryItems: {
        where,
        select: {
          status: true,
          salePrice: true,
          cost: true,
          category: true,
          metalType: true,
          karat: true,
        },
      },
    },
  });

  const result = branches.map((b) => {
    const items = b.jewelryItems;
    const available = items.filter((i) => i.status === "available");
    const sold = items.filter((i) => i.status === "sold");
    const archived = items.filter((i) => i.status === "archived");

    const availableValue = available.reduce((s, i) => s + (i.salePrice || 0), 0);
    const soldValue = sold.reduce((s, i) => s + (i.salePrice || 0), 0);
    const costValue = available.reduce((s, i) => s + (i.cost || 0), 0);

    // By category
    const byCategory: Record<string, { count: number; value: number }> = {};
    for (const item of available) {
      if (!byCategory[item.category]) byCategory[item.category] = { count: 0, value: 0 };
      byCategory[item.category].count++;
      byCategory[item.category].value += item.salePrice || 0;
    }

    return {
      branch: { id: b.id, name: b.name },
      availableCount: available.length,
      soldCount: sold.length,
      archivedCount: archived.length,
      totalCount: items.length,
      availableValue,
      soldValue,
      costValue,
      byCategory,
    };
  });

  const totals = result.reduce((acc, r) => ({
    availableCount: acc.availableCount + r.availableCount,
    soldCount: acc.soldCount + r.soldCount,
    availableValue: acc.availableValue + r.availableValue,
    soldValue: acc.soldValue + r.soldValue,
  }), { availableCount: 0, soldCount: 0, availableValue: 0, soldValue: 0 });

  return NextResponse.json({ branches: result, totals });
}

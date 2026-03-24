import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/stock-transfers?status=pending
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;

  const transfers = await prisma.stockTransfer.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    include: {
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transfers);
}

// POST /api/stock-transfers — admin only
// Body: { fromBranchId, toBranchId, notes, itemSkus: string[] }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fromBranchId, toBranchId, notes = "", itemSkus = [] } = body;

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json({ error: "fromBranchId و toBranchId مطلوبان" }, { status: 400 });
    }
    if (fromBranchId === toBranchId) {
      return NextResponse.json({ error: "الفرع المصدر والوجهة يجب أن يكونا مختلفَين" }, { status: 400 });
    }
    if (!Array.isArray(itemSkus) || itemSkus.length === 0) {
      return NextResponse.json({ error: "يجب إضافة قطعة واحدة على الأقل" }, { status: 400 });
    }

    // Validate items: must be available and belong to fromBranch
    const items = await prisma.jewelryItem.findMany({
      where: {
        sku: { in: itemSkus },
        branchId: fromBranchId,
        status: "available",
      },
    });

    if (items.length !== itemSkus.length) {
      const foundSkus = items.map((i) => i.sku);
      const missing = itemSkus.filter((s: string) => !foundSkus.includes(s));
      return NextResponse.json(
        { error: `بعض القطع غير متاحة أو لا تنتمي للفرع المحدد: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Create transfer + items + mark items as reserved in a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.stockTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          notes,
          createdBy: session.userId,
          status: "pending",
          items: {
            create: items.map((item) => ({ jewelryItemId: item.id })),
          },
        },
        include: {
          fromBranch: { select: { name: true } },
          toBranch: { select: { name: true } },
          items: { include: { jewelryItem: { select: { sku: true, category: true, karat: true } } } },
        },
      });

      // Mark all items as reserved
      await tx.jewelryItem.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { status: "reserved" },
      });

      return t;
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/stock-transfers]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

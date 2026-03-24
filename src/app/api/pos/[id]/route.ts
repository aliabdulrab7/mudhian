import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

// GET /api/pos/[id] — fetch sale receipt data
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const saleId = parseInt(id);

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      employee: true,
      branch: { select: { name: true, branchNum: true } },
      user: { select: { username: true } },
      saleItems: {
        include: {
          jewelryItem: {
            select: {
              sku: true, category: true, karat: true,
              metalType: true, netWeight: true,
            },
          },
        },
      },
    },
  });

  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (session.role === "branch" && sale.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(sale);
}

// PATCH /api/pos/[id] — refund a sale
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const saleId = parseInt(id);
  const body = await req.json();

  if (body.action !== "refund") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const reason: string = body.reason ?? "";

  // Load the sale with all related data needed for reversal
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      saleItems: {
        include: { jewelryItem: { select: { id: true } } },
      },
    },
  });

  if (!sale) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Branch users can only refund sales from their own branch
  if (session.role === "branch" && sale.branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Already refunded?
  if (sale.notes.startsWith("[مرتجع]")) {
    return NextResponse.json({ error: "الفاتورة مُسترجعة مسبقاً" }, { status: 400 });
  }

  // Build updated notes: prepend refund marker
  const newNotes = `[مرتجع] ${reason ? reason + " — " : ""}${sale.notes}`.trim();

  // Collect jewelry item ids to restore
  const jewelryItemIds = sale.saleItems.map((si) => si.jewelryItem.id);

  // Perform all DB changes in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Mark sale notes as refunded
    await tx.sale.update({
      where: { id: saleId },
      data: { notes: newNotes },
    });

    // 2. Restore all JewelryItems to available
    await tx.jewelryItem.updateMany({
      where: { id: { in: jewelryItemIds } },
      data: { status: "available", soldAt: null },
    });

    // 3. Find the drawer that received this sale's invoices (match by invoiceNum)
    const relatedInvoice = await tx.invoice.findFirst({
      where: { invoiceNum: sale.invoiceNum },
      include: { drawer: true },
    });

    if (relatedInvoice) {
      const drawer = relatedInvoice.drawer;

      // Only modify if not locked
      if (!drawer.isLocked) {
        // Delete all Invoice rows for this sale from the drawer
        await tx.invoice.deleteMany({
          where: { drawerId: drawer.id, invoiceNum: sale.invoiceNum },
        });

        // Decrement drawer totalSales
        const balanceDelta =
          sale.paymentMethod === "card" || sale.paymentMethod === "transfer"
            ? sale.totalAmount
            : 0;

        await tx.dailyDrawer.update({
          where: { id: drawer.id },
          data: {
            totalSales: { decrement: sale.totalAmount },
            ...(balanceDelta > 0 && { balanceValue: { decrement: balanceDelta } }),
          },
        });
      }
    }
  });

  logAction(
    session,
    "استرجاع فاتورة POS",
    `فاتورة: ${sale.invoiceNum} — السبب: ${reason || "—"} — المبلغ: ${sale.totalAmount}`
  );

  // Return updated sale
  const updated = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      employee: true,
      branch: { select: { name: true, branchNum: true } },
      user: { select: { username: true } },
      saleItems: {
        include: {
          jewelryItem: {
            select: {
              sku: true, category: true, karat: true,
              metalType: true, netWeight: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

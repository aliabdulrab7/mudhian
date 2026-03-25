import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { postEntry, buildRefundLines } from "@/lib/accounting";

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
              sku: true, barcode: true, category: true, karat: true,
              metalType: true, grossWeight: true, netWeight: true,
              stoneType: true, stoneWeight: true, stoneCount: true,
              stoneValue: true, makingCharges: true,
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

  // Fetch latest gold price on or before the sale date
  const goldPrice = await prisma.metalPrice.findFirst({
    where: { metalType: "gold", date: { lte: sale.createdAt } },
    orderBy: { date: "desc" },
    select: { pricePerGram: true },
  });

  // Fetch store info settings for receipt header
  const settingRows = await prisma.appSetting.findMany({
    where: { key: { in: ["storeVatNumber", "storePhone", "storeAddress", "storeManager"] } },
    select: { key: true, value: true },
  });
  const storeInfo = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  return NextResponse.json({ ...sale, goldPricePerGram: goldPrice?.pricePerGram ?? null, storeInfo });
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
        include: { jewelryItem: { select: { id: true, metalType: true } } },
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

  // ── Auto-post reversing GL entry (best-effort) ──
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemCosts = sale.saleItems.reduce((s: number, si: any) => s + (si.costAtSale ?? 0), 0);
    const metalType = sale.saleItems[0]?.jewelryItem?.metalType ?? "gold";
    const refundRef = `REF-${sale.invoiceNum}`;
    const glLines = buildRefundLines({
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      branchId: sale.branchId,
      invoiceNum: sale.invoiceNum,
      itemCosts,
      metalType,
    });
    await postEntry({
      date: new Date(),
      description: `مرتجع POS — ${sale.invoiceNum}`,
      ref: refundRef,
      type: "refund",
      branchId: sale.branchId,
      postedBy: session.userId,
      lines: glLines,
    });
  } catch (glErr) {
    console.error("[PATCH /api/pos] GL refund posting failed:", glErr instanceof Error ? glErr.message : glErr);
  }

  // Return updated sale with full receipt data
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
              sku: true, barcode: true, category: true, karat: true,
              metalType: true, grossWeight: true, netWeight: true,
              stoneType: true, stoneWeight: true, stoneCount: true,
              stoneValue: true, makingCharges: true,
            },
          },
        },
      },
    },
  });

  const goldPrice = await prisma.metalPrice.findFirst({
    where: { metalType: "gold", date: { lte: updated!.createdAt } },
    orderBy: { date: "desc" },
    select: { pricePerGram: true },
  });
  const settingRows = await prisma.appSetting.findMany({
    where: { key: { in: ["storeVatNumber", "storePhone", "storeAddress", "storeManager"] } },
    select: { key: true, value: true },
  });
  const storeInfo = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  return NextResponse.json({ ...updated, goldPricePerGram: goldPrice?.pricePerGram ?? null, storeInfo });
}

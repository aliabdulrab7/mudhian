import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { postEntry, buildSaleLines } from "@/lib/accounting";

const SOLD_CATEGORIES = ["طقم", "خاتم", "حلق", "اسوارة", "تعليقة", "نص طقم"];

// GET /api/pos?branchId=X&limit=20 — list recent sales
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ? parseInt(searchParams.get("branchId")!) : undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  // Branch users can only see their own branch
  const effectiveBranchId =
    session.role === "branch" ? (session.branchId ?? undefined) : branchId;

  const sales = await prisma.sale.findMany({
    where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      invoiceNum: true,
      totalAmount: true,
      paymentMethod: true,
      notes: true,
      createdAt: true,
      customer: { select: { name: true } },
      employee: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });

  return NextResponse.json(sales);
}
const BANKS = ["الانماء", "الراجحي", "الرياض", "ساب", "الاهلي"];

function padNum(n: number, len: number) {
  return String(n).padStart(len, "0");
}

async function generateInvoiceNum(): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${padNum(now.getMonth() + 1, 2)}${padNum(now.getDate(), 2)}`;
  const prefix = `INV-${dateStr}-`;

  const latest = await prisma.sale.findFirst({
    where: { invoiceNum: { startsWith: prefix } },
    orderBy: { invoiceNum: "desc" },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.invoiceNum.split("-");
    seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
  }

  return `${prefix}${padNum(seq, 4)}`;
}

// POST /api/pos — complete a sale
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      branchId,
      items, // Array<{ jewelryItemId, price, discount }>
      customerId,
      employeeId,
      paymentMethod = "cash",
      discountAmount = 0,
      notes = "",
    } = body;

    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    if (!items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });

    // Branch users can only sell from own branch
    if (session.role === "branch" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate all items are available
    const itemIds: number[] = items.map((i: { jewelryItemId: number }) => i.jewelryItemId);
    const dbItems = await prisma.jewelryItem.findMany({
      where: { id: { in: itemIds } },
    });

    for (const dbItem of dbItems) {
      if (dbItem.status !== "available") {
        return NextResponse.json(
          { error: `القطعة ${dbItem.sku} غير متاحة للبيع (الحالة: ${dbItem.status})` },
          { status: 400 }
        );
      }
    }

    const invoiceNum = await generateInvoiceNum();
    const netSaleTotal = items.reduce(
      (sum: number, i: { price: number; discount: number }) => sum + (i.price - (i.discount || 0)),
      0
    ) - discountAmount;

    const sale = await prisma.$transaction(async (tx) => {
      // Create sale — stamp costAtSale from current jewelry item cost
      const costMap = Object.fromEntries(dbItems.map((di) => [di.id, di.cost ?? 0]));

      const newSale = await tx.sale.create({
        data: {
          invoiceNum,
          branchId,
          customerId: customerId || null,
          employeeId: employeeId || null,
          totalAmount: netSaleTotal,
          discountAmount,
          paymentMethod,
          notes,
          createdBy: session.userId,
          saleItems: {
            create: items.map((i: { jewelryItemId: number; price: number; discount: number }) => ({
              jewelryItemId: i.jewelryItemId,
              price: i.price,
              discount: i.discount || 0,
              costAtSale: costMap[i.jewelryItemId] ?? 0,
            })),
          },
        },
        include: {
          saleItems: {
            include: { jewelryItem: true },
          },
        },
      });

      // Mark items as sold
      await tx.jewelryItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: "sold", soldAt: new Date() },
      });

      return newSale;
    });

    // ── Auto-post GL journal entry (best-effort; failure does NOT fail the sale) ──
    try {
      const totalCost = dbItems.reduce((s, di) => s + (di.cost ?? 0), 0);
      const metalType = dbItems[0]?.metalType ?? "gold";
      const glLines = buildSaleLines({
        totalAmount: netSaleTotal,
        paymentMethod,
        branchId,
        invoiceNum,
        itemCosts: totalCost,
        metalType,
      });
      await postEntry({
        date: new Date(),
        description: `مبيعات POS — ${invoiceNum}`,
        ref: invoiceNum,
        type: "sale",
        branchId,
        postedBy: session.userId,
        lines: glLines,
      });
    } catch (glErr) {
      console.error("[POST /api/pos] GL posting failed:", glErr instanceof Error ? glErr.message : glErr);
    }

    // ── Sync POS sale to daily drawer (best-effort; failure does NOT fail the sale) ──
    try {
      // Get today's date in YYYY-MM-DD using local time (matches todayISO() convention)
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${padNum(now.getMonth() + 1, 2)}-${padNum(now.getDate(), 2)}`;
      const drawerDate = new Date(todayStr + "T00:00:00.000Z");

      // Resolve employee name snapshot
      let employeeName = "";
      if (employeeId) {
        const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
        employeeName = emp?.name ?? "";
      }

      // Find or create today's drawer for this branch
      let drawer = await prisma.dailyDrawer.findFirst({
        where: { branchId, date: drawerDate },
      });

      if (!drawer) {
        // Replicate drawer creation logic from GET /api/drawer
        const yesterday = new Date(drawerDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const prevDrawer = await prisma.dailyDrawer.findFirst({
          where: { branchId, date: yesterday },
        });

        drawer = await prisma.dailyDrawer.create({
          data: {
            branchId,
            date: drawerDate,
            yesterdayBalance: prevDrawer?.bookBalance ?? 0,
            soldItems: {
              create: SOLD_CATEGORIES.map((category) => ({ category, quantity: 0 })),
            },
            bankTransfers: {
              create: BANKS.map((bankName) => ({ bankName, amount: 0, beneficiary: "", notes: "" })),
            },
          },
        });
      }

      // Skip drawer update if locked
      if (!drawer.isLocked) {
        // Create one Invoice record per sale item (each maps to one jewelry piece)
        const barcodeByItemId: Record<number, string> = {};
        for (const dbItem of dbItems) {
          barcodeByItemId[dbItem.id] = dbItem.barcode;
        }

        for (const saleItem of sale.saleItems) {
          const barcode = barcodeByItemId[saleItem.jewelryItemId] ?? "";
          const itemNet = saleItem.price - saleItem.discount;
          await prisma.invoice.create({
            data: {
              drawerId: drawer.id,
              type: "عادية",
              invoiceNum: sale.invoiceNum,
              price: itemNet,
              employeeName,
              employeeId: employeeId || null,
              barcodes: JSON.stringify(barcode ? [barcode] : []),
            },
          });
        }

        // Update drawer: add to totalSales, and add to balanceValue for card/transfer
        const balanceDelta = (paymentMethod === "card" || paymentMethod === "transfer") ? netSaleTotal : 0;
        await prisma.dailyDrawer.update({
          where: { id: drawer.id },
          data: {
            totalSales: { increment: netSaleTotal },
            ...(balanceDelta > 0 && { balanceValue: { increment: balanceDelta } }),
          },
        });

        logAction(session, "مزامنة مبيعات POS",
          `فاتورة: ${sale.invoiceNum} — المبلغ: ${netSaleTotal} — فرع: ${branchId}`);
      }
    } catch (drawerErr) {
      // Drawer sync failure must not fail the sale
      console.error("[POST /api/pos] drawer sync failed:", drawerErr instanceof Error ? drawerErr.message : drawerErr);
    }

    return NextResponse.json({ saleId: sale.id, invoiceNum: sale.invoiceNum }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/pos]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

// PATCH /api/drawer/[id] — update all drawer fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const drawerId = parseInt(id);
  const body = await req.json();

  const {
    totalSales,
    balanceValue,
    yesterdayBalance,
    earnestReceived,
    staffDeposits,
    customerDepositsIn,
    adminWithdrawals,
    previousEarnest,
    boxesBags,
    cashPurchases,
    storeExpenses,
    customerDepositsOut,
    returns,
    salariesAdvances,
    actualBalance,
    bookBalance,
    notes,
    soldItems,    // [{ id, quantity }]
    bankTransfers, // [{ id, amount, beneficiary, notes }]
  } = body;

  // Update scalar fields
  const drawer = await prisma.dailyDrawer.update({
    where: { id: drawerId },
    data: {
      ...(totalSales !== undefined && { totalSales }),
      ...(balanceValue !== undefined && { balanceValue }),
      ...(yesterdayBalance !== undefined && { yesterdayBalance }),
      ...(earnestReceived !== undefined && { earnestReceived }),
      ...(staffDeposits !== undefined && { staffDeposits }),
      ...(customerDepositsIn !== undefined && { customerDepositsIn }),
      ...(adminWithdrawals !== undefined && { adminWithdrawals }),
      ...(previousEarnest !== undefined && { previousEarnest }),
      ...(boxesBags !== undefined && { boxesBags }),
      ...(cashPurchases !== undefined && { cashPurchases }),
      ...(storeExpenses !== undefined && { storeExpenses }),
      ...(customerDepositsOut !== undefined && { customerDepositsOut }),
      ...(returns !== undefined && { returns }),
      ...(salariesAdvances !== undefined && { salariesAdvances }),
      ...(actualBalance !== undefined && { actualBalance }),
      ...(bookBalance !== undefined && { bookBalance }),
      ...(notes !== undefined && { notes }),
    },
  });

  // Update sold items
  if (soldItems?.length) {
    await Promise.all(
      soldItems.map((item: { id: number; quantity: number }) =>
        prisma.soldItem.update({ where: { id: item.id }, data: { quantity: item.quantity } })
      )
    );
  }

  // Update bank transfers
  if (bankTransfers?.length) {
    await Promise.all(
      bankTransfers.map((bt: { id: number; amount: number; beneficiary: string; notes: string }) =>
        prisma.bankTransfer.update({
          where: { id: bt.id },
          data: { amount: bt.amount, beneficiary: bt.beneficiary, notes: bt.notes },
        })
      )
    );
  }

  const d = await prisma.dailyDrawer.findUnique({ where: { id: drawerId }, include: { branch: true } });
  await logAction(session!, "تعديل يومية", `فرع: ${d?.branch?.name ?? drawerId} — تاريخ: ${d?.date?.toISOString().slice(0, 10) ?? ""}`);

  return NextResponse.json(drawer);
}

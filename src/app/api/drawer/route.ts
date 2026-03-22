import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const SOLD_CATEGORIES = ["طقم", "خاتم", "حلق", "اسوارة", "تعليقة", "نص طقم"];
const BANKS = ["الانماء", "الراجحي", "الرياض", "ساب", "الاهلي"];

// GET /api/drawer?branchId=X&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = parseInt(req.nextUrl.searchParams.get("branchId") || "");
  const date = req.nextUrl.searchParams.get("date");

  if (!branchId || !date) return NextResponse.json({ error: "branchId and date required" }, { status: 400 });

  // Branch users can only access their branch
  if (session.role === "branch" && session.branchId !== branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = new Date(date + "T00:00:00.000Z");

  let drawer = await prisma.dailyDrawer.findFirst({
    where: { branchId, date: start },
    include: { soldItems: true, bankTransfers: true, branch: true },
  });

  if (!drawer) {
    // Get yesterday's book balance
    const yesterday = new Date(start);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevDrawer = await prisma.dailyDrawer.findFirst({
      where: { branchId, date: yesterday },
    });

    drawer = await prisma.dailyDrawer.create({
      data: {
        branchId,
        date: start,
        yesterdayBalance: prevDrawer?.bookBalance ?? 0,
        soldItems: {
          create: SOLD_CATEGORIES.map((category) => ({ category, quantity: 0 })),
        },
        bankTransfers: {
          create: BANKS.map((bankName) => ({ bankName, amount: 0, beneficiary: "", notes: "" })),
        },
      },
      include: { soldItems: true, bankTransfers: true, branch: true },
    });
  }

  return NextResponse.json(drawer);
}

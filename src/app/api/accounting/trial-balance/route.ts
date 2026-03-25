import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { getSession } from "@/lib/auth";

// GET /api/accounting/trial-balance?from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=X
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const branchId = searchParams.get("branchId") ? parseInt(searchParams.get("branchId")!) : undefined;

  // Build entry filter for date range / branch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entryWhere: any = { status: "posted" };
  if (from) entryWhere.date = { gte: new Date(from) };
  if (to) entryWhere.date = { ...entryWhere.date, lte: new Date(to + "T23:59:59.999Z") };
  if (branchId) entryWhere.branchId = branchId;

  // Get qualifying entry IDs
  const entryIds = (await prisma.journalEntry.findMany({ where: entryWhere, select: { id: true } })).map((e: { id: number }) => e.id);

  // Get all accounts
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  // Aggregate lines by accountId
  const lines = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: entryIds.length > 0 ? { entryId: { in: entryIds } } : { entryId: { in: [-1] } },
    _sum: { debit: true, credit: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineMap = Object.fromEntries(lines.map((l: any) => [l.accountId, { debit: l._sum.debit ?? 0, credit: l._sum.credit ?? 0 }]));

  // Build trial balance rows (only accounts with activity or non-zero balance)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (accounts as any[])
    .map((acc) => {
      const activity = lineMap[acc.id] ?? { debit: 0, credit: 0 };
      const debit = Math.round(activity.debit * 100) / 100;
      const credit = Math.round(activity.credit * 100) / 100;
      return { code: acc.code, nameAr: acc.nameAr, nameEn: acc.nameEn, type: acc.type, parentCode: acc.parentCode, debit, credit, balance: Math.round((debit - credit) * 100) / 100 };
    })
    .filter((r: { debit: number; credit: number }) => r.debit !== 0 || r.credit !== 0);

  const totalDebit = Math.round(rows.reduce((s: number, r: { debit: number }) => s + r.debit, 0) * 100) / 100;
  const totalCredit = Math.round(rows.reduce((s: number, r: { credit: number }) => s + r.credit, 0) * 100) / 100;

  return NextResponse.json({ rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
}

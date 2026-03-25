import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { getSession } from "@/lib/auth";

// GET /api/accounting/journal?from=YYYY-MM-DD&to=YYYY-MM-DD&type=sale&branchId=X&search=INV&page=1&limit=50
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");
  const branchId = searchParams.get("branchId") ? parseInt(searchParams.get("branchId")!) : undefined;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (from) where.date = { gte: new Date(from) };
  if (to) where.date = { ...where.date, lte: new Date(to + "T23:59:59.999Z") };
  if (type) where.type = type;
  if (branchId) where.branchId = branchId;
  if (search) where.OR = [
    { ref: { contains: search, mode: "insensitive" } },
    { description: { contains: search, mode: "insensitive" } },
    { entryNum: { contains: search, mode: "insensitive" } },
  ];

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        lines: {
          include: {
            account: { select: { code: true, nameAr: true, nameEn: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, pages: Math.ceil(total / limit) });
}

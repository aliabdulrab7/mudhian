import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;
import { getSession } from "@/lib/auth";
import { DEFAULT_COA } from "@/lib/accounting";

// GET /api/accounting/coa — list all accounts
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json(accounts);
}

// POST /api/accounting/coa — create account OR seed defaults
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Seed all default accounts
  if (body.action === "seed") {
    let created = 0;
    let skipped = 0;

    for (const acc of DEFAULT_COA) {
      const existing = await prisma.account.findUnique({ where: { code: acc.code } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.account.create({
        data: {
          code: acc.code,
          nameAr: acc.nameAr,
          nameEn: acc.nameEn,
          type: acc.type,
          parentCode: acc.parentCode,
        },
      });
      created++;
    }

    return NextResponse.json({ created, skipped, total: DEFAULT_COA.length });
  }

  // Create a single account
  const { code, nameAr, nameEn, type, parentCode = "", notes = "" } = body;
  if (!code || !nameAr || !type) {
    return NextResponse.json({ error: "code, nameAr, type required" }, { status: 400 });
  }

  const existing = await prisma.account.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "الرمز مستخدم مسبقاً" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: { code, nameAr, nameEn: nameEn ?? "", type, parentCode, notes },
  });

  return NextResponse.json(account, { status: 201 });
}

// PATCH /api/accounting/coa — update an account by code
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { code, ...updates } = body;
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const account = await prisma.account.update({
    where: { code },
    data: updates,
  });

  return NextResponse.json(account);
}

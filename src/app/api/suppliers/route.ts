import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/suppliers?search=X&isActive=true
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") || undefined;
  const isActiveParam = sp.get("isActive");
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { jewelryItems: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

// POST /api/suppliers — admin only
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, phone = "", email = "", address = "", notes = "" } = body;
    if (!name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), phone, email, address, notes },
      include: { _count: { select: { jewelryItems: true } } },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "يوجد مورد بهذا الاسم مسبقاً" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

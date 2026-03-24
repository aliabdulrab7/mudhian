import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateSKU, generateBarcode } from "@/lib/skuGenerator";

// GET /api/inventory?branchId=&status=&category=&search=&page=1&limit=50
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;
  const status = sp.get("status") || undefined;
  const category = sp.get("category") || undefined;
  const search = sp.get("search") || undefined;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") || "50"));

  // Branch users can only see their own branch
  const effectiveBranchId =
    session.role === "branch" ? session.branchId : branchId;

  const where = {
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(status ? { status } : { status: { not: "archived" } }),
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
            { supplierRef: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.jewelryItem.findMany({
      where,
      include: { branch: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.jewelryItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/inventory
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      category, metalType = "gold", karat = 18,
      grossWeight = 0, netWeight = 0,
      stoneType = "", stoneWeight = 0, stoneCount = 0, stoneValue = 0,
      makingCharges = 0, cost = 0, salePrice = 0, margin = 0,
      notes = "",
    } = body;
    const supplierId: number | null = body.supplierId ? Number(body.supplierId) : null;

    if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

    const branchId =
      session.role === "branch" ? session.branchId! : parseInt(body.branchId);
    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

    const sku = await generateSKU(category);
    const barcode = await generateBarcode(sku);

    const item = await prisma.jewelryItem.create({
      data: {
        sku, barcode, category, metalType, karat,
        grossWeight, netWeight,
        stoneType, stoneWeight, stoneCount, stoneValue,
        makingCharges, cost, salePrice, margin,
        supplierId, notes, branchId,
        status: "available",
      },
      include: {
        branch: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/inventory]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

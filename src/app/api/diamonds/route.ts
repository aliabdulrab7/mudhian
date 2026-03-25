import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

async function generateDiamondSKU(): Promise<string> {
  const latest = await prisma.diamondStone.findFirst({
    where: { sku: { startsWith: "DIA-" } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });
  let next = 1;
  if (latest) {
    const num = parseInt(latest.sku.split("-").pop() ?? "0", 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `DIA-${String(next).padStart(4, "0")}`;
}

// GET /api/diamonds?branchId=X&status=available&shape=Round&color=D&clarity=VVS1&minCarat=0.5&maxCarat=2&search=DIA&page=1
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") ? parseInt(searchParams.get("branchId")!) : undefined;
  const status = searchParams.get("status");
  const shape = searchParams.get("shape");
  const color = searchParams.get("color");
  const clarity = searchParams.get("clarity");
  const minCarat = searchParams.get("minCarat") ? parseFloat(searchParams.get("minCarat")!) : undefined;
  const maxCarat = searchParams.get("maxCarat") ? parseFloat(searchParams.get("maxCarat")!) : undefined;
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 30;

  const effectiveBranchId =
    session.role === "branch" ? (session.branchId ?? undefined) : branchId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (effectiveBranchId) where.branchId = effectiveBranchId;
  if (status) where.status = status;
  if (shape) where.shape = shape;
  if (color) where.color = color;
  if (clarity) where.clarity = clarity;
  if (minCarat !== undefined || maxCarat !== undefined) {
    where.caratWeight = {};
    if (minCarat !== undefined) where.caratWeight.gte = minCarat;
    if (maxCarat !== undefined) where.caratWeight.lte = maxCarat;
  }
  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { certificateNum: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const [stones, total] = await Promise.all([
    prisma.diamondStone.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        branch: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.diamondStone.count({ where }),
  ]);

  return NextResponse.json({ stones, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/diamonds — create a diamond stone
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      caratWeight, color, clarity, cut, shape = "Round",
      certificateNum = "", certBody = "", origin = "",
      cost, salePrice, branchId, supplierId, notes = "",
    } = body;

    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    if (!cost && cost !== 0) return NextResponse.json({ error: "cost required" }, { status: 400 });

    if (session.role === "branch" && session.branchId !== Number(branchId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sku = await generateDiamondSKU();

    const stone = await prisma.diamondStone.create({
      data: {
        sku,
        caratWeight: Number(caratWeight) || 0,
        color: color ?? "",
        clarity: clarity ?? "",
        cut: cut ?? "",
        shape,
        certificateNum,
        certBody,
        origin,
        cost: Number(cost) || 0,
        salePrice: Number(salePrice) || 0,
        status: "available",
        branchId: Number(branchId),
        supplierId: supplierId ? Number(supplierId) : null,
        notes,
      },
    });

    logAction(session, "إضافة ماسة", `SKU: ${sku} — ${caratWeight} قيراط — فرع: ${branchId}`);
    return NextResponse.json(stone, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/diamonds]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

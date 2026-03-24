import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/metal-prices?metalType=gold&limit=30
// If metalType=all or omitted, returns full history across all types
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metalTypeParam = req.nextUrl.searchParams.get("metalType");
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "30"));

  const where = metalTypeParam && metalTypeParam !== "all" ? { metalType: metalTypeParam } : {};

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Today's gold price (latest)
  const todayGold = await prisma.metalPrice.findFirst({
    where: { metalType: "gold", date: { gte: today } },
    orderBy: { date: "desc" },
  });

  const history = await prisma.metalPrice.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json({
    today: todayGold ?? null,
    price: todayGold?.pricePerGram ?? null,
    date: todayGold?.date ?? null,
    history,
  });
}

// POST /api/metal-prices
// Body: { pricePerGram: number, metalType?: string }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const { pricePerGram, metalType = "gold" } = await req.json();
    if (!pricePerGram || pricePerGram <= 0) {
      return NextResponse.json({ error: "pricePerGram must be positive" }, { status: 400 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await prisma.metalPrice.upsert({
      where: { date_metalType: { date: today, metalType } },
      create: { date: today, metalType, pricePerGram, setBy: session.userId },
      update: { pricePerGram, setBy: session.userId },
    });

    return NextResponse.json(record);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

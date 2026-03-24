import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/repairs?branchId=&status=&page=1&limit=20
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : undefined;
  const status = sp.get("status") || undefined;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(50, parseInt(sp.get("limit") || "20"));

  const effectiveBranchId =
    session.role === "branch" ? session.branchId : branchId;

  const where = {
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(status ? { status } : {}),
  };

  const [repairs, total] = await Promise.all([
    prisma.repair.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        employee: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.repair.count({ where }),
  ]);

  return NextResponse.json({ repairs, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/repairs
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName, customerPhone = "",
      customerId: existingCustomerId,
      employeeId,
      itemDescription,
      receivedCondition = "",
      estimatedCost = 0,
      estimatedReady,
      notes = "",
    } = body;

    const branchId =
      session.role === "branch" ? session.branchId! : parseInt(body.branchId);
    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    if (!itemDescription?.trim()) return NextResponse.json({ error: "itemDescription required" }, { status: 400 });

    // Resolve customer
    let customerId: number | null = existingCustomerId || null;
    if (!customerId && customerName?.trim()) {
      const customer = await prisma.customer.create({
        data: { name: customerName.trim(), phone: customerPhone },
      });
      customerId = customer.id;
    }

    const repair = await prisma.repair.create({
      data: {
        branchId,
        customerId,
        employeeId: employeeId || null,
        itemDescription: itemDescription.trim(),
        receivedCondition,
        estimatedCost,
        estimatedReady: estimatedReady ? new Date(estimatedReady) : null,
        notes,
        status: "received",
        statusLogs: {
          create: [{
            status: "received",
            note: "تم استلام القطعة",
            changedBy: session.userId,
          }],
        },
      },
      include: {
        customer: true,
        employee: { select: { name: true } },
        branch: { select: { name: true } },
        statusLogs: true,
      },
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/repairs]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

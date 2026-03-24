import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/customers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = parseInt(id);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: {
        include: {
          saleItems: {
            include: {
              jewelryItem: {
                select: { sku: true, category: true, karat: true },
              },
            },
          },
          employee: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      repairs: {
        include: {
          employee: { select: { name: true } },
        },
        orderBy: { receivedAt: "desc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Compute stats
  const totalSales = customer.sales.length;
  const totalSpent = customer.sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalRepairs = customer.repairs.length;

  let lastVisit: string | null = null;
  const allDates: Date[] = [
    ...customer.sales.map((s) => new Date(s.createdAt)),
    ...customer.repairs.map((r) => new Date(r.receivedAt)),
  ];
  if (allDates.length > 0) {
    lastVisit = allDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString();
  }

  const salesOut = customer.sales.map((sale) => ({
    id: sale.id,
    invoiceNum: sale.invoiceNum,
    totalAmount: sale.totalAmount,
    discountAmount: sale.discountAmount,
    paymentMethod: sale.paymentMethod,
    createdAt: sale.createdAt,
    employeeName: sale.employee?.name ?? null,
    items: sale.saleItems.map((si) => ({
      sku: si.jewelryItem.sku,
      category: si.jewelryItem.category,
      karat: si.jewelryItem.karat,
      price: si.price,
      discount: si.discount,
    })),
  }));

  const repairsOut = customer.repairs.map((r) => ({
    id: r.id,
    itemDescription: r.itemDescription,
    status: r.status,
    estimatedCost: r.estimatedCost,
    actualCost: r.actualCost,
    receivedAt: r.receivedAt,
    deliveredAt: r.deliveredAt ?? null,
    employeeName: r.employee?.name ?? null,
  }));

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    vatNumber: customer.vatNumber,
    notes: customer.notes,
    stats: { totalSales, totalSpent, totalRepairs, lastVisit },
    sales: salesOut,
    repairs: repairsOut,
  });
}

// PATCH /api/customers/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role === "viewer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const { name, phone, vatNumber, notes } = await req.json();
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/customers/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.customer.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

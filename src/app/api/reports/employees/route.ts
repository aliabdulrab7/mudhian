import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Barcode prefix → category
function detectCategory(barcode: string): string {
  const b = barcode.trim().toUpperCase();
  if (b.startsWith("RNG")) return "خاتم";
  if (b.startsWith("BRL")) return "سواره";
  if (b.startsWith("NKL") || b.startsWith("PND")) return "عقد";
  if (b.startsWith("EAR")) return "حلق";
  if (b.startsWith("FSET")) return "طقم";
  return "أخرى";
}

// GET /api/reports/employees?branchId=X&year=Y&month=M
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") ? parseInt(sp.get("branchId")!) : null;
  const year = parseInt(sp.get("year") || String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") || String(new Date().getMonth() + 1));

  if (session.role === "branch" && branchId !== session.branchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  // Fetch all invoices in range (joined with drawer for date filter)
  const drawers = await prisma.dailyDrawer.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      date: { gte: start, lt: end },
    },
    select: {
      invoices: {
        select: {
          id: true, type: true, price: true, employeeId: true, employeeName: true, barcodes: true,
        },
      },
    },
  });

  const allInvoices = drawers.flatMap((d) => d.invoices);

  // Group by employeeId (null → "غير محدد")
  type EmpStats = {
    employeeId: number | null;
    employeeName: string;
    invoiceCount: number;
    totalSales: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };

  const map = new Map<string, EmpStats>();

  for (const inv of allInvoices) {
    const key = inv.employeeId != null ? String(inv.employeeId) : "unknown";
    if (!map.has(key)) {
      map.set(key, {
        employeeId: inv.employeeId,
        employeeName: inv.employeeName || "غير محدد",
        invoiceCount: 0,
        totalSales: 0,
        byType: {},
        byCategory: {},
      });
    }
    const stats = map.get(key)!;
    stats.invoiceCount++;
    stats.totalSales += inv.price;
    stats.byType[inv.type] = (stats.byType[inv.type] ?? 0) + 1;

    let barcodes: string[] = [];
    try { barcodes = JSON.parse(inv.barcodes); } catch { /* ignore */ }
    for (const bc of barcodes) {
      const cat = detectCategory(bc);
      stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;
    }
  }

  // Fetch employee names for ids found in map
  const empIds = [...map.keys()].filter((k) => k !== "unknown").map(Number);
  const employees = empIds.length > 0
    ? await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true } })
    : [];
  const empNameMap = new Map(employees.map((e) => [e.id, e.name]));

  const result = [...map.values()].map((s) => ({
    ...s,
    employeeName: s.employeeId != null ? (empNameMap.get(s.employeeId) ?? s.employeeName) : "غير محدد",
  })).sort((a, b) => b.totalSales - a.totalSales);

  return NextResponse.json(result);
}

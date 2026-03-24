import { prisma } from "@/lib/prisma";

const CATEGORY_PREFIX: Record<string, string> = {
  خاتم: "RNG",
  سواره: "BRL",
  عقد: "NKL",
  حلق: "EAR",
  طقم: "FSET",
  صيانة: "REP",
  أخرى: "ITM",
};

export function getCategoryPrefix(category: string): string {
  return CATEGORY_PREFIX[category] ?? "ITM";
}

export async function generateSKU(category: string): Promise<string> {
  const prefix = getCategoryPrefix(category);

  // Find the highest existing SKU number for this prefix
  const latest = await prisma.jewelryItem.findFirst({
    where: { sku: { startsWith: prefix + "-" } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  let next = 1;
  if (latest) {
    const parts = latest.sku.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export async function generateBarcode(sku: string): Promise<string> {
  return sku; // barcode = SKU for simplicity; can be overridden later
}

export function detectBarcodeType(barcode: string): string {
  const b = barcode.trim().toUpperCase();
  if (b.startsWith("RNG"))  return "خاتم";
  if (b.startsWith("BRL"))  return "سواره";
  if (b.startsWith("NKL") || b.startsWith("PND")) return "عقد";
  if (b.startsWith("EAR"))  return "حلق";
  if (b.startsWith("FSET")) return "طقم";
  return "";
}

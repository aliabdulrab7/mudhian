/**
 * Double-Entry GL — posting utilities for the Mudhian ERP accounting engine.
 * All monetary values in SAR. VAT = 15% included in sale prices.
 */
import { prisma as _prisma } from "./prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

// ── Standard account codes (COA) ────────────────────────────────
export const COA = {
  CASH:              "1011",
  CARD_TRANSFER:     "1019",
  GOLD_INVENTORY:    "1030",
  DIAMOND_INVENTORY: "1031",
  SILVER_INVENTORY:  "1032",
  VAT_PAYABLE:       "2020",
  SALES_GOLD:        "4010",
  SALES_DIAMOND:     "4020",
  SALES_REPAIR:      "4030",
  COGS_GOLD:         "5010",
  COGS_DIAMOND:      "5020",
} as const;

export interface GLLine {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
  branchId?: number;
}

// ── Helper ────────────────────────────────────────────────────────
function r2(n: number) { return Math.round(n * 100) / 100; }

async function nextEntryNum(): Promise<string> {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `JE-${d}-`;
  const latest = await prisma.journalEntry.findFirst({
    where: { entryNum: { startsWith: prefix } },
    orderBy: { entryNum: "desc" },
    select: { entryNum: true },
  });
  const seq = latest ? (parseInt(latest.entryNum.split("-").pop() ?? "0") + 1) : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ── Core posting function ────────────────────────────────────────
/**
 * Post a balanced journal entry to the GL.
 * Returns null silently if COA accounts are missing (prevents breaking the main transaction).
 */
export async function postEntry(opts: {
  date: Date;
  description: string;
  ref: string;
  type: "manual" | "sale" | "refund" | "purchase" | "payroll" | "adjustment";
  branchId?: number;
  postedBy: number;
  lines: GLLine[];
}) {
  const { date, description, ref, type, branchId, postedBy, lines } = opts;

  // Validate balance
  const totalDebit = r2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = r2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error(`[GL] Unbalanced entry: Dr ${totalDebit} ≠ Cr ${totalCredit} — ref: ${ref}`);
    return null;
  }

  // Look up account IDs by code
  const codes = [...new Set(lines.map((l) => l.accountCode))];
  const accounts = await prisma.account.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  });
  const accountMap = Object.fromEntries(accounts.map((a: { code: string; id: number }) => [a.code, a.id]));
  const missing = codes.filter((c) => !accountMap[c]);
  if (missing.length > 0) {
    console.warn(`[GL] Accounts not found: ${missing.join(", ")} — skipping entry for ref: ${ref}`);
    return null;
  }

  const entryNum = await nextEntryNum();
  return await prisma.journalEntry.create({
    data: {
      entryNum,
      date,
      description,
      ref,
      type,
      status: "posted",
      branchId: branchId ?? null,
      postedBy,
      lines: {
        create: lines.map((l) => ({
          accountId: accountMap[l.accountCode],
          debit: r2(l.debit),
          credit: r2(l.credit),
          description: l.description ?? "",
          branchId: l.branchId ?? branchId ?? null,
        })),
      },
    },
  });
}

// ── Sale GL lines builder ────────────────────────────────────────
export function buildSaleLines(opts: {
  totalAmount: number;
  paymentMethod: string;
  branchId: number;
  invoiceNum: string;
  itemCosts: number;       // sum of costAtSale for all items
  metalType?: string;      // gold | diamond | silver
}): GLLine[] {
  const { totalAmount, paymentMethod, branchId, invoiceNum, itemCosts, metalType = "gold" } = opts;

  const vatRate = 0.15;
  const baseAmount = r2(totalAmount / (1 + vatRate));
  const vatAmount = r2(totalAmount - baseAmount);

  const debitAcc = paymentMethod === "cash" ? COA.CASH : COA.CARD_TRANSFER;
  const revenueAcc = metalType === "diamond" ? COA.SALES_DIAMOND : COA.SALES_GOLD;
  const inventoryAcc = metalType === "diamond" ? COA.DIAMOND_INVENTORY :
                       metalType === "silver" ? COA.SILVER_INVENTORY : COA.GOLD_INVENTORY;
  const cogsAcc = metalType === "diamond" ? COA.COGS_DIAMOND : COA.COGS_GOLD;

  const lines: GLLine[] = [
    { accountCode: debitAcc,        debit: r2(totalAmount), credit: 0,             description: `مبيعات ${invoiceNum}`, branchId },
    { accountCode: revenueAcc,      debit: 0,               credit: baseAmount,    description: `إيرادات ${invoiceNum}`, branchId },
    { accountCode: COA.VAT_PAYABLE, debit: 0,               credit: vatAmount,     description: `ضريبة 15% ${invoiceNum}`, branchId },
  ];

  if (itemCosts > 0) {
    lines.push(
      { accountCode: cogsAcc,      debit: r2(itemCosts), credit: 0,            description: `تكلفة المبيعات ${invoiceNum}`, branchId },
      { accountCode: inventoryAcc, debit: 0,             credit: r2(itemCosts), description: `إخراج مخزون ${invoiceNum}`, branchId }
    );
  }

  return lines;
}

// ── Refund GL lines (reverse the original sale entry) ────────────
export function buildRefundLines(opts: {
  totalAmount: number;
  paymentMethod: string;
  branchId: number;
  invoiceNum: string;
  itemCosts: number;
  metalType?: string;
}): GLLine[] {
  // Reversal = swap debit/credit from original sale lines
  return buildSaleLines(opts).map((l) => ({
    ...l,
    debit: l.credit,
    credit: l.debit,
    description: l.description?.replace("مبيعات", "مرتجع").replace("إيرادات", "إلغاء إيرادات").replace("تكلفة المبيعات", "إعادة تكلفة").replace("إخراج مخزون", "إعادة مخزون"),
  }));
}

// ── COA seed data ────────────────────────────────────────────────
export const DEFAULT_COA = [
  // Assets
  { code: "1000", nameAr: "الأصول",                      nameEn: "Assets",                    type: "asset",     parentCode: "" },
  { code: "1010", nameAr: "النقدية والأرصدة البنكية",    nameEn: "Cash and Banks",            type: "asset",     parentCode: "1000" },
  { code: "1011", nameAr: "الصندوق (نقدي)",              nameEn: "Cash in Hand",              type: "asset",     parentCode: "1010" },
  { code: "1012", nameAr: "البنك - الإنماء",             nameEn: "Bank - Al-Inma",            type: "asset",     parentCode: "1010" },
  { code: "1013", nameAr: "البنك - الراجحي",             nameEn: "Bank - Al-Rajhi",           type: "asset",     parentCode: "1010" },
  { code: "1014", nameAr: "البنك - الرياض",              nameEn: "Bank - Al-Riyad",           type: "asset",     parentCode: "1010" },
  { code: "1015", nameAr: "البنك - ساب",                 nameEn: "Bank - SAB",                type: "asset",     parentCode: "1010" },
  { code: "1016", nameAr: "البنك - الأهلي",              nameEn: "Bank - Al-Ahli",            type: "asset",     parentCode: "1010" },
  { code: "1019", nameAr: "مبيعات إلكترونية (شبكة/تحويل)", nameEn: "Card / Transfer Float", type: "asset",     parentCode: "1010" },
  { code: "1020", nameAr: "ذمم مدينة (عملاء)",          nameEn: "Accounts Receivable",       type: "asset",     parentCode: "1000" },
  { code: "1030", nameAr: "مخزون - ذهب",                 nameEn: "Gold Inventory",            type: "asset",     parentCode: "1000" },
  { code: "1031", nameAr: "مخزون - ألماس",               nameEn: "Diamond Inventory",         type: "asset",     parentCode: "1000" },
  { code: "1032", nameAr: "مخزون - فضة",                 nameEn: "Silver Inventory",          type: "asset",     parentCode: "1000" },
  { code: "1040", nameAr: "مصروفات مدفوعة مسبقاً",      nameEn: "Prepaid Expenses",          type: "asset",     parentCode: "1000" },
  { code: "1100", nameAr: "الأصول الثابتة",              nameEn: "Fixed Assets",              type: "asset",     parentCode: "1000" },
  { code: "1110", nameAr: "أثاث ومعدات",                 nameEn: "Furniture & Equipment",     type: "asset",     parentCode: "1100" },
  // Liabilities
  { code: "2000", nameAr: "الالتزامات",                  nameEn: "Liabilities",               type: "liability", parentCode: "" },
  { code: "2010", nameAr: "ذمم دائنة - موردون",          nameEn: "Accounts Payable",          type: "liability", parentCode: "2000" },
  { code: "2020", nameAr: "ضريبة القيمة المضافة",        nameEn: "VAT Payable",               type: "liability", parentCode: "2000" },
  { code: "2021", nameAr: "ضريبة القيمة المضافة (مدخلات)", nameEn: "Input VAT",              type: "liability", parentCode: "2000" },
  { code: "2030", nameAr: "رواتب مستحقة الدفع",          nameEn: "Accrued Salaries",          type: "liability", parentCode: "2000" },
  { code: "2040", nameAr: "عرابين مستلمة",               nameEn: "Customer Deposits",         type: "liability", parentCode: "2000" },
  // Equity
  { code: "3000", nameAr: "حقوق الملكية",                nameEn: "Owner's Equity",            type: "equity",    parentCode: "" },
  { code: "3010", nameAr: "رأس المال",                   nameEn: "Capital",                   type: "equity",    parentCode: "3000" },
  { code: "3020", nameAr: "أرباح محتجزة",                nameEn: "Retained Earnings",         type: "equity",    parentCode: "3000" },
  // Revenue
  { code: "4000", nameAr: "الإيرادات",                   nameEn: "Revenue",                   type: "revenue",   parentCode: "" },
  { code: "4010", nameAr: "مبيعات الذهب",                nameEn: "Gold Sales",                type: "revenue",   parentCode: "4000" },
  { code: "4020", nameAr: "مبيعات الألماس",              nameEn: "Diamond Sales",             type: "revenue",   parentCode: "4000" },
  { code: "4030", nameAr: "إيرادات الصيانة",             nameEn: "Repair Revenue",            type: "revenue",   parentCode: "4000" },
  { code: "4040", nameAr: "إيرادات أخرى",                nameEn: "Other Revenue",             type: "revenue",   parentCode: "4000" },
  // COGS
  { code: "5000", nameAr: "تكلفة المبيعات",              nameEn: "Cost of Goods Sold",        type: "expense",   parentCode: "" },
  { code: "5010", nameAr: "تكلفة مبيعات الذهب",          nameEn: "Gold COGS",                 type: "expense",   parentCode: "5000" },
  { code: "5020", nameAr: "تكلفة مبيعات الألماس",        nameEn: "Diamond COGS",              type: "expense",   parentCode: "5000" },
  // Operating Expenses
  { code: "6000", nameAr: "المصروفات التشغيلية",         nameEn: "Operating Expenses",        type: "expense",   parentCode: "" },
  { code: "6010", nameAr: "رواتب وأجور",                 nameEn: "Salaries & Wages",          type: "expense",   parentCode: "6000" },
  { code: "6020", nameAr: "إيجار المحلات",               nameEn: "Rent",                      type: "expense",   parentCode: "6000" },
  { code: "6030", nameAr: "خدمات (كهرباء، ماء، إنترنت)", nameEn: "Utilities",                type: "expense",   parentCode: "6000" },
  { code: "6040", nameAr: "تسويق وإعلان",                nameEn: "Marketing & Advertising",   type: "expense",   parentCode: "6000" },
  { code: "6050", nameAr: "مصروفات أخرى",                nameEn: "Other Expenses",            type: "expense",   parentCode: "6000" },
];

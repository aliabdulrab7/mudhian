"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Banknote, Wallet, BookOpen, Package, Users, Download, Wrench, ShoppingCart, DollarSign } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { downloadCSV } from "@/lib/utils";

const CATEGORIES = ["طقم", "خاتم", "حلق", "اسوارة", "تعليقة", "نص طقم"];
const BANKS = ["الانماء", "الراجحي", "الرياض", "ساب", "الاهلي"];
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

interface BranchReport {
  branch: { id: number; name: string; branchNum: string };
  daysCount: number;
  totalSales: number; bankTotal: number; cashSales: number;
  bookBalance: number; actualBalance: number;
  avgDailySales: number; soldItemsTotal: number;
  soldItemsByCategory: Record<string, number>;
  banksByName: Record<string, number>;
}

interface ReportData {
  branches: BranchReport[];
  globalBankTotals: Record<string, number>;
  globalBankTotal: number;
}

interface EmployeeReport {
  employeeId: number | null;
  employeeName: string;
  invoiceCount: number;
  totalSales: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

type TabType = "summary" | "items" | "banks" | "employees" | "inventory" | "sales" | "repairs" | "profit";

export default function ReportsPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("summary");

  // Employee reports state
  const [empData, setEmpData] = useState<EmployeeReport[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empBranchId, setEmpBranchId] = useState<string>("");

  // Inventory report state
  interface InventoryBranch {
    branch: { id: number; name: string };
    availableCount: number; soldCount: number;
    availableValue: number; soldValue: number;
    byCategory: Record<string, { count: number; value: number }>;
  }
  const [invData, setInvData] = useState<{ branches: InventoryBranch[]; totals: { availableCount: number; soldCount: number; availableValue: number; soldValue: number } } | null>(null);
  const [invLoading, setInvLoading] = useState(false);

  // POS Sales report state
  interface SalesBranch { branchId: number; branchName: string; saleCount: number; totalAmount: number; byPayment: Record<string, number>; }
  interface SalesEmployee { employeeId: number | null; employeeName: string; saleCount: number; totalAmount: number; }
  const [salesData, setSalesData] = useState<{ saleCount: number; totalAmount: number; byBranch: SalesBranch[]; byEmployee: SalesEmployee[] } | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  // Repairs report state
  interface RepairsBranch { branchId: number; branchName: string; total: number; overdue: number; revenue: number; statusCounts: Record<string, number>; }
  const [repairsData, setRepairsData] = useState<{ total: number; overdue: number; totalRevenue: number; avgRepairCost: number | null; avgTurnaroundDays: number | null; statusCounts: Record<string, number>; byBranch: RepairsBranch[] } | null>(null);
  const [repairsLoading, setRepairsLoading] = useState(false);

  // Profit report state
  interface ProfitCategory { category: string; count: number; revenue: number; cost: number; profit: number; marginPct: number; }
  interface ProfitKarat { karat: number; count: number; revenue: number; cost: number; profit: number; marginPct: number; }
  interface ProfitBranch { branchId: number; branchName: string; count: number; revenue: number; cost: number; profit: number; marginPct: number; }
  interface ProfitItem { sku: string; category: string; karat: number; salePrice: number; cost: number; profit: number; marginPct: number; soldAt: string | null; }
  interface ProfitData {
    summary: { totalRevenue: number; totalCost: number; grossProfit: number; avgMarginPct: number; soldItemsCount: number };
    byCategory: ProfitCategory[];
    byKarat: ProfitKarat[];
    byBranch: ProfitBranch[];
    topItems: ProfitItem[];
  }
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [profitLoading, setProfitLoading] = useState(false);
  const [profitBranchId, setProfitBranchId] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchEmpData = useCallback(async () => {
    setEmpLoading(true);
    const branchParam = empBranchId ? `&branchId=${empBranchId}` : "";
    const res = await fetch(`/api/reports/employees?year=${year}&month=${month}${branchParam}`);
    if (res.ok) setEmpData(await res.json());
    else setEmpData([]);
    setEmpLoading(false);
  }, [year, month, empBranchId]);

  useEffect(() => { if (tab === "employees") fetchEmpData(); }, [tab, fetchEmpData]);

  const fetchInvData = useCallback(async () => {
    setInvLoading(true);
    const res = await fetch("/api/reports/inventory");
    if (res.ok) setInvData(await res.json());
    setInvLoading(false);
  }, []);

  const fetchSalesData = useCallback(async () => {
    setSalesLoading(true);
    const res = await fetch(`/api/reports/sales?year=${year}&month=${month}`);
    if (res.ok) setSalesData(await res.json());
    setSalesLoading(false);
  }, [year, month]);

  const fetchRepairsData = useCallback(async () => {
    setRepairsLoading(true);
    const res = await fetch("/api/reports/repairs");
    if (res.ok) setRepairsData(await res.json());
    setRepairsLoading(false);
  }, []);

  const fetchProfitData = useCallback(async () => {
    setProfitLoading(true);
    const branchParam = profitBranchId ? `&branchId=${profitBranchId}` : "";
    const res = await fetch(`/api/reports/profit?year=${year}&month=${month}${branchParam}`);
    if (res.ok) setProfitData(await res.json());
    else setProfitData(null);
    setProfitLoading(false);
  }, [year, month, profitBranchId]);

  useEffect(() => { if (tab === "inventory") fetchInvData(); }, [tab, fetchInvData]);
  useEffect(() => { if (tab === "sales") fetchSalesData(); }, [tab, fetchSalesData]);
  useEffect(() => { if (tab === "repairs") fetchRepairsData(); }, [tab, fetchRepairsData]);
  useEffect(() => { if (tab === "profit") fetchProfitData(); }, [tab, fetchProfitData]);

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const active = data?.branches.filter((r) => r.daysCount > 0) ?? [];
  const totals = active.reduce((acc, r) => ({
    totalSales: acc.totalSales + r.totalSales,
    bankTotal: acc.bankTotal + r.bankTotal,
    cashSales: acc.cashSales + r.cashSales,
    bookBalance: acc.bookBalance + r.bookBalance,
    soldItemsTotal: acc.soldItemsTotal + r.soldItemsTotal,
  }), { totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0, soldItemsTotal: 0 });

  const topBranch = active.length > 0 ? active.reduce((best, r) => r.totalSales > best.totalSales ? r : best, active[0]) : null;

  const exportSummaryCSV = () => {
    const rows = (data?.branches ?? []).filter((r) => r.daysCount > 0).map((r) => ({
      "الفرع": r.branch.name,
      "الأيام": r.daysCount,
      "إجمالي المبيعات": r.totalSales,
      "الحوالات": r.bankTotal,
      "الكاش": r.cashSales,
      "رصيد الدرج": r.bookBalance,
      "الأصناف": r.soldItemsTotal,
      "متوسط يومي": Math.round(r.avgDailySales),
    }));
    downloadCSV(rows, `تقرير-${year}-${MONTHS[month - 1]}.csv`);
  };

  const exportEmployeesCSV = () => {
    const rows = empData.map((r) => ({
      "الموظف": r.employeeName,
      "عدد الفواتير": r.invoiceCount,
      "إجمالي المبيعات": r.totalSales,
      "فواتير عادية": r.byType["عادية"] ?? 0,
      "فواتير صميت": r.byType["صميت"] ?? 0,
    }));
    downloadCSV(rows, `موظفين-${year}-${MONTHS[month - 1]}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronRight size={18} /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronLeft size={18} /></button>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">التقارير الشهرية</span>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && active.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: <TrendingUp size={16} />, label: "إجمالي المبيعات", value: fmt(totals.totalSales), color: "emerald" },
            { icon: <Banknote size={16} />, label: "إجمالي الحوالات", value: fmt(totals.bankTotal), color: "blue" },
            { icon: <Wallet size={16} />, label: "إجمالي الكاش", value: fmt(totals.cashSales), color: "violet" },
            { icon: <BookOpen size={16} />, label: "إجمالي رصيد الدرج", value: fmt(totals.bookBalance), color: "rose" },
            { icon: <Package size={16} />, label: "إجمالي الأصناف", value: `${totals.soldItemsTotal} قطعة`, color: "amber" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className={`rounded-2xl border p-4 ${
              color === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : color === "blue" ? "bg-blue-50 border-blue-100 text-blue-700"
              : color === "violet" ? "bg-violet-50 border-violet-100 text-violet-700"
              : color === "amber" ? "bg-amber-50 border-amber-100 text-amber-700"
              : "bg-rose-50 border-rose-100 text-rose-700"
            }`}>
              <div className="flex items-center gap-1.5 mb-2 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
              <p className="text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top Branch */}
      {!loading && topBranch && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-500 text-lg">🏆</span>
          <div>
            <p className="text-xs text-amber-600 font-medium">أعلى فرع مبيعات هذا الشهر</p>
            <p className="text-sm font-black text-amber-800">{topBranch.branch.name} — {fmt(topBranch.totalSales)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {([["summary", "ملخص الفروع"], ["items", "مقارنة الأصناف"], ["banks", "تفصيل البنوك"]] as [TabType, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === key ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
        <button onClick={() => setTab("employees")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "employees" ? "bg-white shadow-sm text-teal-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Users size={13} /> الموظفون
        </button>
        <button onClick={() => setTab("inventory")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "inventory" ? "bg-white shadow-sm text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Package size={13} /> المخزون
        </button>
        <button onClick={() => setTab("sales")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "sales" ? "bg-white shadow-sm text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}>
          <ShoppingCart size={13} /> المبيعات
        </button>
        <button onClick={() => setTab("repairs")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "repairs" ? "bg-white shadow-sm text-orange-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Wrench size={13} /> الصيانة
        </button>
        <button onClick={() => setTab("profit")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "profit" ? "bg-white shadow-sm text-green-700" : "text-slate-500 hover:text-slate-700"}`}>
          <TrendingUp size={13} /> الأرباح
        </button>
      </div>

      {/* Tab: Summary */}
      {tab === "summary" && (!loading && active.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
          <div className="text-center py-16 text-slate-400 text-sm">لا توجد بيانات لهذا الشهر</div>
        </div>
      ) : (
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
          ) : (
            <>
            {active.length > 0 && (
              <div className="px-5 py-3 border-b border-slate-50 flex justify-end">
                <button onClick={exportSummaryCSV}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition">
                  <Download size={13} /> CSV
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["الفرع","الأيام","إجمالي المبيعات","الحوالات","الكاش","رصيد الدرج","الأصناف","متوسط يومي",""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.branches ?? []).map((row) => (
                    <tr key={row.branch.id} className={`transition ${row.daysCount === 0 ? "opacity-40" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {row.branch.name}
                        {row.branch.id === topBranch?.branch.id && row.daysCount > 0 && <span className="mr-1 text-amber-500 text-xs">🏆</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.daysCount > 0 ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-500"}`}>
                          {row.daysCount > 0 ? `${row.daysCount} يوم` : "لا يوجد"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold">{row.daysCount > 0 ? fmt(row.totalSales) : "—"}</td>
                      <td className="px-4 py-3 text-blue-600">{row.daysCount > 0 ? fmt(row.bankTotal) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.daysCount > 0 ? fmt(row.cashSales) : "—"}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold">{row.daysCount > 0 ? fmt(row.bookBalance) : "—"}</td>
                      <td className="px-4 py-3 text-amber-700 font-semibold">{row.daysCount > 0 ? `${row.soldItemsTotal} قطعة` : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{row.daysCount > 0 ? fmt(row.avgDailySales) : "—"}</td>
                      <td className="px-4 py-3">
                        {row.daysCount > 0 && (
                          <button onClick={() => router.push(`/branch/${row.branch.id}/archive`)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium hover:underline">أرشيف →</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {active.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي ({active.length} فروع)</td>
                      <td></td>
                      <td className="px-4 py-3 text-emerald-700 font-bold text-xs">{fmt(totals.totalSales)}</td>
                      <td className="px-4 py-3 text-blue-600 font-bold text-xs">{fmt(totals.bankTotal)}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold text-xs">{fmt(totals.cashSales)}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold text-xs">{fmt(totals.bookBalance)}</td>
                      <td className="px-4 py-3 text-amber-700 font-bold text-xs">{totals.soldItemsTotal} قطعة</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            </>
          )}
        </div>
      ))}

      {/* Tab: Items comparison */}
      {tab === "items" && data && (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الفرع</th>
                  {CATEGORIES.map((c) => (
                    <th key={c} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 whitespace-nowrap">{c}</th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.branches.map((row) => (
                  <tr key={row.branch.id} className={`hover:bg-slate-50 transition ${row.daysCount === 0 ? "opacity-40" : ""}`}>
                    <td className="px-4 py-3 font-bold text-slate-800">{row.branch.name}</td>
                    {CATEGORIES.map((c) => {
                      const qty = row.soldItemsByCategory[c] ?? 0;
                      const isTop = active.length > 1 && qty > 0 && qty === Math.max(...active.map((r) => r.soldItemsByCategory[c] ?? 0));
                      return (
                        <td key={c} className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${isTop ? "text-emerald-600" : "text-slate-700"}`}>
                            {qty > 0 ? qty : <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-black text-amber-700">{row.soldItemsTotal}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                  {CATEGORIES.map((c) => {
                    const total = active.reduce((s, r) => s + (r.soldItemsByCategory[c] ?? 0), 0);
                    return (
                      <td key={c} className="px-3 py-3 text-center text-xs font-bold text-slate-700">{total > 0 ? total : "—"}</td>
                    );
                  })}
                  <td className="px-3 py-3 text-center text-xs font-black text-amber-700">{totals.soldItemsTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">الرقم الأخضر = أعلى فرع في هذا الصنف</p>
        </div>
      )}

      {/* Tab: Banks */}
      {tab === "banks" && data && (
        <div className="space-y-4">
          {/* Global bank totals */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">إجمالي كل بنك — جميع الفروع</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              {BANKS.map((bank) => {
                const amount = data.globalBankTotals[bank] ?? 0;
                const pct = data.globalBankTotal > 0 ? (amount / data.globalBankTotal) * 100 : 0;
                return (
                  <div key={bank} className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">{bank}</p>
                    <p className="text-base font-black text-blue-800">{fmt(amount)}</p>
                    <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-blue-500 mt-1 font-medium">{pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per branch bank table */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">تفصيل الحوالات لكل فرع</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الفرع</th>
                    {BANKS.map((b) => (
                      <th key={b} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 whitespace-nowrap">{b}</th>
                    ))}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.branches ?? []).map((row) => (
                    <tr key={row.branch.id} className={`hover:bg-slate-50 transition ${row.daysCount === 0 ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.branch.name}</td>
                      {BANKS.map((b) => {
                        const amt = row.banksByName[b] ?? 0;
                        const pct = row.bankTotal > 0 ? (amt / row.bankTotal) * 100 : 0;
                        return (
                          <td key={b} className="px-3 py-2 text-center">
                            {amt > 0 ? (
                              <div>
                                <p className="text-xs font-bold text-blue-700">{fmt(amt)}</p>
                                <p className="text-xs text-slate-400">{pct.toFixed(0)}%</p>
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-black text-blue-700 text-xs">{fmt(row.bankTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                    {BANKS.map((b) => (
                      <td key={b} className="px-3 py-3 text-center text-xs font-bold text-blue-700">
                        {fmt(data.globalBankTotals[b] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center text-xs font-black text-blue-800">{fmt(data.globalBankTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Tab: Employees */}
      {tab === "employees" && (
        <div className="space-y-4">
          {/* Branch filter */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] p-4 flex items-center gap-3">
            <Users size={15} className="text-teal-600 flex-shrink-0" />
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">الفرع:</label>
            <select value={empBranchId} onChange={(e) => setEmpBranchId(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white max-w-xs">
              <option value="">جميع الفروع</option>
              {(data?.branches ?? []).map((r) => (
                <option key={r.branch.id} value={r.branch.id}>{r.branch.name}</option>
              ))}
            </select>
          </div>

          <div className={CARD}>
            {empLoading ? (
              <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
            ) : empData.length === 0 ? (
              <div className="text-center py-16">
                <Users size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">لا توجد فواتير موظفين لهذا الشهر</p>
              </div>
            ) : (
              <>
              <div className="px-5 py-3 border-b border-slate-50 flex justify-end">
                <button onClick={exportEmployeesCSV}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition">
                  <Download size={13} /> CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["الموظف", "عدد الفواتير", "إجمالي المبيعات", "عادية", "صميت", "الأصناف"].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empData.map((row) => (
                      <tr key={row.employeeId ?? "unknown"} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {row.employeeName}
                          {row.employeeId == null && (
                            <span className="mr-1.5 text-xs text-slate-400 font-normal">غير محدد</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {row.invoiceCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(row.totalSales)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {row.byType["عادية"] ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {row.byType["صميت"] ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(row.byCategory).map(([cat, count]) => (
                              <span key={cat} className="text-xs text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
                                {cat}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي ({empData.length} موظف)</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {empData.reduce((s, r) => s + r.invoiceCount, 0)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700">
                        {fmt(empData.reduce((s, r) => s + r.totalSales, 0))}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Inventory */}
      {tab === "inventory" && (
        <div className="space-y-4" dir="rtl">
          {invLoading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">جاري التحميل...</div>
          ) : !invData ? null : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "إجمالي القطع", value: invData.branches.reduce((s, b) => s + b.availableCount + b.soldCount, 0), sub: "قطعة", color: "blue" },
                  { label: "قيمة المخزون", value: fmt(invData.totals.availableValue), sub: "", color: "violet" },
                  { label: "قطع متاحة", value: invData.totals.availableCount, sub: "قطعة", color: "emerald" },
                  { label: "قطع مباعة", value: invData.totals.soldCount, sub: "قطعة", color: "rose" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className={`rounded-2xl border p-4 ${
                    color === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : color === "blue" ? "bg-blue-50 border-blue-100 text-blue-700"
                    : color === "violet" ? "bg-violet-50 border-violet-100 text-violet-700"
                    : "bg-rose-50 border-rose-100 text-rose-700"
                  }`}>
                    <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
                    <p className="text-xl font-black">{value} <span className="text-sm font-normal opacity-60">{sub}</span></p>
                  </div>
                ))}
              </div>

              {/* Category Breakdown Bars */}
              {(() => {
                const catTotals: Record<string, { count: number; value: number }> = {};
                for (const b of invData.branches) {
                  for (const [cat, data] of Object.entries(b.byCategory)) {
                    if (!catTotals[cat]) catTotals[cat] = { count: 0, value: 0 };
                    catTotals[cat].count += data.count;
                    catTotals[cat].value += data.value;
                  }
                }
                const maxCount = Math.max(...Object.values(catTotals).map((c) => c.count), 1);
                const entries = Object.entries(catTotals).sort((a, b) => b[1].count - a[1].count);
                if (entries.length === 0) return null;
                return (
                  <div className={CARD}>
                    <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-violet-600" />
                        <h3 className="text-sm font-bold text-slate-700">توزيع المخزون المتاح بالتصنيف</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {entries.map(([cat, d]) => {
                        const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700">{cat}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">{fmt(d.value)}</span>
                                <span className="text-xs font-bold text-violet-700 min-w-[3rem] text-left">{d.count} قطعة</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Category Table */}
              {(() => {
                const catTotals: Record<string, { available: number; sold: number; value: number }> = {};
                for (const b of invData.branches) {
                  for (const [cat, d] of Object.entries(b.byCategory)) {
                    if (!catTotals[cat]) catTotals[cat] = { available: 0, sold: 0, value: 0 };
                    catTotals[cat].available += d.count;
                    catTotals[cat].value += d.value;
                  }
                }
                // soldCount is only on totals, not by category — show what we have
                const entries = Object.entries(catTotals).sort((a, b) => b[1].available - a[1].available);
                if (entries.length === 0) return null;
                return (
                  <div className={CARD}>
                    <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <h3 className="text-sm font-bold text-slate-700">تفصيل الأصناف</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {["الصنف", "متاح", "القيمة الإجمالية", "متوسط السعر"].map((h, i) => (
                              <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entries.map(([cat, d]) => (
                            <tr key={cat} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 font-bold text-slate-800">{cat}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{d.available}</span>
                              </td>
                              <td className="px-4 py-3 text-violet-700 font-bold">{fmt(d.value)}</td>
                              <td className="px-4 py-3 text-slate-600 text-xs">{d.available > 0 ? fmt(Math.round(d.value / d.available)) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* By Branch */}
              <div className={CARD}>
                <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <h3 className="text-sm font-bold text-slate-700">تقييم المخزون حسب الفرع</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["الفرع", "متاح", "مباع", "قيمة المتاح", "قيمة المباع"].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invData.branches.map((row) => (
                        <tr key={row.branch.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">{row.branch.name}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">{row.availableCount}</td>
                          <td className="px-4 py-3 text-blue-700 font-semibold">{row.soldCount}</td>
                          <td className="px-4 py-3 text-violet-700 font-bold">{fmt(row.availableValue)}</td>
                          <td className="px-4 py-3 text-rose-700 font-bold">{fmt(row.soldValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-700">{invData.totals.availableCount}</td>
                        <td className="px-4 py-3 text-xs font-bold text-blue-700">{invData.totals.soldCount}</td>
                        <td className="px-4 py-3 text-xs font-bold text-violet-700">{fmt(invData.totals.availableValue)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-rose-700">{fmt(invData.totals.soldValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Sales (POS) */}
      {tab === "sales" && (
        <div className="space-y-4" dir="rtl">
          {salesLoading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">جاري التحميل...</div>
          ) : !salesData ? null : salesData.saleCount === 0 ? (
            <div className={CARD}>
              <div className="text-center py-16">
                <ShoppingCart size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">لا توجد مبيعات POS هذا الشهر</p>
              </div>
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              {(() => {
                const avgInvoice = salesData.saleCount > 0 ? salesData.totalAmount / salesData.saleCount : 0;
                const topBranchSales = salesData.byBranch.length > 0
                  ? salesData.byBranch.reduce((best, r) => r.totalAmount > best.totalAmount ? r : best, salesData.byBranch[0])
                  : null;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-2xl border bg-emerald-50 border-emerald-100 text-emerald-700 p-4">
                      <p className="text-xs font-medium opacity-70 mb-1">إجمالي المبيعات</p>
                      <p className="text-xl font-black">{fmt(salesData.totalAmount)}</p>
                    </div>
                    <div className="rounded-2xl border bg-blue-50 border-blue-100 text-blue-700 p-4">
                      <p className="text-xs font-medium opacity-70 mb-1">عدد الفواتير</p>
                      <p className="text-xl font-black">{salesData.saleCount} <span className="text-sm font-normal opacity-60">فاتورة</span></p>
                    </div>
                    <div className="rounded-2xl border bg-violet-50 border-violet-100 text-violet-700 p-4">
                      <p className="text-xs font-medium opacity-70 mb-1">متوسط قيمة الفاتورة</p>
                      <p className="text-xl font-black">{fmt(Math.round(avgInvoice))}</p>
                    </div>
                    <div className="rounded-2xl border bg-amber-50 border-amber-100 text-amber-700 p-4">
                      <p className="text-xs font-medium opacity-70 mb-1">أعلى مبيعات</p>
                      <p className="text-base font-black leading-tight">{topBranchSales?.branchName ?? "—"}</p>
                      {topBranchSales && <p className="text-xs opacity-70 mt-0.5">{fmt(topBranchSales.totalAmount)}</p>}
                    </div>
                  </div>
                );
              })()}

              {/* By Branch with payment pills */}
              <div className={CARD}>
                <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={15} className="text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-700">المبيعات حسب الفرع</h3>
                  </div>
                </div>
                {/* Mobile stacked cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {salesData.byBranch.map((row) => (
                    <div key={row.branchId} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{row.branchName}</span>
                        <span className="text-emerald-700 font-bold text-sm">{fmt(row.totalAmount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full">{row.saleCount} فاتورة</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.byPayment.cash > 0 && (
                          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">نقد: {fmt(row.byPayment.cash)}</span>
                        )}
                        {row.byPayment.card > 0 && (
                          <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">بطاقة: {fmt(row.byPayment.card)}</span>
                        )}
                        {row.byPayment.transfer > 0 && (
                          <span className="text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">تحويل: {fmt(row.byPayment.transfer)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["الفرع", "عدد الفواتير", "الإجمالي", "طريقة الدفع"].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesData.byBranch.map((row) => (
                        <tr key={row.branchId} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">{row.branchName}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.saleCount}</span>
                          </td>
                          <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(row.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {row.byPayment.cash > 0 && (
                                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">نقد: {fmt(row.byPayment.cash)}</span>
                              )}
                              {row.byPayment.card > 0 && (
                                <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">بطاقة: {fmt(row.byPayment.card)}</span>
                              )}
                              {row.byPayment.transfer > 0 && (
                                <span className="text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">تحويل: {fmt(row.byPayment.transfer)}</span>
                              )}
                              {!row.byPayment.cash && !row.byPayment.card && !row.byPayment.transfer && (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{salesData.saleCount}</td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-700">{fmt(salesData.totalAmount)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* By Employee */}
              {salesData.byEmployee.length > 0 && (
                <div className={CARD}>
                  <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-teal-600" />
                      <h3 className="text-sm font-bold text-slate-700">المبيعات حسب الموظف</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {["الموظف", "عدد الفواتير", "الإجمالي", "متوسط الفاتورة"].map((h, i) => (
                            <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesData.byEmployee.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-bold text-slate-800">{row.employeeName}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.saleCount}</span>
                            </td>
                            <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(row.totalAmount)}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{row.saleCount > 0 ? fmt(Math.round(row.totalAmount / row.saleCount)) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Repairs */}
      {tab === "repairs" && (
        <div className="space-y-4" dir="rtl">
          {repairsLoading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">جاري التحميل...</div>
          ) : !repairsData ? null : repairsData.total === 0 ? (
            <div className={CARD}>
              <div className="text-center py-16">
                <Wrench size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">لا توجد طلبات صيانة</p>
              </div>
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-blue-50 border-blue-100 text-blue-700 p-4">
                  <p className="text-xs font-medium opacity-70 mb-1">إجمالي طلبات الصيانة</p>
                  <p className="text-xl font-black">{repairsData.total} <span className="text-sm font-normal opacity-60">طلب</span></p>
                </div>
                <div className="rounded-2xl border bg-emerald-50 border-emerald-100 text-emerald-700 p-4">
                  <p className="text-xs font-medium opacity-70 mb-1">مكتملة</p>
                  <p className="text-xl font-black">{repairsData.statusCounts.completed || 0}</p>
                </div>
                <div className="rounded-2xl border bg-amber-50 border-amber-100 text-amber-700 p-4">
                  <p className="text-xs font-medium opacity-70 mb-1">معلقة</p>
                  <p className="text-xl font-black">{(repairsData.statusCounts.received || 0) + (repairsData.statusCounts.in_progress || 0)}</p>
                </div>
                <div className="rounded-2xl border bg-violet-50 border-violet-100 text-violet-700 p-4">
                  <p className="text-xs font-medium opacity-70 mb-1">إجمالي الإيرادات</p>
                  <p className="text-xl font-black">{fmt(repairsData.totalRevenue)}</p>
                </div>
              </div>

              {/* Status Distribution Badges */}
              <div className={CARD}>
                <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <div className="flex items-center gap-2">
                    <Wrench size={15} className="text-orange-600" />
                    <h3 className="text-sm font-bold text-slate-700">توزيع الحالات</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "received", label: "مستلم", color: "bg-blue-100 text-blue-700 border-blue-200" },
                      { key: "in_progress", label: "قيد الإصلاح", color: "bg-amber-100 text-amber-700 border-amber-200" },
                      { key: "completed", label: "مكتمل", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                      { key: "delivered", label: "مُسلَّم", color: "bg-slate-100 text-slate-600 border-slate-200" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 ${color}`}>
                        <span className="text-xl font-black">{repairsData.statusCounts[key] || 0}</span>
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                    ))}
                    {repairsData.overdue > 0 && (
                      <div className="flex items-center gap-2 border rounded-xl px-4 py-2.5 bg-red-100 text-red-700 border-red-200">
                        <span className="text-xl font-black">{repairsData.overdue}</span>
                        <span className="text-sm font-semibold">متأخرة</span>
                      </div>
                    )}
                  </div>
                  {(repairsData.avgTurnaroundDays != null || repairsData.avgRepairCost != null) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-sm text-slate-600">
                      {repairsData.avgRepairCost != null && (
                        <span>متوسط تكلفة الإصلاح: <strong className="text-slate-800">{fmt(repairsData.avgRepairCost)}</strong></span>
                      )}
                      {repairsData.avgTurnaroundDays != null && (
                        <span>متوسط وقت الإنجاز: <strong className="text-slate-800">{repairsData.avgTurnaroundDays} يوم</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdown by Branch */}
              <div className={CARD}>
                <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <h3 className="text-sm font-bold text-slate-700">الحالة حسب الفرع</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["الفرع", "الإجمالي", "مستلم", "قيد الإصلاح", "مكتمل", "مُسلَّم", "الإيرادات", "متأخر"].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {repairsData.byBranch.map((row) => (
                        <tr key={row.branchId} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">{row.branchName}</td>
                          <td className="px-4 py-3 font-bold text-slate-700">{row.total}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{row.statusCounts.received || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{row.statusCounts.in_progress || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{row.statusCounts.completed || 0}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{row.statusCounts.delivered || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-violet-700 font-bold">{fmt(row.revenue || 0)}</td>
                          <td className="px-4 py-3">
                            {row.overdue > 0 ? (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{row.overdue} متأخر</span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                      {repairsData.byBranch.length > 1 && (
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{repairsData.total}</td>
                          <td className="px-4 py-3 text-xs font-bold text-blue-700">{repairsData.statusCounts.received || 0}</td>
                          <td className="px-4 py-3 text-xs font-bold text-amber-700">{repairsData.statusCounts.in_progress || 0}</td>
                          <td className="px-4 py-3 text-xs font-bold text-emerald-700">{repairsData.statusCounts.completed || 0}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{repairsData.statusCounts.delivered || 0}</td>
                          <td className="px-4 py-3 text-xs font-bold text-violet-700">{fmt(repairsData.totalRevenue)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-red-600">{repairsData.overdue > 0 ? repairsData.overdue : "—"}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Profit */}
      {tab === "profit" && (
        <div className="space-y-4" dir="rtl">
          {/* Branch filter (admin only) */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] p-4 flex items-center gap-3">
            <DollarSign size={15} className="text-green-600 flex-shrink-0" />
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">الفرع:</label>
            <select value={profitBranchId} onChange={(e) => setProfitBranchId(e.target.value)}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white max-w-xs">
              <option value="">جميع الفروع</option>
              {(data?.branches ?? []).map((r) => (
                <option key={r.branch.id} value={r.branch.id}>{r.branch.name}</option>
              ))}
            </select>
          </div>

          {profitLoading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse">جاري التحميل...</div>
          ) : !profitData || profitData.summary.soldItemsCount === 0 ? (
            <div className={CARD}>
              <div className="text-center py-16">
                <TrendingUp size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">لا توجد مبيعات مسجلة في هذه الفترة</p>
              </div>
            </div>
          ) : (
            <>
              {/* Row 1 — 4 Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-emerald-50 border-emerald-100 text-emerald-700 p-4">
                  <div className="flex items-center gap-1.5 mb-2 opacity-70">
                    <TrendingUp size={14} /><span className="text-xs font-medium">إجمالي الإيرادات</span>
                  </div>
                  <p className="text-xl font-black">{fmt(profitData.summary.totalRevenue)}</p>
                  <p className="text-xs opacity-60 mt-1">{profitData.summary.soldItemsCount} قطعة مباعة</p>
                </div>
                <div className="rounded-2xl border bg-blue-50 border-blue-100 text-blue-700 p-4">
                  <div className="flex items-center gap-1.5 mb-2 opacity-70">
                    <Banknote size={14} /><span className="text-xs font-medium">إجمالي التكلفة</span>
                  </div>
                  <p className="text-xl font-black">{fmt(profitData.summary.totalCost)}</p>
                </div>
                <div className="rounded-2xl border bg-violet-50 border-violet-100 text-violet-700 p-4">
                  <div className="flex items-center gap-1.5 mb-2 opacity-70">
                    <DollarSign size={14} /><span className="text-xs font-medium">صافي الربح</span>
                  </div>
                  <p className="text-xl font-black">{fmt(profitData.summary.grossProfit)}</p>
                </div>
                <div className="rounded-2xl border bg-rose-50 border-rose-100 text-rose-700 p-4">
                  <div className="flex items-center gap-1.5 mb-2 opacity-70">
                    <BarChart3 size={14} /><span className="text-xs font-medium">متوسط هامش الربح</span>
                  </div>
                  <p className="text-xl font-black">{profitData.summary.avgMarginPct.toFixed(1)}%</p>
                </div>
              </div>

              {/* Row 2 — By Category */}
              {profitData.byCategory.length > 0 && (() => {
                const maxProfit = Math.max(...profitData.byCategory.map((c) => c.profit), 1);
                return (
                  <div className={CARD}>
                    <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-700">الربح حسب الصنف</h3>
                      </div>
                    </div>
                    {/* Mobile stacked */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {profitData.byCategory.map((row) => (
                        <div key={row.category} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{row.category}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.count} قطعة</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(row.profit / maxProfit) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>إيراد: {fmt(row.revenue)}</span>
                            <span>تكلفة: {fmt(row.cost)}</span>
                            <span className="text-emerald-700 font-bold">ربح: {fmt(row.profit)} ({row.marginPct.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {["الصنف", "عدد القطع", "الإيراد", "التكلفة", "الربح", "الهامش %", ""].map((h, i) => (
                              <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profitData.byCategory.map((row) => (
                            <tr key={row.category} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 font-bold text-slate-800">{row.category}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.count}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{fmt(row.revenue)}</td>
                              <td className="px-4 py-3 text-blue-700">{fmt(row.cost)}</td>
                              <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(row.profit)}</td>
                              <td className="px-4 py-3 text-rose-700 font-semibold">{row.marginPct.toFixed(1)}%</td>
                              <td className="px-4 py-3 w-32">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(row.profit / maxProfit) * 100}%` }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                          <tr>
                            <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{profitData.summary.soldItemsCount}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{fmt(profitData.summary.totalRevenue)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-blue-700">{fmt(profitData.summary.totalCost)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-emerald-700">{fmt(profitData.summary.grossProfit)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-rose-700">{profitData.summary.avgMarginPct.toFixed(1)}%</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Row 3 — 2-column grid: By Karat + By Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* By Karat */}
                {profitData.byKarat.length > 0 && (() => {
                  const maxProfit = Math.max(...profitData.byKarat.map((k) => k.profit), 1);
                  return (
                    <div className={CARD}>
                      <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                        <div className="flex items-center gap-2">
                          <BarChart3 size={15} className="text-violet-600" />
                          <h3 className="text-sm font-bold text-slate-700">الربح حسب العيار</h3>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        {profitData.byKarat.map((row) => (
                          <div key={row.karat}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700">عيار {row.karat} — {row.count} قطعة</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500">{fmt(row.revenue)}</span>
                                <span className="text-xs font-bold text-emerald-700 min-w-[4rem] text-left">{fmt(row.profit)}</span>
                                <span className="text-xs font-bold text-rose-600 min-w-[3rem] text-left">{row.marginPct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${(row.profit / maxProfit) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* By Branch */}
                {profitData.byBranch.length > 0 && (
                  <div className={CARD}>
                    <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <div className="flex items-center gap-2">
                        <BookOpen size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-700">الربح حسب الفرع</h3>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {["الفرع", "القطع", "الإيراد", "الربح", "الهامش %"].map((h, i) => (
                              <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profitData.byBranch.map((row) => (
                            <tr key={row.branchId} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 font-bold text-slate-800">{row.branchName}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{row.count}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-semibold">{fmt(row.revenue)}</td>
                              <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(row.profit)}</td>
                              <td className="px-4 py-3 text-rose-700 font-semibold">{row.marginPct.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        {profitData.byBranch.length > 1 && (
                          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                              <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{profitData.summary.soldItemsCount}</td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{fmt(profitData.summary.totalRevenue)}</td>
                              <td className="px-4 py-3 text-xs font-bold text-emerald-700">{fmt(profitData.summary.grossProfit)}</td>
                              <td className="px-4 py-3 text-xs font-bold text-rose-700">{profitData.summary.avgMarginPct.toFixed(1)}%</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4 — Top Profitable Items */}
              {profitData.topItems.length > 0 && (
                <div className={CARD}>
                  <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-green-600" />
                      <h3 className="text-sm font-bold text-slate-700">أعلى القطع ربحية</h3>
                    </div>
                  </div>
                  {/* Mobile stacked */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {profitData.topItems.map((item, i) => (
                      <div key={item.sku} className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 font-mono text-xs">{item.sku}</span>
                          <span className="text-emerald-700 font-bold text-sm">{fmt(item.profit)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{item.category}</span>
                          <span>·</span>
                          <span>عيار {item.karat}</span>
                          <span>·</span>
                          <span className="text-rose-600 font-semibold">{item.marginPct.toFixed(1)}%</span>
                          {item.soldAt && <><span>·</span><span>{item.soldAt}</span></>}
                        </div>
                        <div className="text-xs text-slate-400">
                          بيع: {fmt(item.salePrice)} — تكلفة: {fmt(item.cost)}
                        </div>
                        {i === 0 && <span className="text-xs text-amber-500 font-bold">الأعلى ربحية</span>}
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {["#", "SKU", "الصنف", "العيار", "سعر البيع", "التكلفة", "الربح", "الهامش %", "تاريخ البيع"].map((h, i) => (
                            <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profitData.topItems.map((item, i) => (
                          <tr key={item.sku} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-xs text-slate-400 font-bold">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{item.sku}</td>
                            <td className="px-4 py-3 text-slate-700">{item.category}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{item.karat}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{fmt(item.salePrice)}</td>
                            <td className="px-4 py-3 text-blue-700">{fmt(item.cost)}</td>
                            <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(item.profit)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.marginPct >= 30 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : item.marginPct >= 20 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                                {item.marginPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{item.soldAt ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

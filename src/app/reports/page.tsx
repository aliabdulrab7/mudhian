"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Banknote, Wallet, BookOpen, Package, Users, Download } from "lucide-react";
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

type TabType = "summary" | "items" | "banks" | "employees";

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
          <Users size={13} /> تقارير الموظفين
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
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Banknote, Wallet, BookOpen, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = ["طقم", "خاتم", "حلق", "اسوارة", "تعليقة", "نص طقم"];
const BANKS = ["الانماء", "الراجحي", "الرياض", "ساب", "الاهلي"];
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

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

type TabType = "summary" | "items" | "banks";

export default function ReportsPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("summary");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
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
            { icon: <TrendingUp size={16} />, label: "إجمالي المبيعات", value: formatCurrency(totals.totalSales), color: "emerald" },
            { icon: <Banknote size={16} />, label: "إجمالي الحوالات", value: formatCurrency(totals.bankTotal), color: "blue" },
            { icon: <Wallet size={16} />, label: "إجمالي الكاش", value: formatCurrency(totals.cashSales), color: "violet" },
            { icon: <BookOpen size={16} />, label: "إجمالي رصيد الدرج", value: formatCurrency(totals.bookBalance), color: "rose" },
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
            <p className="text-sm font-black text-amber-800">{topBranch.branch.name} — {formatCurrency(topBranch.totalSales)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!loading && active.length > 0 && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([["summary", "ملخص الفروع"], ["items", "مقارنة الأصناف"], ["banks", "تفصيل البنوك"]] as [TabType, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === key ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Tab: Summary */}
      {tab === "summary" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
          ) : !data || data.branches.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">لا توجد بيانات لهذا الشهر</div>
          ) : (
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
                  {data.branches.map((row) => (
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
                      <td className="px-4 py-3 text-emerald-700 font-semibold">{row.daysCount > 0 ? formatCurrency(row.totalSales) : "—"}</td>
                      <td className="px-4 py-3 text-blue-600">{row.daysCount > 0 ? formatCurrency(row.bankTotal) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.daysCount > 0 ? formatCurrency(row.cashSales) : "—"}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold">{row.daysCount > 0 ? formatCurrency(row.bookBalance) : "—"}</td>
                      <td className="px-4 py-3 text-amber-700 font-semibold">{row.daysCount > 0 ? `${row.soldItemsTotal} قطعة` : "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{row.daysCount > 0 ? formatCurrency(row.avgDailySales) : "—"}</td>
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
                      <td className="px-4 py-3 text-emerald-700 font-bold text-xs">{formatCurrency(totals.totalSales)}</td>
                      <td className="px-4 py-3 text-blue-600 font-bold text-xs">{formatCurrency(totals.bankTotal)}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold text-xs">{formatCurrency(totals.cashSales)}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold text-xs">{formatCurrency(totals.bookBalance)}</td>
                      <td className="px-4 py-3 text-amber-700 font-bold text-xs">{totals.soldItemsTotal} قطعة</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Items comparison */}
      {tab === "items" && data && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    <p className="text-base font-black text-blue-800">{formatCurrency(amount)}</p>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                  {data.branches.map((row) => (
                    <tr key={row.branch.id} className={`hover:bg-slate-50 transition ${row.daysCount === 0 ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.branch.name}</td>
                      {BANKS.map((b) => {
                        const amt = row.banksByName[b] ?? 0;
                        const pct = row.bankTotal > 0 ? (amt / row.bankTotal) * 100 : 0;
                        return (
                          <td key={b} className="px-3 py-2 text-center">
                            {amt > 0 ? (
                              <div>
                                <p className="text-xs font-bold text-blue-700">{formatCurrency(amt)}</p>
                                <p className="text-xs text-slate-400">{pct.toFixed(0)}%</p>
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-black text-blue-700 text-xs">{formatCurrency(row.bankTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي</td>
                    {BANKS.map((b) => (
                      <td key={b} className="px-3 py-3 text-center text-xs font-bold text-blue-700">
                        {formatCurrency(data.globalBankTotals[b] ?? 0)}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center text-xs font-black text-blue-800">{formatCurrency(data.globalBankTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

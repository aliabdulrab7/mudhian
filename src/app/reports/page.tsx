"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Banknote, Wallet, BookOpen, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BranchReport {
  branch: { id: number; name: string; branchNum: string };
  daysCount: number;
  totalSales: number;
  bankTotal: number;
  cashSales: number;
  bookBalance: number;
  actualBalance: number;
  avgDailySales: number;
  soldItemsTotal: number;
}

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ReportsPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<BranchReport[]>([]);
  const [loading, setLoading] = useState(true);

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

  const active = data.filter((r) => r.daysCount > 0);
  const totals = active.reduce((acc, r) => ({
    totalSales: acc.totalSales + r.totalSales,
    bankTotal: acc.bankTotal + r.bankTotal,
    cashSales: acc.cashSales + r.cashSales,
    bookBalance: acc.bookBalance + r.bookBalance,
    soldItemsTotal: acc.soldItemsTotal + r.soldItemsTotal,
  }), { totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0, soldItemsTotal: 0 });

  // Find top branch
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
        <div className="flex items-center gap-2 text-slate-500">
          <BarChart3 size={16} />
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
            { icon: <Package size={16} />, label: "إجمالي الأصناف", value: totals.soldItemsTotal.toString() + " قطعة", color: "amber" },
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

      {/* Top Branch Badge */}
      {!loading && topBranch && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-500 text-lg">🏆</span>
          <div>
            <p className="text-xs text-amber-600 font-medium">أعلى فرع مبيعات هذا الشهر</p>
            <p className="text-sm font-black text-amber-800">{topBranch.branch.name} — {formatCurrency(topBranch.totalSales)}</p>
          </div>
        </div>
      )}

      {/* Branches Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">لا توجد بيانات لهذا الشهر</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["الفرع","الأيام","إجمالي المبيعات","الحوالات البنكية","مبيعات كاش","رصيد الدرج","الأصناف المباعة","متوسط يومي",""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.branch.id} className={`transition ${row.daysCount === 0 ? "opacity-40" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {row.branch.name}
                      {row.branch.id === topBranch?.branch.id && row.daysCount > 0 && (
                        <span className="mr-1 text-amber-500 text-xs">🏆</span>
                      )}
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
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium hover:underline transition">
                          الأرشيف →
                        </button>
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
    </div>
  );
}

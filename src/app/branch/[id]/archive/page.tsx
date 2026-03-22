"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ArchiveEntry {
  id: number; date: string; totalSales: number; bankTotal: number;
  cashSales: number; bookBalance: number; actualBalance: number; difference: number;
}

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function ArchivePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = parseInt(params.id as string);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/archive?branchId=${branchId}&year=${year}&month=${month}`);
    setEntries(await res.json());
    setLoading(false);
  }, [branchId, year, month]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  };

  const totals = entries.reduce((acc, e) => ({
    totalSales: acc.totalSales + e.totalSales,
    bankTotal: acc.bankTotal + e.bankTotal,
    cashSales: acc.cashSales + e.cashSales,
    bookBalance: acc.bookBalance + e.bookBalance,
  }), { totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronRight size={18} /></button>
          <span className="text-sm font-semibold text-slate-700 min-w-[130px] text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronLeft size={18} /></button>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar size={16} />
          <span className="text-sm font-semibold text-slate-700">أرشيف اليوميات</span>
        </div>
      </div>

      {/* Monthly Summary */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إجمالي المبيعات", value: totals.totalSales, color: "emerald" },
            { label: "إجمالي الحوالات", value: totals.bankTotal, color: "blue" },
            { label: "إجمالي الكاش", value: totals.cashSales, color: "violet" },
            { label: "إجمالي رصيد الدرج", value: totals.bookBalance, color: "rose" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl border p-4 ${
              color === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : color === "blue" ? "bg-blue-50 border-blue-100 text-blue-700"
              : color === "violet" ? "bg-violet-50 border-violet-100 text-violet-700"
              : "bg-rose-50 border-rose-100 text-rose-700"
            }`}>
              <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
              <p className="text-lg font-black">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">لا توجد يوميات لهذا الشهر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["التاريخ","إجمالي المبيعات","الحوالات البنكية","مبيعات كاش","رصيد الدرج الدفتري","الرصيد الفعلي","الفرق",""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => {
                      const d = new Date(e.date).toISOString().split("T")[0];
                      router.push(`/branch/${branchId}/drawer?date=${d}`);
                    }}>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {new Date(e.date).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">{formatCurrency(e.totalSales)}</td>
                    <td className="px-4 py-3 text-blue-600">{formatCurrency(e.bankTotal)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(e.cashSales)}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold">{formatCurrency(e.bookBalance)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(e.actualBalance)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        e.difference === 0 ? "bg-emerald-100 text-emerald-700"
                        : e.difference > 0 ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-600"
                      }`}>
                        {e.difference === 0 ? "متطابق" : formatCurrency(e.difference)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-blue-500 text-xs font-medium">فتح →</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600">مجموع الشهر ({entries.length} يوم)</td>
                  <td className="px-4 py-3 text-emerald-700 font-bold text-xs">{formatCurrency(totals.totalSales)}</td>
                  <td className="px-4 py-3 text-blue-600 font-bold text-xs">{formatCurrency(totals.bankTotal)}</td>
                  <td className="px-4 py-3 text-slate-600 font-bold text-xs">{formatCurrency(totals.cashSales)}</td>
                  <td className="px-4 py-3 text-rose-600 font-bold text-xs">{formatCurrency(totals.bookBalance)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

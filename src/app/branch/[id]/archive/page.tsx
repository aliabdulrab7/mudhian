"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { downloadCSV } from "@/lib/utils";

interface ArchiveEntry {
  id: number; date: string; totalSales: number; bankTotal: number;
  cashSales: number; bookBalance: number; actualBalance: number; difference: number;
}

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function ArchivePage() {
  const params = useParams();
  const router = useRouter();
  const fmt = useFormatCurrency();
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

  // ── Calendar computations ──────────────────────────────────
  const totalDays = daysInMonth(year, month);
  const entryByDate: Record<string, ArchiveEntry> = {};
  for (const e of entries) {
    const d = e.date.slice(0, 10);
    entryByDate[d] = e;
  }

  const allDays = Array.from({ length: totalDays }, (_, i) => isoDate(year, month, i + 1));
  const missingDays = allDays.filter((d) => {
    const todayStr = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return !entryByDate[d] && d <= todayStr;
  });

  const maxSales = Math.max(...entries.map((e) => e.totalSales), 1);

  const handleExport = () => {
    const rows = entries.map((e) => ({
      "التاريخ": e.date.slice(0, 10),
      "إجمالي المبيعات": e.totalSales,
      "الحوالات البنكية": e.bankTotal,
      "مبيعات كاش": e.cashSales,
      "رصيد الدرج الدفتري": e.bookBalance,
      "الرصيد الفعلي": e.actualBalance,
      "الفرق": e.difference,
    }));
    downloadCSV(rows, `أرشيف-${year}-${MONTHS[month - 1]}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] px-4 py-3 flex items-center justify-between">
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
              <p className="text-lg font-black">{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Mini Trend Chart ─────────────────────────────────── */}
      {!loading && entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] px-5 py-4">
          <p className="text-xs font-bold text-slate-400 mb-3">المبيعات اليومية — {MONTHS[month - 1]} {year}</p>
          <div className="flex items-end gap-0.5 h-16 overflow-x-auto pb-1">
            {allDays.map((d) => {
              const entry = entryByDate[d];
              const height = entry ? Math.max(4, Math.round((entry.totalSales / maxSales) * 56)) : 4;
              const todayStr = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
              const isMissing = !entry && d <= todayStr;
              return (
                <div
                  key={d}
                  title={entry ? `${d}: ${entry.totalSales.toLocaleString()} ر.س` : `${d}: لا توجد يومية`}
                  onClick={() => router.push(`/branch/${branchId}/drawer?date=${d}`)}
                  className="flex-shrink-0 rounded-sm cursor-pointer transition-opacity hover:opacity-70"
                  style={{
                    width: `calc(${100 / totalDays}% - 2px)`,
                    minWidth: 6,
                    height: `${height}px`,
                    background: isMissing ? "#e2e8f0" : entry ? "#10b981" : "#f0fdf4",
                    alignSelf: "flex-end",
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-300 mt-1 font-mono">
            <span>1</span>
            <span>{Math.ceil(totalDays / 2)}</span>
            <span>{totalDays}</span>
          </div>
        </div>
      )}

      {/* ── Missing Days ─────────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] px-5 py-4">
          {missingDays.length === 0 ? (
            <p className="text-xs font-semibold text-emerald-600">✓ لا توجد أيام مفقودة في هذا الشهر حتى اليوم</p>
          ) : (
            <>
              <p className="text-xs font-bold text-rose-500 mb-2">أيام بدون يومية ({missingDays.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {missingDays.map((d) => {
                  const dayNum = parseInt(d.slice(8));
                  return (
                    <button
                      key={d}
                      onClick={() => router.push(`/branch/${branchId}/drawer?date=${d}`)}
                      className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-100 transition"
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">لا توجد يوميات لهذا الشهر</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{entries.length} يوم مسجل</span>
              <button onClick={handleExport}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition">
                <Download size={13} /> CSV
              </button>
            </div>
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
                      onClick={() => router.push(`/branch/${branchId}/drawer?date=${e.date.slice(0, 10)}`)}>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {new Date(e.date).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold">{fmt(e.totalSales)}</td>
                      <td className="px-4 py-3 text-blue-600">{fmt(e.bankTotal)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmt(e.cashSales)}</td>
                      <td className="px-4 py-3 text-rose-600 font-bold">{fmt(e.bookBalance)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(e.actualBalance)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          e.difference === 0 ? "bg-emerald-100 text-emerald-700"
                          : e.difference > 0 ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-600"
                        }`}>
                          {e.difference === 0 ? "متطابق" : fmt(e.difference)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-500 text-xs font-medium">فتح →</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">مجموع الشهر ({entries.length} يوم)</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold text-xs">{fmt(totals.totalSales)}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold text-xs">{fmt(totals.bankTotal)}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold text-xs">{fmt(totals.cashSales)}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold text-xs">{fmt(totals.bookBalance)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

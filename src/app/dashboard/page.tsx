"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, TrendingUp, Banknote, Wallet, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { todayISO, shiftDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/userPrefs";

interface BranchSummary {
  branch: { id: number; name: string; branchNum: string };
  hasData: boolean;
  totalSales?: number; bankTotal?: number; cashSales?: number;
  bookBalance?: number; actualBalance?: number; difference?: number;
}

const DIFF_ALERT_THRESHOLD = 500;
const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

export default function DashboardPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?date=${date}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const changeDate = (delta: number) => { setDate(shiftDate(date, delta)); };

  const active = data.filter((d) => d.hasData);
  const missing = data.filter((d) => !d.hasData);
  const largeDiff = active.filter((d) => Math.abs(d.difference ?? 0) > DIFF_ALERT_THRESHOLD);

  const totals = active.reduce((acc, d) => ({
    totalSales: acc.totalSales + (d.totalSales ?? 0),
    bankTotal: acc.bankTotal + (d.bankTotal ?? 0),
    cashSales: acc.cashSales + (d.cashSales ?? 0),
    bookBalance: acc.bookBalance + (d.bookBalance ?? 0),
  }), { totalSales: 0, bankTotal: 0, cashSales: 0, bookBalance: 0 });

  const arabicDate = new Date(date + "T00:00:00").toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`${CARD} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><ChevronRight size={16} /></button>
          <input
            type="date" value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-slate-50 border-0 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-inner"
          />
          <button onClick={() => changeDate(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><ChevronLeft size={16} /></button>
          <button onClick={() => setDate(todayISO())} className="text-xs text-white px-3 py-1.5 rounded-xl font-semibold transition shadow-sm" style={{ background: "var(--navy)" }}>اليوم</button>
        </div>
        <div className="text-left flex items-center gap-3">
          <h2 className="font-black text-slate-800 text-base">لوحة التحكم</h2>
          {active.length > 0 && (
            <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full font-semibold">
              ✓ {active.length} فروع
            </span>
          )}
          {missing.length > 0 && (
            <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2.5 py-1 rounded-full font-semibold animate-pulse">
              ⚠ {missing.length} ناقص
            </span>
          )}
        </div>
      </div>

      {/* Alert: missing branches */}
      {!loading && missing.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #fef2f2, #fff5f5)", border: "1px solid #fecaca" }}>
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">فروع لم تُدخل يوميتها بعد</p>
            <p className="text-xs text-red-400 mt-1">{missing.map((m) => m.branch.name).join(" — ")}</p>
          </div>
        </div>
      )}

      {/* Alert: large differences */}
      {!loading && largeDiff.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "linear-gradient(135deg, #fffbeb, #fef9ee)", border: "1px solid #fde68a" }}>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-700">فروع تجاوز فرقها {fmt(DIFF_ALERT_THRESHOLD)}</p>
            <p className="text-xs text-amber-500 mt-1">{largeDiff.map((r) => `${r.branch.name} (${fmt(Math.abs(r.difference ?? 0))})`).join(" — ")}</p>
          </div>
        </div>
      )}

      {/* All clear */}
      {!loading && missing.length === 0 && data.length > 0 && largeDiff.length === 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #f0fdf4, #f7fef9)", border: "1px solid #bbf7d0" }}>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">جميع الفروع أدخلت يومياتها ولا توجد فروق تجاوزت الحد</p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && active.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SCard icon={<TrendingUp size={18} />} label="إجمالي المبيعات" value={fmt(totals.totalSales)} grad="from-emerald-400 to-teal-500" />
          <SCard icon={<Banknote size={18} />} label="إجمالي الحوالات" value={fmt(totals.bankTotal)} grad="from-blue-500 to-cyan-400" />
          <SCard icon={<Wallet size={18} />} label="إجمالي الكاش" value={fmt(totals.cashSales)} grad="from-violet-500 to-purple-500" />
          <SCard icon={<BookOpen size={18} />} label="إجمالي رصيد الدرج" value={fmt(totals.bookBalance)} grad="from-rose-500 to-orange-400" />
        </div>
      )}

      {/* Branches Table */}
      <div className={CARD}>
        {loading ? (
          <div className="text-center py-20 text-slate-300 text-sm animate-pulse">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  {["الفرع","إجمالي المبيعات","الحوالات","الكاش","رصيد الدفتري","الرصيد الفعلي","العجز / الزيادة",""].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-right text-xs font-bold text-slate-400 whitespace-nowrap tracking-wide uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const bigDiff = Math.abs(row.difference ?? 0) > DIFF_ALERT_THRESHOLD;
                  return (
                    <tr key={row.branch.id} className={`border-t border-slate-50 transition-colors ${
                      !row.hasData ? "bg-red-50/30"
                      : bigDiff ? "bg-amber-50/40 hover:bg-amber-50/60"
                      : idx % 2 === 0 ? "bg-white hover:bg-slate-50/70" : "bg-slate-50/40 hover:bg-slate-50/80"
                    }`}>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            !row.hasData ? "bg-red-400" : bigDiff ? "bg-amber-400" : "bg-emerald-400"
                          }`} />
                          {row.branch.name}
                        </div>
                      </td>
                      {row.hasData ? (
                        <>
                          <td className="px-5 py-4 font-bold text-emerald-600">{fmt(row.totalSales!)}</td>
                          <td className="px-5 py-4 text-blue-500 font-medium">{fmt(row.bankTotal!)}</td>
                          <td className="px-5 py-4 text-slate-500">{fmt(row.cashSales!)}</td>
                          <td className="px-5 py-4 font-bold text-rose-500">{fmt(row.bookBalance!)}</td>
                          <td className="px-5 py-4 text-slate-600">{fmt(row.actualBalance!)}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                              row.difference === 0 ? "bg-emerald-50 text-emerald-600"
                              : (row.difference ?? 0) > 0 ? "bg-blue-50 text-blue-600"
                              : "bg-red-50 text-red-500"
                            }`}>
                              {row.difference === 0 ? "✓ متطابق" : fmt(row.difference!)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-5 py-4 text-red-300 text-xs font-medium">لم تُدخل يومية بعد</td>
                      )}
                      <td className="px-5 py-4">
                        <button onClick={() => router.push(`/branch/${row.branch.id}/drawer?date=${date}`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl transition whitespace-nowrap text-white shadow-sm"
                          style={{ background: "var(--navy)" }}>
                          فتح
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {active.length > 0 && (
                <tfoot>
                  <tr style={{ background: "linear-gradient(135deg, #edf1f8, #e8edf5)" }}>
                    <td className="px-5 py-4 text-xs font-black text-slate-600">الإجمالي — {active.length} فروع</td>
                    <td className="px-5 py-4 text-emerald-600 font-black text-sm">{fmt(totals.totalSales)}</td>
                    <td className="px-5 py-4 text-blue-500 font-bold text-sm">{fmt(totals.bankTotal)}</td>
                    <td className="px-5 py-4 text-slate-500 font-bold text-sm">{fmt(totals.cashSales)}</td>
                    <td className="px-5 py-4 text-rose-500 font-black text-sm">{fmt(totals.bookBalance)}</td>
                    <td colSpan={3}></td>
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

function SCard({ icon, label, value, grad }: { icon: React.ReactNode; label: string; value: string; grad: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${grad} shadow-lg text-white`}>
      <div className="flex items-center gap-2 mb-3 opacity-90">
        {icon}
        <span className="text-xs font-semibold tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black tracking-tight leading-tight">{value}</p>
    </div>
  );
}

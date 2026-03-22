"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, TrendingUp, Banknote, Wallet, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency, todayISO } from "@/lib/utils";

interface BranchSummary {
  branch: { id: number; name: string; branchNum: string };
  hasData: boolean;
  totalSales?: number; bankTotal?: number; cashSales?: number;
  bookBalance?: number; actualBalance?: number; difference?: number;
}

const DIFF_ALERT_THRESHOLD = 500;

export default function DashboardPage() {
  const router = useRouter();
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

  const changeDate = (delta: number) => {
    const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronRight size={18} /></button>
          <input
            type="date" value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"><ChevronLeft size={18} /></button>
          <button onClick={() => setDate(todayISO())} className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg font-medium transition">اليوم</button>
        </div>
        <div className="text-left">
          <h2 className="font-bold text-slate-800 text-sm">لوحة التحكم</h2>
          <div className="flex items-center gap-2 justify-end mt-0.5">
            {active.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                ✓ {active.length} {active.length === 1 ? "فرع" : "فروع"} أدخلوا
              </span>
            )}
            {missing.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">
                ⚠ {missing.length} ناقص
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alert: missing branches */}
      {!loading && missing.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">فروع لم تُدخل يوميتها بعد</p>
            <p className="text-xs text-red-500 mt-0.5">
              {missing.map((m) => m.branch.name).join(" — ")}
            </p>
          </div>
        </div>
      )}

      {/* Alert: large differences */}
      {!loading && largeDiff.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700">فروع تجاوز فرقها {formatCurrency(DIFF_ALERT_THRESHOLD)}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {largeDiff.map((r) => `${r.branch.name} (${formatCurrency(Math.abs(r.difference ?? 0))})`).join(" — ")}
            </p>
          </div>
        </div>
      )}

      {/* All clear */}
      {!loading && missing.length === 0 && data.length > 0 && largeDiff.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700">جميع الفروع أدخلت يومياتها ولا توجد فروق تجاوزت الحد</p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && active.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SCard icon={<TrendingUp size={18} />} label="إجمالي المبيعات" value={formatCurrency(totals.totalSales)} color="emerald" />
          <SCard icon={<Banknote size={18} />} label="إجمالي الحوالات" value={formatCurrency(totals.bankTotal)} color="blue" />
          <SCard icon={<Wallet size={18} />} label="إجمالي الكاش" value={formatCurrency(totals.cashSales)} color="violet" />
          <SCard icon={<BookOpen size={18} />} label="إجمالي رصيد الدرج" value={formatCurrency(totals.bookBalance)} color="rose" />
        </div>
      )}

      {/* Branches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["الفرع","إجمالي المبيعات","الحوالات","الكاش","رصيد الدرج الدفتري","الرصيد الفعلي","العجز/الزيادة",""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => {
                  const bigDiff = Math.abs(row.difference ?? 0) > DIFF_ALERT_THRESHOLD;
                  return (
                    <tr key={row.branch.id} className={`transition ${
                      !row.hasData ? "bg-red-50/40"
                      : bigDiff ? "bg-amber-50/50 hover:bg-amber-50"
                      : "hover:bg-slate-50"
                    }`}>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          {!row.hasData && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
                          {row.hasData && bigDiff && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                          {row.hasData && !bigDiff && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
                          {row.branch.name}
                        </div>
                      </td>
                      {row.hasData ? (
                        <>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">{formatCurrency(row.totalSales!)}</td>
                          <td className="px-4 py-3 text-blue-600">{formatCurrency(row.bankTotal!)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(row.cashSales!)}</td>
                          <td className="px-4 py-3 text-rose-600 font-bold">{formatCurrency(row.bookBalance!)}</td>
                          <td className="px-4 py-3 text-slate-700">{formatCurrency(row.actualBalance!)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              row.difference === 0 ? "bg-emerald-100 text-emerald-700"
                              : (row.difference ?? 0) > 0 ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-600"
                            }`}>
                              {row.difference === 0 ? "متطابق" : formatCurrency(row.difference!)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-4 py-3 text-red-400 text-xs font-medium">لم تُدخل يومية بعد</td>
                      )}
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/branch/${row.branch.id}/drawer?date=${date}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition whitespace-nowrap">
                          فتح →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {active.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">الإجمالي ({active.length} فروع)</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold text-xs">{formatCurrency(totals.totalSales)}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold text-xs">{formatCurrency(totals.bankTotal)}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold text-xs">{formatCurrency(totals.cashSales)}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold text-xs">{formatCurrency(totals.bookBalance)}</td>
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

function SCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    rose: "bg-rose-50 border-rose-100 text-rose-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

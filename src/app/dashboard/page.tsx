"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, TrendingUp, Banknote, Wallet, BookOpen,
  AlertTriangle, CheckCircle2, ChevronUp, ChevronDown,
  ShoppingCart, Wrench, Package,
} from "lucide-react";
import { todayISO, shiftDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/userPrefs";

// ── Types ────────────────────────────────────────────────────────────────────

interface BranchSummary {
  branch: { id: number; name: string; branchNum: string };
  hasData: boolean;
  totalSales?: number; bankTotal?: number; cashSales?: number;
  bookBalance?: number; actualBalance?: number; difference?: number;
  lastSubmittedDate?: string | null;
}

interface ConsolidatedData {
  date: string;
  journal: {
    branches: {
      branchId: number; branchName: string; totalSales: number;
      bookBalance: number; actualBalance: number; difference: number; isLocked: boolean;
    }[];
    totals: { totalSales: number; bookBalance: number; actualBalance: number };
  };
  pos: {
    saleCount: number; totalRevenue: number;
    byCash: number; byCard: number; byTransfer: number;
  };
  repairs: {
    received: number; inProgress: number; completed: number; delivered: number;
    todayRevenue: number;
  };
  inventory: {
    available: number; sold: number; reserved: number; repair: number;
    totalValue: number;
  };
}

type SortCol = "totalSales" | "bankTotal" | "cashSales" | "bookBalance" | "difference";

// ── Constants ────────────────────────────────────────────────────────────────

const DIFF_ALERT_THRESHOLD = 500;
const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<BranchSummary[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [consolidatedLoading, setConsolidatedLoading] = useState(true);
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?date=${date}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [date]);

  const fetchConsolidated = useCallback(async () => {
    setConsolidatedLoading(true);
    const res = await fetch(`/api/reports/consolidated?date=${date}`);
    if (res.ok) setConsolidated(await res.json());
    setConsolidatedLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
    fetchConsolidated();
  }, [fetchData, fetchConsolidated]);

  const changeDate = (delta: number) => { setDate(shiftDate(date, delta)); };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const today = todayISO();
  const yesterday = shiftDate(today, -1);

  const stalenessBadge = (lastDate: string | null | undefined) => {
    if (!lastDate) return <span className="text-xs text-slate-300">—</span>;
    if (lastDate === today) return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">اليوم</span>;
    if (lastDate === yesterday) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">أمس</span>;
    const daysAgo = Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000);
    return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">متأخر {daysAgo} أيام</span>;
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

  const sortedData = sortCol
    ? [...data].sort((a, b) => {
        const av = a[sortCol] ?? (a.hasData ? 0 : -Infinity);
        const bv = b[sortCol] ?? (b.hasData ? 0 : -Infinity);
        return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : data;

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return <span className="text-slate-200 ms-1">↕</span>;
    return sortDir === "desc"
      ? <ChevronDown size={12} className="inline ms-1 text-blue-500" />
      : <ChevronUp size={12} className="inline ms-1 text-blue-500" />;
  };

  // ── POS payment bar helpers ─────────────────────────────────────────────
  const posTotal = consolidated?.pos.totalRevenue ?? 0;
  const cashPct = posTotal > 0 ? (consolidated!.pos.byCash / posTotal) * 100 : 0;
  const cardPct = posTotal > 0 ? (consolidated!.pos.byCard / posTotal) * 100 : 0;
  const transferPct = posTotal > 0 ? (consolidated!.pos.byTransfer / posTotal) * 100 : 0;

  const activeRepairs = (consolidated?.repairs.inProgress ?? 0) + (consolidated?.repairs.received ?? 0);

  return (
    <div className="space-y-5">
      {/* ── Date Navigator / Header ───────────────────────────────────────── */}
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

      {/* ── Consolidated Stat Cards (top row) ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SCard
          icon={<TrendingUp size={18} />}
          label="إجمالي مبيعات اليومية"
          value={consolidatedLoading ? "..." : fmt(consolidated?.journal.totals.totalSales ?? 0)}
          grad="from-emerald-400 to-teal-500"
        />
        <SCard
          icon={<ShoppingCart size={18} />}
          label="مبيعات نقطة البيع"
          value={consolidatedLoading ? "..." : fmt(consolidated?.pos.totalRevenue ?? 0)}
          grad="from-blue-500 to-cyan-400"
        />
        <SCard
          icon={<Wrench size={18} />}
          label="طلبات صيانة نشطة"
          value={consolidatedLoading ? "..." : String(activeRepairs)}
          grad="from-amber-400 to-orange-500"
        />
        <SCard
          icon={<Package size={18} />}
          label="قيمة المخزون"
          value={consolidatedLoading ? "..." : fmt(consolidated?.inventory.totalValue ?? 0)}
          grad="from-violet-500 to-purple-500"
        />
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
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

      {!loading && missing.length === 0 && data.length > 0 && largeDiff.length === 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #f0fdf4, #f7fef9)", border: "1px solid #bbf7d0" }}>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-emerald-700">جميع الفروع أدخلت يومياتها ولا توجد فروق تجاوزت الحد</p>
        </div>
      )}

      {/* ── Journal Summary Cards ─────────────────────────────────────────── */}
      {!loading && active.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SCard icon={<TrendingUp size={18} />} label="إجمالي المبيعات" value={fmt(totals.totalSales)} grad="from-emerald-400 to-teal-500" />
          <SCard icon={<Banknote size={18} />} label="إجمالي الحوالات" value={fmt(totals.bankTotal)} grad="from-blue-500 to-cyan-400" />
          <SCard icon={<Wallet size={18} />} label="إجمالي الكاش" value={fmt(totals.cashSales)} grad="from-violet-500 to-purple-500" />
          <SCard icon={<BookOpen size={18} />} label="إجمالي رصيد الدرج" value={fmt(totals.bookBalance)} grad="from-rose-500 to-orange-400" />
        </div>
      )}

      {/* ── Branches Table ────────────────────────────────────────────────── */}
      <div className={CARD}>
        {loading ? (
          <div className="text-center py-20 text-slate-300 text-sm animate-pulse">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-400 whitespace-nowrap tracking-wide uppercase">الفرع</th>
                  {([
                    ["totalSales", "إجمالي المبيعات"],
                    ["bankTotal", "الحوالات"],
                    ["cashSales", "الكاش"],
                    ["bookBalance", "رصيد الدفتري"],
                    ["difference", "العجز / الزيادة"],
                  ] as [SortCol, string][]).map(([col, label]) => (
                    <th key={col}
                      className="px-5 py-4 text-right text-xs font-bold text-slate-400 whitespace-nowrap tracking-wide uppercase cursor-pointer hover:text-blue-500 transition select-none"
                      onClick={() => handleSort(col)}>
                      {label}<SortIcon col={col} />
                    </th>
                  ))}
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-400 whitespace-nowrap">الرصيد الفعلي</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-400 whitespace-nowrap">آخر تسجيل</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, idx) => {
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
                          <td className="px-5 py-4">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                              row.difference === 0 ? "bg-emerald-50 text-emerald-600"
                              : (row.difference ?? 0) > 0 ? "bg-blue-50 text-blue-600"
                              : "bg-red-50 text-red-500"
                            }`}>
                              {row.difference === 0 ? "✓ متطابق" : fmt(row.difference!)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{fmt(row.actualBalance!)}</td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-5 py-4 text-red-300 text-xs font-medium">لم تُدخل يومية بعد</td>
                      )}
                      <td className="px-5 py-4">{stalenessBadge(row.lastSubmittedDate)}</td>
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
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── POS + Repairs Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* POS Card */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
              <ShoppingCart size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ملخص نقطة البيع</h3>
              <p className="text-xs text-slate-400">مبيعات يوم {date}</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="عدد الفواتير" value={String(consolidated?.pos.saleCount ?? 0)} color="text-blue-600" />
              <MiniStat label="نقدي" value={fmt(consolidated?.pos.byCash ?? 0)} color="text-emerald-600" />
              <MiniStat label="شبكة / تحويل" value={fmt((consolidated?.pos.byCard ?? 0) + (consolidated?.pos.byTransfer ?? 0))} color="text-violet-600" />
            </div>
            {/* Payment bar */}
            {posTotal > 0 ? (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>توزيع طرق الدفع</span>
                  <span>{fmt(posTotal)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "#f1f5f9" }}>
                  {cashPct > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${cashPct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }}
                      title={`نقدي — ${fmt(consolidated!.pos.byCash)}`}
                    />
                  )}
                  {cardPct > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${cardPct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }}
                      title={`بطاقة — ${fmt(consolidated!.pos.byCard)}`}
                    />
                  )}
                  {transferPct > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${transferPct}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }}
                      title={`تحويل — ${fmt(consolidated!.pos.byTransfer)}`}
                    />
                  )}
                </div>
                <div className="flex gap-3 mt-2">
                  <LegendDot color="#10b981" label="نقدي" />
                  <LegendDot color="#3b82f6" label="بطاقة" />
                  <LegendDot color="#8b5cf6" label="تحويل" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 text-center py-2">لا توجد مبيعات لهذا اليوم</p>
            )}
          </div>
        </div>

        {/* Repairs Card */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #fb923c)" }}>
              <Wrench size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">حالة الصيانة</h3>
              <p className="text-xs text-slate-400">إجمالي الطلبات النشطة</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <RepairBadge
                label="مستلمة"
                count={consolidated?.repairs.received ?? 0}
                bg="#f1f5f9"
                text="#64748b"
              />
              <RepairBadge
                label="قيد الإصلاح"
                count={consolidated?.repairs.inProgress ?? 0}
                bg="#fffbeb"
                text="#d97706"
              />
              <RepairBadge
                label="مكتملة"
                count={consolidated?.repairs.completed ?? 0}
                bg="#f0fdf4"
                text="#16a34a"
              />
              <RepairBadge
                label="مُسلَّمة"
                count={consolidated?.repairs.delivered ?? 0}
                bg="#eff6ff"
                text="#2563eb"
              />
            </div>
            {(consolidated?.repairs.todayRevenue ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400">إيرادات الصيانة اليوم</span>
                <span className="text-sm font-black text-emerald-600">{fmt(consolidated!.repairs.todayRevenue)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-black ${color}`}>{value}</p>
    </div>
  );
}

function RepairBadge({ label, count, bg, text }: { label: string; count: number; bg: string; text: string }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: bg }}>
      <span className="text-xs font-semibold" style={{ color: text }}>{label}</span>
      <span className="text-lg font-black" style={{ color: text }}>{count}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

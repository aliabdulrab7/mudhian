"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Gem, Plus, Search, Filter } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

interface Branch { id: number; name: string; }
interface Session { role: string; branchId?: number; }
interface DiamondStone {
  id: number; sku: string; caratWeight: number; color: string; clarity: string;
  cut: string; shape: string; certificateNum: string; certBody: string;
  cost: number; salePrice: number; status: string; branchId: number;
  branch?: { name: string };
  supplier?: { name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  available: "متاح", sold: "مباع", mounted: "مركب",
};
const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  sold: "bg-red-100 text-red-700",
  mounted: "bg-violet-100 text-violet-700",
};

const SHAPES = ["Round", "Princess", "Oval", "Pear", "Marquise", "Cushion", "Emerald", "Asscher", "Radiant", "Heart"];
const SHAPE_AR: Record<string, string> = {
  Round: "دائري", Princess: "أميرة", Oval: "بيضاوي", Pear: "إجاصي",
  Marquise: "ماركيز", Cushion: "وسادي", Emerald: "زمرد", Asscher: "أشير",
  Radiant: "مشع", Heart: "قلب",
};
const COLORS = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
const CLARITIES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"];

export default function DiamondsPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stones, setStones] = useState<DiamondStone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [shape, setShape] = useState("");
  const [color, setColor] = useState("");
  const [clarity, setClarity] = useState("");

  const fetchStones = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page) });
    if (branchId) sp.set("branchId", branchId);
    if (status) sp.set("status", status);
    if (shape) sp.set("shape", shape);
    if (color) sp.set("color", color);
    if (clarity) sp.set("clarity", clarity);
    if (search) sp.set("search", search);
    const res = await fetch(`/api/diamonds?${sp}`);
    if (res.ok) {
      const data = await res.json();
      setStones(data.stones);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, branchId, status, shape, color, clarity, search]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(setSession);
    fetch("/api/branches").then(r => r.ok ? r.json() : []).then(setBranches);
  }, []);

  useEffect(() => { fetchStones(); }, [fetchStones]);

  const resetFilters = () => {
    setSearch(""); setBranchId(""); setStatus(""); setShape(""); setColor(""); setClarity(""); setPage(1);
  };

  const colorGrade = (c: string) => {
    const idx = COLORS.indexOf(c);
    if (idx < 3) return "text-blue-700 font-black";
    if (idx < 6) return "text-emerald-700 font-bold";
    return "text-slate-600";
  };

  const clarityGrade = (c: string) => {
    const idx = CLARITIES.indexOf(c);
    if (idx < 2) return "text-blue-700 font-black";
    if (idx < 4) return "text-emerald-700 font-bold";
    return "text-slate-600";
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-20 sm:pb-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <Gem size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">مخزون الماس</h1>
          <p className="text-xs text-slate-500">{total} حجر في النظام</p>
        </div>
        {session?.role !== "viewer" && (
          <button
            onClick={() => router.push("/diamonds/new")}
            className="mr-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <Plus size={16} />إضافة ماسة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={`${CARD} px-5 py-4 mb-4`}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="SKU أو شهادة..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="border-0 bg-slate-50 rounded-xl py-2 pr-9 pl-3 text-sm focus:ring-2 focus:ring-violet-300 outline-none w-44"
            />
          </div>

          {session?.role === "admin" && (
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(1); }}
              className="border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none">
            <option value="">كل الحالات</option>
            <option value="available">متاح</option>
            <option value="sold">مباع</option>
            <option value="mounted">مركب</option>
          </select>

          <select value={shape} onChange={e => { setShape(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none">
            <option value="">كل الأشكال</option>
            {SHAPES.map(s => <option key={s} value={s}>{SHAPE_AR[s] ?? s}</option>)}
          </select>

          <select value={color} onChange={e => { setColor(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none">
            <option value="">كل الألوان</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={clarity} onChange={e => { setClarity(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none">
            <option value="">كل النقاوات</option>
            {CLARITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(search || branchId || status || shape || color || clarity) && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 transition-colors">
              <Filter size={13} />مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={CARD}>
        {loading ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">جاري التحميل...</div>
        ) : stones.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Gem size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">لا توجد أحجار ماس</p>
            <p className="text-slate-400 text-sm mt-1">أضف أول حجر ماس لبدء المخزون</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">SKU</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">الشكل</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">القيراط</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">اللون</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">النقاوة</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">القطع</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">الشهادة</th>
                    <th className="px-4 py-3 text-left text-slate-500 font-bold">سعر البيع</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">الحالة</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">الفرع</th>
                  </tr>
                </thead>
                <tbody>
                  {stones.map(stone => (
                    <tr
                      key={stone.id}
                      onClick={() => router.push(`/diamonds/${stone.sku}`)}
                      className="border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-violet-700 font-bold text-xs">{stone.sku}</td>
                      <td className="px-4 py-3 text-slate-700">{SHAPE_AR[stone.shape] ?? stone.shape}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{stone.caratWeight.toFixed(2)} قط</td>
                      <td className={`px-4 py-3 font-mono ${colorGrade(stone.color)}`}>{stone.color || "—"}</td>
                      <td className={`px-4 py-3 font-mono ${clarityGrade(stone.clarity)}`}>{stone.clarity || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{stone.cut || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {stone.certBody && <span className="font-bold text-slate-700">{stone.certBody} </span>}
                        {stone.certificateNum || "—"}
                      </td>
                      <td className="px-4 py-3 text-left font-mono text-slate-800">{fmt(stone.salePrice)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLOR[stone.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABEL[stone.status] ?? stone.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{stone.branch?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {stones.map(stone => (
                <div
                  key={stone.id}
                  onClick={() => router.push(`/diamonds/${stone.sku}`)}
                  className="px-4 py-3 hover:bg-violet-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-violet-700 font-bold text-xs">{stone.sku}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${STATUS_COLOR[stone.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[stone.status] ?? stone.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-slate-800">{stone.caratWeight.toFixed(2)} قط</span>
                    <span className={`font-mono ${colorGrade(stone.color)}`}>{stone.color}</span>
                    <span className={`font-mono ${clarityGrade(stone.clarity)}`}>{stone.clarity}</span>
                    <span className="text-slate-600">{SHAPE_AR[stone.shape] ?? stone.shape}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{stone.branch?.name}</span>
                    <span className="font-mono text-slate-800 text-sm">{fmt(stone.salePrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-white shadow-sm text-sm disabled:opacity-40">السابق</button>
          <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-white shadow-sm text-sm disabled:opacity-40">التالي</button>
        </div>
      )}
    </main>
  );
}

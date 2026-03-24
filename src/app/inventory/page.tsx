"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye, Printer, Package } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

interface Branch { id: number; name: string; }
interface JewelryItem {
  id: number; sku: string; barcode: string; category: string;
  metalType: string; karat: number; netWeight: number;
  salePrice: number; status: string; branchId: number;
  branch?: { name: string };
}
interface Session { role: string; branchId?: number; }

const STATUS_LABEL: Record<string, string> = {
  available: "متاح", sold: "مباع", reserved: "محجوز", repair: "صيانة",
};
const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  sold: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  repair: "bg-blue-100 text-blue-700",
};
const CATEGORIES = ["خاتم", "سواره", "عقد", "حلق", "طقم", "صيانة", "أخرى"];
const STATUSES = ["available", "sold", "reserved", "repair"];

export default function InventoryPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<JewelryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (branchId) sp.set("branchId", branchId);
    if (status) sp.set("status", status);
    if (category) sp.set("category", category);
    if (search) sp.set("search", search);
    sp.set("page", String(page));
    const res = await fetch(`/api/inventory?${sp}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [branchId, status, category, search, page]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(s => setSession(s));
    fetch("/api/branches").then(r => r.ok ? r.json() : []).then(setBranches);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>إدارة المخزون</h1>
          <p className="text-slate-500 text-sm mt-1">{total} قطعة إجمالاً</p>
        </div>
        <button
          onClick={() => router.push("/inventory/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "#1e3a5f" }}
        >
          <Plus size={16} />
          إضافة قطعة
        </button>
      </div>

      {/* Filters */}
      <div className={`${CARD} mb-5`}>
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالباركود أو SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full border-0 bg-slate-50 rounded-xl py-2 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
          {session?.role === "admin" && (
            <select
              value={branchId}
              onChange={e => { setBranchId(e.target.value); setPage(1); }}
              className="border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
          >
            <option value="">كل الأصناف</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
          >
            <option value="">كل الحالات</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">SKU</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الصنف</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">العيار</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الوزن الصافي</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">سعر البيع</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">الحالة</th>
                {session?.role === "admin" && (
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">الفرع</th>
                )}
                <th className="px-4 py-3 text-right font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">جاري التحميل...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Package size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400">لا توجد قطع في المخزون</p>
                  </td>
                </tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.category}</td>
                  <td className="px-4 py-3 text-slate-600">{item.karat}K</td>
                  <td className="px-4 py-3 text-slate-600">{item.netWeight}g</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(item.salePrice)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  {session?.role === "admin" && (
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.branch?.name}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/inventory/${item.sku}`)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                        title="عرض"
                      >
                        <Eye size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => router.push(`/inventory/${item.sku}?print=1`)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                        title="طباعة الباركود"
                      >
                        <Printer size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              صفحة {page} من {pages} ({total} قطعة)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg text-sm disabled:opacity-40 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                السابق
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg text-sm disabled:opacity-40 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

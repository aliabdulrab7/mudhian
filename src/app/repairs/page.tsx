"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Wrench, Search, Clock, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

interface Repair {
  id: number;
  itemDescription: string;
  status: string;
  estimatedCost: number;
  actualCost: number | null;
  estimatedReady: string | null;
  createdAt: string;
  customer: { name: string; phone: string } | null;
  employee: { name: string } | null;
  branch: { name: string };
}

const STATUS_LABELS: Record<string, string> = {
  received: "مستلم",
  in_progress: "قيد الإصلاح",
  completed: "مكتمل",
  delivered: "تم التسليم",
};

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  delivered: "bg-slate-100 text-slate-500",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  received: <Clock size={12} />,
  in_progress: <Wrench size={12} />,
  completed: <CheckCircle2 size={12} />,
  delivered: <Truck size={12} />,
};

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const fmt = useFormatCurrency();

  const fetchRepairs = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/repairs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRepairs(data.repairs);
      setPages(data.pages);
      setTotal(data.total);
      setPage(p);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchRepairs(1); }, [fetchRepairs]);

  const filtered = repairs.filter(r =>
    !search ||
    r.itemDescription.includes(search) ||
    r.customer?.name.includes(search) ||
    r.customer?.phone.includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-800">إدارة الصيانة</h1>
          <p className="text-sm text-slate-400 mt-0.5">{total} طلب إجمالي</p>
        </div>
        <Link
          href="/repairs/new"
          className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition text-sm font-semibold"
        >
          <Plus size={16} /> استلام جديد
        </Link>
      </div>

      {/* Filters */}
      <div className={CARD}>
        <div className="p-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم العميل أو الصنف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border-0 bg-slate-50 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {["", "received", "in_progress", "completed", "delivered"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === s
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {s === "" ? "الكل" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={CARD}>
        {loading ? (
          <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Wrench size={36} className="mx-auto mb-3 text-slate-200" />
            <p>لا توجد طلبات صيانة</p>
            <Link href="/repairs/new" className="mt-3 text-blue-500 hover:underline text-sm block">
              استلم أول قطعة
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">#</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">العميل</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">الصنف</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">الفرع</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">التكلفة</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">موعد الاستلام</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <Link href={`/repairs/${r.id}`} className="font-mono text-blue-600 hover:underline text-xs">
                          #{r.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{r.customer?.name || "—"}</div>
                        <div className="text-xs text-slate-400">{r.customer?.phone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/repairs/${r.id}`} className="text-slate-700 hover:text-blue-600 transition line-clamp-1">
                          {r.itemDescription}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.branch.name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                          {STATUS_ICONS[r.status]} {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-semibold">
                        {r.actualCost != null ? fmt(r.actualCost) : fmt(r.estimatedCost)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">
                        {r.estimatedReady
                          ? new Date(r.estimatedReady).toLocaleDateString("ar-SA-u-nu-latn")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-50">
              {filtered.map(r => (
                <Link key={r.id} href={`/repairs/${r.id}`} className="block p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-blue-500">#{r.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                          {STATUS_ICONS[r.status]} {STATUS_LABELS[r.status]}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 text-sm truncate">{r.itemDescription}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.customer?.name} · {r.customer?.phone}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="font-bold text-slate-800">
                        {r.actualCost != null ? fmt(r.actualCost) : fmt(r.estimatedCost)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchRepairs(p)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
                p === page ? "bg-navy text-white" : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeftRight, CheckCircle2, XCircle, Clock, X, Trash2, ScanLine } from "lucide-react";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none";
const LABEL = "block text-xs font-medium text-slate-500 mb-1";

type TransferStatus = "all" | "pending" | "completed" | "cancelled";

interface Transfer {
  id: number;
  fromBranchId: number;
  toBranchId: number;
  status: string;
  notes: string;
  createdBy: number;
  createdAt: string;
  completedAt?: string;
  fromBranch: { name: string };
  toBranch: { name: string };
  _count: { items: number };
}

interface Branch { id: number; name: string; }

interface ScannedItem {
  sku: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={13} />,
  completed: <CheckCircle2 size={13} />,
  cancelled: <XCircle size={13} />,
};

export default function StockTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TransferStatus>("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Create form state
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Auth check — admin only
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (!s || s.role !== "admin") router.push("/"); });
    fetch("/api/branches").then((r) => r.ok ? r.json() : []).then(setBranches);
  }, [router]);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    const res = await fetch(`/api/stock-transfers?${params}`);
    if (res.ok) setTransfers(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { loadTransfers(); }, [loadTransfers]);

  const handleAddSku = () => {
    const sku = skuInput.trim().toUpperCase();
    if (!sku) return;
    if (scannedItems.some((i) => i.sku === sku)) {
      setCreateError("هذه القطعة مضافة مسبقاً");
      return;
    }
    setScannedItems((prev) => [...prev, { sku }]);
    setSkuInput("");
    setCreateError("");
  };

  const handleSkuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddSku(); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!fromBranchId || !toBranchId) { setCreateError("اختر الفرع المصدر والوجهة"); return; }
    if (fromBranchId === toBranchId) { setCreateError("الفرع المصدر والوجهة يجب أن يكونا مختلفَين"); return; }
    if (scannedItems.length === 0) { setCreateError("أضف قطعة واحدة على الأقل"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId: parseInt(fromBranchId),
          toBranchId: parseInt(toBranchId),
          notes: transferNotes,
          itemSkus: scannedItems.map((i) => i.sku),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "حدث خطأ"); return; }
      setShowModal(false);
      resetCreateForm();
      loadTransfers();
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFromBranchId("");
    setToBranchId("");
    setTransferNotes("");
    setSkuInput("");
    setScannedItems([]);
    setCreateError("");
  };

  const handleAction = async (id: number, action: "complete" | "cancel") => {
    const label = action === "complete" ? "إتمام" : "إلغاء";
    if (!confirm(`هل تريد ${label} هذا التحويل؟`)) return;
    setActionLoading(id);
    setError("");
    try {
      const res = await fetch(`/api/stock-transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "حدث خطأ"); return; }
      loadTransfers();
    } finally {
      setActionLoading(null);
    }
  };

  const statusTabs: { value: TransferStatus; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "pending", label: "قيد الانتظار" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
  ];

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>تحويلات المخزون</h1>
            <p className="text-sm text-slate-500 mt-0.5">تحويل القطع بين الفروع</p>
          </div>
          <button
            onClick={() => { setShowModal(true); resetCreateForm(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm"
            style={{ background: "#1e3a5f" }}
          >
            <Plus size={16} /> تحويل جديد
          </button>
        </div>

        {/* Status filter tabs */}
        <div className={`${CARD} mb-4`}>
          <div className="p-3 flex gap-1 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filterStatus === tab.value
                    ? "text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:text-slate-700"
                }`}
                style={filterStatus === tab.value ? { background: "#1e3a5f" } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Transfers table — desktop */}
        <div className={`${CARD} hidden sm:block`}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <ArrowLeftRight size={18} className="text-slate-500" />
            <span className="font-bold text-slate-700">سجل التحويلات</span>
            <span className="mr-auto text-xs text-slate-400">{transfers.length} تحويل</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">جاري التحميل...</div>
          ) : transfers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">لا توجد تحويلات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">#</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">من فرع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">إلى فرع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">عدد القطع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3 font-mono text-slate-500 text-xs">#{t.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.fromBranch.name}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{t.toBranch.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {t._count.items} قطعة
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_ICON[t.status]}
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="px-4 py-3">
                        {t.status === "pending" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAction(t.id, "complete")}
                              disabled={actionLoading === t.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition"
                            >
                              <CheckCircle2 size={12} /> إتمام
                            </button>
                            <button
                              onClick={() => handleAction(t.id, "cancel")}
                              disabled={actionLoading === t.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                            >
                              <XCircle size={12} /> إلغاء
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            <div className="text-center text-slate-400 text-sm py-8">جاري التحميل...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">لا توجد تحويلات</div>
          ) : transfers.map((t) => (
            <div key={t.id} className={CARD}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-slate-400 font-mono mb-0.5">تحويل #{t.id}</div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span>{t.fromBranch.name}</span>
                      <ArrowLeftRight size={13} className="text-slate-400" />
                      <span>{t.toBranch.name}</span>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_ICON[t.status]}
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t._count.items} قطعة · {new Date(t.createdAt).toLocaleDateString("ar-SA")}</span>
                </div>
                {t.notes && <div className="text-xs text-slate-500 mt-1.5">{t.notes}</div>}
                {t.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAction(t.id, "complete")}
                      disabled={actionLoading === t.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> إتمام التحويل
                    </button>
                    <button
                      onClick={() => handleAction(t.id, "cancel")}
                      disabled={actionLoading === t.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold disabled:opacity-50"
                    >
                      <XCircle size={13} /> إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className={`${CARD} w-full max-w-lg`} dir="rtl">
            <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <ArrowLeftRight size={18} className="text-slate-500" />
              <span className="font-bold text-slate-700">تحويل جديد</span>
              <button onClick={() => { setShowModal(false); resetCreateForm(); }} className="mr-auto p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* From / To branches */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>من فرع *</label>
                  <select value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)} className={INPUT} required>
                    <option value="">اختر الفرع</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>إلى فرع *</label>
                  <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} className={INPUT} required>
                    <option value="">اختر الفرع</option>
                    {branches.filter((b) => String(b.id) !== fromBranchId).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SKU scanner */}
              <div>
                <label className={LABEL}>إضافة قطعة (باركود / SKU)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyDown={handleSkuKeyDown}
                      className="w-full border-0 bg-slate-50 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none font-mono"
                      placeholder="اكتب SKU واضغط Enter"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSku}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                    style={{ background: "#1e3a5f" }}
                  >
                    إضافة
                  </button>
                </div>

                {/* Quick prefix buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["RNG", "BRL", "EAR", "NKL", "FSET", "REP"].map((pfx) => (
                    <button
                      key={pfx}
                      type="button"
                      onClick={() => setSkuInput(pfx + "-")}
                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono hover:bg-slate-200 transition"
                    >
                      {pfx}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanned items list */}
              {scannedItems.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {scannedItems.map((item, idx) => (
                    <div key={item.sku} className="flex items-center justify-between py-1 px-2 bg-white rounded-lg text-sm">
                      <span className="font-mono text-slate-700 text-xs">{item.sku}</span>
                      <button
                        type="button"
                        onClick={() => setScannedItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="text-center text-xs text-slate-400 pt-1">{scannedItems.length} قطعة</div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={LABEL}>ملاحظات</label>
                <textarea value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} className={INPUT} rows={2} placeholder="أي ملاحظات..." />
              </div>

              {createError && <div className="p-3 bg-red-50 rounded-xl text-red-700 text-sm">{createError}</div>}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-60" style={{ background: "#1e3a5f" }}>
                  {creating ? "جاري الإنشاء..." : "إنشاء التحويل"}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetCreateForm(); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

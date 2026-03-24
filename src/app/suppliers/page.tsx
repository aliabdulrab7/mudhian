"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, UserX, Save, X, Building2, Phone, Mail, MapPin, FileText, CheckCircle, XCircle } from "lucide-react";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none";
const LABEL = "block text-xs font-medium text-slate-500 mb-1";

interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  _count: { jewelryItems: number };
}

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = { name: "", phone: "", email: "", address: "", notes: "" };

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<SupplierForm>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<SupplierForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auth check — admin only
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((s) => { if (!s || s.role !== "admin") router.push("/"); });
  }, [router]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterActive === "active") params.set("isActive", "true");
    else if (filterActive === "inactive") params.set("isActive", "false");

    const res = await fetch(`/api/suppliers?${params}`);
    if (res.ok) setSuppliers(await res.json());
    setLoading(false);
  }, [debouncedSearch, filterActive]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "حدث خطأ"); return; }
      setShowModal(false);
      setNewForm(EMPTY_FORM);
      loadSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: number) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "حدث خطأ"); return; }
      setEditingId(null);
      loadSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("هل تريد إلغاء تفعيل هذا المورد؟")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    loadSuppliers();
  };

  const handleReactivate = async (id: number) => {
    await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    loadSuppliers();
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, notes: s.notes });
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>الموردون</h1>
            <p className="text-sm text-slate-500 mt-0.5">إدارة موردي المجوهرات</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setNewForm(EMPTY_FORM); setError(""); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm"
            style={{ background: "#1e3a5f" }}
          >
            <Plus size={16} /> مورد جديد
          </button>
        </div>

        {/* Filters */}
        <div className={`${CARD} mb-4`}>
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو البريد..."
                className="w-full border-0 bg-slate-50 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
            </div>
            {/* Status filter */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterActive(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterActive === f ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f === "all" ? "الكل" : f === "active" ? "نشط" : "غير نشط"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Suppliers table — desktop */}
        <div className={`${CARD} hidden sm:block`}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <Building2 size={18} className="text-slate-500" />
            <span className="font-bold text-slate-700">قائمة الموردين</span>
            <span className="mr-auto text-xs text-slate-400">{suppliers.length} مورد</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">جاري التحميل...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">لا يوجد موردون</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">الاسم</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الهاتف</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">البريد</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">عدد القطع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) =>
                    editingId === s.id ? (
                      <tr key={s.id} className="border-b border-slate-100 bg-blue-50/30">
                        <td className="px-5 py-2">
                          <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} placeholder="الاسم *" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} placeholder="الهاتف" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} placeholder="البريد" />
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{s._count.jewelryItems}</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(s.id)}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                              style={{ background: "#1e3a5f" }}
                            >
                              <Save size={12} /> حفظ
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold"
                            >
                              <X size={12} /> إلغاء
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-semibold text-slate-800">{s.name}</td>
                        <td className="px-4 py-3 text-slate-600 dir-ltr">{s.phone || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{s.email || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {s._count.jewelryItems} قطعة
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {s.isActive ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <CheckCircle size={13} /> نشط
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                              <XCircle size={13} /> غير نشط
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => startEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                              title="تعديل"
                            >
                              <Edit2 size={14} />
                            </button>
                            {s.isActive ? (
                              <button
                                onClick={() => handleDeactivate(s.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                                title="إلغاء التفعيل"
                              >
                                <UserX size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(s.id)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                                title="إعادة التفعيل"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            <div className="text-center text-slate-400 text-sm py-8">جاري التحميل...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">لا يوجد موردون</div>
          ) : suppliers.map((s) => (
            <div key={s.id} className={CARD}>
              {editingId === s.id ? (
                <div className="p-4 space-y-3">
                  <div><label className={LABEL}>الاسم *</label><input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>الهاتف</label><input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>البريد الإلكتروني</label><input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>العنوان</label><input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className={INPUT} /></div>
                  <div><label className={LABEL}>ملاحظات</label><textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className={INPUT} rows={2} /></div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleEdit(s.id)} disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: "#1e3a5f" }}>
                      {saving ? "..." : "حفظ"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">إلغاء</button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s._count.jewelryItems} قطعة</div>
                    </div>
                    {s.isActive ? (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">نشط</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">غير نشط</span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    {s.phone && <div className="flex items-center gap-1.5"><Phone size={11} /> {s.phone}</div>}
                    {s.email && <div className="flex items-center gap-1.5"><Mail size={11} /> {s.email}</div>}
                    {s.address && <div className="flex items-center gap-1.5"><MapPin size={11} /> {s.address}</div>}
                    {s.notes && <div className="flex items-center gap-1.5"><FileText size={11} /> {s.notes}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                      <Edit2 size={12} /> تعديل
                    </button>
                    {s.isActive ? (
                      <button onClick={() => handleDeactivate(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                        <UserX size={12} /> إلغاء تفعيل
                      </button>
                    ) : (
                      <button onClick={() => handleReactivate(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        <CheckCircle size={12} /> إعادة تفعيل
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className={`${CARD} w-full max-w-md`} dir="rtl">
            <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <Building2 size={18} className="text-slate-500" />
              <span className="font-bold text-slate-700">إضافة مورد جديد</span>
              <button onClick={() => setShowModal(false)} className="mr-auto p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className={LABEL}>الاسم *</label>
                <input
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  className={INPUT}
                  placeholder="اسم المورد"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>الهاتف</label>
                  <input value={newForm.phone} onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} placeholder="05xxxxxxxx" />
                </div>
                <div>
                  <label className={LABEL}>البريد الإلكتروني</label>
                  <input type="email" value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} placeholder="example@mail.com" />
                </div>
              </div>
              <div>
                <label className={LABEL}>العنوان</label>
                <input value={newForm.address} onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))} className={INPUT} placeholder="العنوان" />
              </div>
              <div>
                <label className={LABEL}>ملاحظات</label>
                <textarea value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} className={INPUT} rows={2} placeholder="أي ملاحظات..." />
              </div>
              {error && <div className="p-3 bg-red-50 rounded-xl text-red-700 text-sm">{error}</div>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-bold disabled:opacity-60" style={{ background: "#1e3a5f" }}>
                  {saving ? "جاري الحفظ..." : "إضافة المورد"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

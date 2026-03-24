"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Check, X, Users, Eye } from "lucide-react";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";

interface Customer {
  id: number;
  name: string;
  phone: string;
  vatNumber: string;
  notes: string;
}

interface Session {
  role: string;
}

export default function CustomersPage() {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", vatNumber: "" });
  const [addSaving, setAddSaving] = useState(false);

  // Inline edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", vatNumber: "" });
  const [editSaving, setEditSaving] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSession(d?.userId ? d : null));
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (debouncedSearch) sp.set("search", debouncedSearch);
    const res = await fetch(`/api/customers?${sp}`);
    if (res.ok) {
      setCustomers(await res.json());
    }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setAddForm({ name: "", phone: "", vatNumber: "" });
      setShowAdd(false);
      toast.success("تمت إضافة العميل");
      fetchCustomers();
    } else {
      const data = await res.json();
      toast.error(data.error || "حدث خطأ");
    }
    setAddSaving(false);
  };

  const startEdit = (c: Customer) => {
    setEditId(c.id);
    setEditForm({ name: c.name, phone: c.phone, vatNumber: c.vatNumber });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({ name: "", phone: "", vatNumber: "" });
  };

  const handleSaveEdit = async (id: number) => {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditId(null);
      toast.success("تم تحديث بيانات العميل");
      fetchCustomers();
    } else {
      const data = await res.json();
      toast.error(data.error || "حدث خطأ");
    }
    setEditSaving(false);
  };

  const canEdit = session?.role !== "viewer";

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>
            إدارة العملاء
          </h1>
          <p className="text-slate-500 text-sm mt-1">{customers.length} عميل</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowAdd(true); setAddForm({ name: "", phone: "", vatNumber: "" }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "#1e3a5f" }}
          >
            <Plus size={16} />
            عميل جديد
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className={`${CARD} mb-5`}>
          <div
            className={CARD_HDR}
            style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}
          >
            <Users size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-700">إضافة عميل جديد</h2>
          </div>
          <form onSubmit={handleAdd} className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  الاسم <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="اسم العميل..."
                  className="w-full border-0 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  الجوال
                </label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  className="w-full border-0 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  الرقم الضريبي
                </label>
                <input
                  type="text"
                  value={addForm.vatNumber}
                  onChange={(e) => setAddForm((f) => ({ ...f, vatNumber: e.target.value }))}
                  placeholder="3xxxxxxxxxx3"
                  className="w-full border-0 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addSaving || !addForm.name.trim()}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                style={{ background: "#1e3a5f" }}
              >
                {addSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className={`${CARD} mb-5`}>
        <div className="p-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الجوال..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-0 bg-slate-50 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className={`${CARD} hidden md:block`}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">الاسم</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">الجوال</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">الرقم الضريبي</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  جاري التحميل...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <Users size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400">
                    {debouncedSearch ? "لا توجد نتائج للبحث" : "لا يوجد عملاء بعد"}
                  </p>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  {editId === c.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          autoFocus
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(c.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(c.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                          dir="ltr"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.vatNumber}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, vatNumber: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(c.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                          dir="ltr"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(c.id)}
                            disabled={editSaving}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                            title="حفظ"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
                            title="إلغاء"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs" dir="ltr">
                        {c.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs" dir="ltr">
                        {c.vatNumber || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Link
                            href={`/customers/${c.id}`}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
                            title="عرض"
                          >
                            <Eye size={14} className="text-blue-600" />
                          </Link>
                          {canEdit && (
                            <button
                              onClick={() => startEdit(c)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                              title="تعديل"
                            >
                              <Pencil size={14} className="text-slate-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className={`${CARD} p-6 text-center text-slate-400`}>جاري التحميل...</div>
        ) : customers.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">
              {debouncedSearch ? "لا توجد نتائج للبحث" : "لا يوجد عملاء بعد"}
            </p>
          </div>
        ) : (
          customers.map((c) => (
            <div key={c.id} className={CARD}>
              {editId === c.id ? (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">الاسم</label>
                    <input
                      autoFocus
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      الجوال
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      الرقم الضريبي
                    </label>
                    <input
                      type="text"
                      value={editForm.vatNumber}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, vatNumber: e.target.value }))
                      }
                      className="w-full border-0 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      disabled={editSaving}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                      style={{ background: "#1e3a5f" }}
                    >
                      {editSaving ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    {c.phone && (
                      <p className="text-sm text-slate-500 font-mono mt-0.5" dir="ltr">
                        {c.phone}
                      </p>
                    )}
                    {c.vatNumber && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
                        {c.vatNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Link
                      href={`/customers/${c.id}`}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition"
                      title="عرض"
                    >
                      <Eye size={14} className="text-blue-600" />
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => startEdit(c)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <Pencil size={14} className="text-slate-600" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

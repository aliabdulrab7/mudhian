"use client";
import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Pencil,
  Check,
  X,
  ShoppingBag,
  Wrench,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  Users,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";
const INPUT =
  "w-full border-0 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 outline-none";

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

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
};

interface SaleItem {
  sku: string;
  category: string;
  karat: number;
  price: number;
  discount: number;
}

interface Sale {
  id: number;
  invoiceNum: string;
  totalAmount: number;
  discountAmount: number;
  paymentMethod: string;
  createdAt: string;
  employeeName: string | null;
  items: SaleItem[];
}

interface RepairItem {
  id: number;
  itemDescription: string;
  status: string;
  estimatedCost: number;
  actualCost: number | null;
  receivedAt: string;
  deliveredAt: string | null;
  employeeName: string | null;
}

interface CustomerDetail {
  id: number;
  name: string;
  phone: string;
  vatNumber: string;
  notes: string;
  stats: {
    totalSales: number;
    totalSpent: number;
    totalRepairs: number;
    lastVisit: string | null;
  };
  sales: Sale[];
  repairs: RepairItem[];
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const fmt = useFormatCurrency();
  const toast = useToast();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    vatNumber: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Expanded sale rows
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserRole(d?.role || ""));
  }, []);

  const fetchCustomer = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`);
    if (res.ok) {
      const data: CustomerDetail = await res.json();
      setCustomer(data);
      setEditForm({
        name: data.name,
        phone: data.phone,
        vatNumber: data.vatNumber,
        notes: data.notes,
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const startEdit = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      vatNumber: customer.vatNumber,
      notes: customer.notes,
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      toast.success("تم تحديث بيانات العميل");
      setEditing(false);
      await fetchCustomer();
    } else {
      const data = await res.json();
      toast.error(data.error || "حدث خطأ");
    }
    setSaving(false);
  };

  const canEdit = userRole !== "viewer";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf1f8] flex items-center justify-center" dir="rtl">
        <p className="text-slate-400">جاري التحميل...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#edf1f8] flex items-center justify-center" dir="rtl">
        <p className="text-red-400">العميل غير موجود</p>
      </div>
    );
  }

  const lastVisitDisplay = customer.stats.lastVisit
    ? new Date(customer.stats.lastVisit).toLocaleDateString("ar-SA-u-nu-latn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header Card — navy gradient */}
        <div className={CARD}>
          <div
            className="px-5 py-5"
            style={{ background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)" }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Link
                  href="/customers"
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <ArrowRight size={18} />
                </Link>
                <div>
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="bg-white/20 text-white placeholder-white/50 border-0 rounded-xl px-3 py-1.5 text-lg font-bold focus:ring-2 focus:ring-white/40 outline-none w-full"
                        placeholder="اسم العميل"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, phone: e.target.value }))
                          }
                          className="bg-white/20 text-white placeholder-white/50 border-0 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/40 outline-none"
                          placeholder="الجوال"
                          dir="ltr"
                        />
                        <input
                          type="text"
                          value={editForm.vatNumber}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, vatNumber: e.target.value }))
                          }
                          className="bg-white/20 text-white placeholder-white/50 border-0 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/40 outline-none"
                          placeholder="الرقم الضريبي"
                          dir="ltr"
                        />
                      </div>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        rows={2}
                        className="bg-white/20 text-white placeholder-white/50 border-0 rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-white/40 outline-none resize-none w-full"
                        placeholder="ملاحظات..."
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-black text-white">{customer.name}</h1>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {customer.phone && (
                          <span className="text-white/75 text-sm font-mono" dir="ltr">
                            {customer.phone}
                          </span>
                        )}
                        {customer.vatNumber && (
                          <span className="text-white/60 text-xs font-mono" dir="ltr">
                            {customer.vatNumber}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving || !editForm.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      <Check size={15} />
                      {saving ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm font-semibold transition"
                    >
                      <X size={15} />
                      إلغاء
                    </button>
                  </>
                ) : (
                  canEdit && (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition"
                    >
                      <Pencil size={15} />
                      تعديل
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* إجمالي المشتريات */}
          <div
            className="rounded-2xl p-4 text-white shadow-[0_4px_24px_rgba(30,58,95,0.12)]"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
          >
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <ShoppingBag size={16} />
              <span className="text-xs font-medium">إجمالي المشتريات</span>
            </div>
            <p className="text-2xl font-black">{customer.stats.totalSales}</p>
            <p className="text-xs opacity-70 mt-0.5">فاتورة</p>
          </div>

          {/* إجمالي الإنفاق */}
          <div
            className="rounded-2xl p-4 text-white shadow-[0_4px_24px_rgba(30,58,95,0.12)]"
            style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
          >
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <DollarSign size={16} />
              <span className="text-xs font-medium">إجمالي الإنفاق</span>
            </div>
            <p className="text-lg font-black leading-tight">{fmt(customer.stats.totalSpent)}</p>
          </div>

          {/* طلبات الصيانة */}
          <div
            className="rounded-2xl p-4 text-white shadow-[0_4px_24px_rgba(30,58,95,0.12)]"
            style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
          >
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Wrench size={16} />
              <span className="text-xs font-medium">طلبات الصيانة</span>
            </div>
            <p className="text-2xl font-black">{customer.stats.totalRepairs}</p>
            <p className="text-xs opacity-70 mt-0.5">طلب</p>
          </div>

          {/* آخر زيارة */}
          <div
            className="rounded-2xl p-4 text-white shadow-[0_4px_24px_rgba(30,58,95,0.12)]"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Calendar size={16} />
              <span className="text-xs font-medium">آخر زيارة</span>
            </div>
            <p className="text-base font-black leading-tight">{lastVisitDisplay}</p>
          </div>
        </div>

        {/* Notes Section */}
        {customer.notes && (
          <div className={CARD}>
            <div
              className={CARD_HDR}
              style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}
            >
              <Users size={18} className="text-slate-500" />
              <h2 className="font-bold text-slate-700">ملاحظات</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{customer.notes}</p>
            </div>
          </div>
        )}

        {/* Sales History Card */}
        <div className={CARD}>
          <div
            className={CARD_HDR}
            style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}
          >
            <Receipt size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-700">سجل المبيعات</h2>
            <span className="mr-auto text-xs text-slate-400 font-medium">
              {customer.sales.length} فاتورة
            </span>
          </div>

          {customer.sales.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              لا توجد مبيعات مسجلة
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        رقم الفاتورة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        الموظف
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        طريقة الدفع
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        المبلغ
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.sales.map((sale) => (
                      <>
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() =>
                            setExpandedSaleId(
                              expandedSaleId === sale.id ? null : sale.id
                            )
                          }
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {sale.invoiceNum}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(sale.createdAt).toLocaleDateString(
                              "ar-SA-u-nu-latn",
                              { year: "numeric", month: "2-digit", day: "2-digit" }
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {sale.employeeName || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {fmt(sale.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {expandedSaleId === sale.id ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </td>
                        </tr>
                        {expandedSaleId === sale.id && (
                          <tr key={`${sale.id}-items`}>
                            <td colSpan={6} className="px-4 pb-4 pt-0">
                              <div className="bg-slate-50 rounded-xl p-3 mt-1">
                                {sale.items.length === 0 ? (
                                  <p className="text-xs text-slate-400 text-center py-2">
                                    لا توجد بنود
                                  </p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-500">
                                        <th className="text-right pb-2 font-semibold">
                                          رمز القطعة
                                        </th>
                                        <th className="text-right pb-2 font-semibold">
                                          الصنف
                                        </th>
                                        <th className="text-right pb-2 font-semibold">
                                          العيار
                                        </th>
                                        <th className="text-right pb-2 font-semibold">
                                          السعر
                                        </th>
                                        <th className="text-right pb-2 font-semibold">
                                          الخصم
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {sale.items.map((item) => (
                                        <tr key={item.sku}>
                                          <td className="py-1.5 font-mono text-slate-500">
                                            {item.sku}
                                          </td>
                                          <td className="py-1.5 text-slate-700">
                                            {item.category}
                                          </td>
                                          <td className="py-1.5 text-slate-600">
                                            {item.karat}K
                                          </td>
                                          <td className="py-1.5 font-semibold text-slate-800">
                                            {fmt(item.price)}
                                          </td>
                                          <td className="py-1.5 text-rose-600">
                                            {item.discount > 0
                                              ? `- ${fmt(item.discount)}`
                                              : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {customer.sales.map((sale) => (
                  <div key={sale.id}>
                    <button
                      className="w-full text-right px-4 py-4 hover:bg-slate-50 transition"
                      onClick={() =>
                        setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">
                            {fmt(sale.totalAmount)}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {sale.invoiceNum}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-slate-500">
                              {new Date(sale.createdAt).toLocaleDateString(
                                "ar-SA-u-nu-latn",
                                { year: "numeric", month: "2-digit", day: "2-digit" }
                              )}
                            </span>
                            {sale.employeeName && (
                              <span className="text-xs text-slate-500">
                                · {sale.employeeName}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                            </span>
                          </div>
                        </div>
                        {expandedSaleId === sale.id ? (
                          <ChevronUp size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedSaleId === sale.id && sale.items.length > 0 && (
                      <div className="px-4 pb-4">
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                          {sale.items.map((item) => (
                            <div
                              key={item.sku}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-medium text-slate-700">
                                  {item.category}
                                </span>
                                <span className="text-slate-400 mr-1">
                                  ({item.karat}K)
                                </span>
                                <span className="text-slate-400 font-mono mr-1">
                                  {item.sku}
                                </span>
                              </div>
                              <div className="text-left flex-shrink-0">
                                <span className="font-bold text-slate-800">
                                  {fmt(item.price)}
                                </span>
                                {item.discount > 0 && (
                                  <span className="text-rose-500 mr-1">
                                    {" "}
                                    - {fmt(item.discount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Repairs History Card */}
        <div className={CARD}>
          <div
            className={CARD_HDR}
            style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}
          >
            <Wrench size={18} className="text-amber-600" />
            <h2 className="font-bold text-slate-700">سجل الصيانة</h2>
            <span className="mr-auto text-xs text-slate-400 font-medium">
              {customer.repairs.length} طلب
            </span>
          </div>

          {customer.repairs.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400">
              لا توجد طلبات صيانة
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        رقم الطلب
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        القطعة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        الحالة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        التكلفة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        تاريخ الاستلام
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">
                        تاريخ التسليم
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.repairs.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-xs">#{r.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {r.itemDescription}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {r.actualCost != null ? fmt(r.actualCost) : fmt(r.estimatedCost)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(r.receivedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.deliveredAt
                            ? new Date(r.deliveredAt).toLocaleDateString("ar-SA-u-nu-latn", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {customer.repairs.map((r) => (
                  <div key={r.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-slate-800 text-sm flex-1 min-w-0">
                        {r.itemDescription}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                          STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>#{r.id}</span>
                      <span>
                        التكلفة:{" "}
                        <span className="font-semibold text-slate-700">
                          {r.actualCost != null
                            ? fmt(r.actualCost)
                            : fmt(r.estimatedCost)}
                        </span>
                      </span>
                      <span>
                        الاستلام:{" "}
                        {new Date(r.receivedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                      {r.deliveredAt && (
                        <span>
                          التسليم:{" "}
                          {new Date(r.deliveredAt).toLocaleDateString("ar-SA-u-nu-latn", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </span>
                      )}
                      {r.employeeName && <span>الموظف: {r.employeeName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

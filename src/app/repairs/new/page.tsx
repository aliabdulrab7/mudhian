"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 outline-none";
const LABEL = "block text-sm font-semibold text-slate-600 mb-1.5";

interface Branch { id: number; name: string; }
interface Employee { id: number; name: string; isActive: boolean; }
interface CustomerSuggestion { id: number; name: string; phone: string; }

export default function NewRepairPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [userBranchId, setUserBranchId] = useState<number | null>(null);

  const [form, setForm] = useState({
    branchId: "",
    customerName: "",
    customerPhone: "",
    customerId: "",
    employeeId: "",
    itemDescription: "",
    receivedCondition: "",
    estimatedCost: "",
    estimatedReady: "",
    notes: "",
  });

  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data) {
        setUserRole(data.role);
        if (data.role === "branch") {
          setUserBranchId(data.branchId);
          setForm(f => ({ ...f, branchId: String(data.branchId) }));
          fetch(`/api/branches/${data.branchId}/employees`)
            .then(r => r.ok ? r.json() : [])
            .then(setEmployees);
        }
      }
    });
    if (userRole !== "branch") {
      fetch("/api/branches").then(r => r.ok ? r.json() : []).then(setBranches);
    }
  }, [userRole]);

  useEffect(() => {
    if (form.branchId && userRole === "admin") {
      fetch(`/api/branches/${form.branchId}/employees`)
        .then(r => r.ok ? r.json() : [])
        .then(setEmployees);
    }
  }, [form.branchId, userRole]);

  const searchCustomers = async (q: string) => {
    if (q.length < 2) { setCustomerSuggestions([]); return; }
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
    if (res.ok) setCustomerSuggestions(await res.json());
  };

  const handleCustomerInput = (v: string) => {
    setCustomerQuery(v);
    setForm(f => ({ ...f, customerName: v, customerId: "" }));
    setShowSuggestions(true);
    searchCustomers(v);
  };

  const selectCustomer = (c: CustomerSuggestion) => {
    setCustomerQuery(c.name);
    setForm(f => ({ ...f, customerName: c.name, customerPhone: c.phone, customerId: String(c.id) }));
    setCustomerSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.itemDescription.trim()) { setError("يجب إدخال وصف الصنف"); return; }
    const branchId = userRole === "branch" ? userBranchId : parseInt(form.branchId);
    if (!branchId) { setError("يجب اختيار الفرع"); return; }

    setSaving(true);
    const body = {
      branchId,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      customerId: form.customerId ? parseInt(form.customerId) : undefined,
      employeeId: form.employeeId ? parseInt(form.employeeId) : undefined,
      itemDescription: form.itemDescription,
      receivedCondition: form.receivedCondition,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : 0,
      estimatedReady: form.estimatedReady || undefined,
      notes: form.notes,
    };

    const res = await fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/repairs/${data.id}`);
    } else {
      setError((await res.json()).error || "حدث خطأ");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/repairs" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
          <ArrowRight size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-800">استلام صيانة جديدة</h1>
          <p className="text-sm text-slate-400 mt-0.5">تسجيل قطعة للإصلاح</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Branch & Employee */}
        <div className={CARD}>
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-orange-500" />
              <h2 className="font-bold text-slate-700">معلومات الفرع</h2>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userRole === "admin" && (
              <div>
                <label className={LABEL}>الفرع *</label>
                <select
                  value={form.branchId}
                  onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                  className={INPUT}
                  required
                >
                  <option value="">اختر الفرع</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={LABEL}>الموظف المستلم</label>
              <select
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className={INPUT}
              >
                <option value="">اختياري</option>
                {employees.filter(e => e.isActive !== false).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className={CARD}>
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <h2 className="font-bold text-slate-700">بيانات العميل</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className={LABEL}>اسم العميل</label>
              <input
                type="text"
                value={customerQuery}
                onChange={e => handleCustomerInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="ابحث أو أدخل اسم جديد"
                className={INPUT}
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                  {customerSuggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-right px-4 py-3 hover:bg-slate-50 transition text-sm border-b border-slate-50 last:border-0"
                    >
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={LABEL}>رقم الجوال</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                placeholder="05xxxxxxxx"
                className={INPUT}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Item Details */}
        <div className={CARD}>
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <h2 className="font-bold text-slate-700">تفاصيل الصنف</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={LABEL}>وصف الصنف *</label>
              <input
                type="text"
                value={form.itemDescription}
                onChange={e => setForm(f => ({ ...f, itemDescription: e.target.value }))}
                placeholder="مثال: خاتم ذهب 21 قيراط — مشبوك"
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className={LABEL}>حالة الاستلام</label>
              <textarea
                value={form.receivedCondition}
                onChange={e => setForm(f => ({ ...f, receivedCondition: e.target.value }))}
                placeholder="وصف حالة الصنف عند الاستلام..."
                rows={2}
                className={INPUT + " resize-none"}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>التكلفة التقديرية (ر.س)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedCost}
                  onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))}
                  placeholder="0.00"
                  className={INPUT}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={LABEL}>موعد الاستلام المتوقع</label>
                <input
                  type="date"
                  value={form.estimatedReady}
                  onChange={e => setForm(f => ({ ...f, estimatedReady: e.target.value }))}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="ملاحظات إضافية..."
                rows={2}
                className={INPUT + " resize-none"}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-navy text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "استلام الصنف"}
          </button>
          <Link href="/repairs"
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition text-center">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  );
}

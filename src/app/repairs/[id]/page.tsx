"use client";
import { useEffect, useState, use, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight, Wrench, Clock, CheckCircle2, Truck, Printer,
  Search, X, UserCheck,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-300 outline-none";
const LABEL = "block text-sm font-semibold text-slate-600 mb-1.5";

interface StatusLog {
  id: number;
  status: string;
  note: string;
  changedAt: string;
  changedBy: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Employee {
  id: number;
  name: string;
  isActive: boolean;
}

interface Repair {
  id: number;
  itemDescription: string;
  receivedCondition: string;
  status: string;
  estimatedCost: number;
  actualCost: number | null;
  estimatedReady: string | null;
  deliveredAt: string | null;
  notes: string;
  createdAt: string;
  branchId: number;
  customerId: number | null;
  employeeId: number | null;
  customer: { id: number; name: string; phone: string } | null;
  employee: { name: string } | null;
  branch: { name: string };
  statusLogs: StatusLog[];
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

const STATUS_FLOW = ["received", "in_progress", "completed", "delivered"];
const STATUS_NEXT_LABEL: Record<string, string> = {
  received: "بدء الإصلاح",
  in_progress: "إتمام الإصلاح",
  completed: "تسليم للعميل",
};

export default function RepairDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const fmt = useFormatCurrency();
  const toast = useToast();

  // Edit form state
  const [editForm, setEditForm] = useState({
    estimatedCost: "",
    actualCost: "",
    estimatedReady: "",
    notes: "",
    employeeId: "" as string | number,
  });

  // Customer search/change
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Auto-save state
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => setUserRole(d?.role || ""));
  }, []);

  const fetchRepair = useCallback(async () => {
    const res = await fetch(`/api/repairs/${id}`);
    if (res.ok) {
      const data: Repair = await res.json();
      setRepair(data);
      setEditForm({
        estimatedCost: String(data.estimatedCost),
        actualCost: data.actualCost != null ? String(data.actualCost) : "",
        estimatedReady: data.estimatedReady ? data.estimatedReady.split("T")[0] : "",
        notes: data.notes ?? "",
        employeeId: data.employeeId ?? "",
      });
      // Fetch employees for this branch
      if (data.branchId) {
        const empRes = await fetch(`/api/branches/${data.branchId}/employees`);
        if (empRes.ok) setEmployees(await empRes.json());
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchRepair(); }, [fetchRepair]);

  // Customer search with debounce
  useEffect(() => {
    if (!showCustomerSearch) return;
    if (customerTimer.current) clearTimeout(customerTimer.current);
    if (!customerSearch.trim()) { setCustomerResults([]); return; }
    customerTimer.current = setTimeout(async () => {
      setCustomerSearching(true);
      const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`);
      if (res.ok) setCustomerResults(await res.json());
      setCustomerSearching(false);
    }, 300);
    return () => { if (customerTimer.current) clearTimeout(customerTimer.current); };
  }, [customerSearch, showCustomerSearch]);

  // Auto-save on blur
  const autoSave = useCallback(async (patch: Record<string, unknown>) => {
    setAutoSaving(true);
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setLastSaved(true);
      setTimeout(() => setLastSaved(false), 2000);
      const updated: Repair = await res.json();
      setRepair(updated);
    }
    setAutoSaving(false);
  }, [id]);

  const handleBlurEstimatedCost = () => {
    const val = parseFloat(editForm.estimatedCost) || 0;
    if (repair && val !== repair.estimatedCost) autoSave({ estimatedCost: val });
  };
  const handleBlurActualCost = () => {
    const val = editForm.actualCost ? parseFloat(editForm.actualCost) : null;
    if (repair && val !== repair.actualCost) autoSave({ actualCost: val });
  };
  const handleBlurEstimatedReady = () => {
    const val = editForm.estimatedReady || null;
    const existing = repair?.estimatedReady ? repair.estimatedReady.split("T")[0] : null;
    if (val !== existing) autoSave({ estimatedReady: val });
  };
  const handleBlurNotes = () => {
    if (repair && editForm.notes !== (repair.notes ?? "")) autoSave({ notes: editForm.notes });
  };
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setEditForm(f => ({ ...f, employeeId: val }));
    autoSave({ employeeId: val ? parseInt(val) : null });
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setShowCustomerSearch(false);
    setCustomerSearch("");
    setCustomerResults([]);
    // PATCH the repair to update customerId
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id }),
    });
    if (res.ok) {
      toast.success(`تم تغيير العميل إلى ${customer.name}`);
      const updated: Repair = await res.json();
      setRepair(updated);
    } else {
      toast.error("تعذّر تغيير العميل");
    }
  };

  // Status advance
  const currentIdx = repair ? STATUS_FLOW.indexOf(repair.status) : -1;
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIdx + 1]
    : null;

  const handleStatusUpdate = async () => {
    if (!nextStatus) return;
    setUpdatingStatus(true);
    const res = await fetch(`/api/repairs/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note: statusNote }),
    });
    if (res.ok) {
      setStatusNote("");
      setShowStatusModal(false);
      toast.success(`تم تحديث الحالة إلى: ${STATUS_LABELS[nextStatus]}`);
      await fetchRepair();
    } else {
      toast.error("فشل تحديث الحالة");
    }
    setUpdatingStatus(false);
  };

  if (loading) return <div className="text-center py-16 text-slate-400">جاري التحميل...</div>;
  if (!repair) return <div className="text-center py-16 text-red-400">طلب الصيانة غير موجود</div>;

  const isDelivered = repair.status === "delivered";
  const canEdit = userRole !== "viewer";
  const activeEmployees = employees.filter(e => e.isActive);

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/repairs" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <ArrowRight size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-800">صيانة #{repair.id}</h1>
            <p className="text-sm text-slate-400">{repair.branch.name} · {new Date(repair.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          {autoSaving && <span className="text-xs text-slate-400 self-center">جاري الحفظ...</span>}
          {lastSaved && <span className="text-xs text-emerald-600 self-center font-medium">✓ تم الحفظ</span>}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-sm hover:bg-slate-200 transition"
          >
            <Printer size={14} /> طباعة
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className={CARD}>
        <div className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${STATUS_COLORS[repair.status]}`}>
              {repair.status === "received" && <Clock size={14} />}
              {repair.status === "in_progress" && <Wrench size={14} />}
              {repair.status === "completed" && <CheckCircle2 size={14} />}
              {repair.status === "delivered" && <Truck size={14} />}
              {STATUS_LABELS[repair.status]}
            </span>
            {/* Progress bar */}
            <div className="flex gap-1.5">
              {STATUS_FLOW.map((s, i) => (
                <div
                  key={s}
                  title={STATUS_LABELS[s]}
                  className={`h-2 w-10 rounded-full transition ${i <= currentIdx ? "bg-navy" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>

          {/* Status advance button */}
          {canEdit && !isDelivered && nextStatus && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="mt-4 w-full py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition"
              style={{ background: "#1e3a5f" }}
            >
              {STATUS_NEXT_LABEL[repair.status] || `تحديث إلى: ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
        </div>
      </div>

      {/* Details / Edit Card */}
      <div className={CARD}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <h2 className="font-bold text-slate-700">تفاصيل الصيانة</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Item description & condition (read-only) */}
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">وصف الصنف</span>
            <span className="font-semibold text-slate-800">{repair.itemDescription}</span>
          </div>
          {repair.receivedCondition && (
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">حالة الاستلام</span>
              <span className="text-slate-600 text-sm">{repair.receivedCondition}</span>
            </div>
          )}

          {/* Editable fields — auto-save on blur */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <label className={LABEL}>التكلفة التقديرية</label>
              <input
                type="number"
                value={editForm.estimatedCost}
                onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))}
                onBlur={handleBlurEstimatedCost}
                className={INPUT}
                dir="ltr"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className={LABEL}>التكلفة الفعلية</label>
              <input
                type="number"
                value={editForm.actualCost}
                onChange={e => setEditForm(f => ({ ...f, actualCost: e.target.value }))}
                onBlur={handleBlurActualCost}
                className={INPUT}
                dir="ltr"
                placeholder="اختياري"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>موعد الاستلام المتوقع</label>
            <input
              type="date"
              value={editForm.estimatedReady}
              onChange={e => setEditForm(f => ({ ...f, estimatedReady: e.target.value }))}
              onBlur={handleBlurEstimatedReady}
              className={INPUT}
              disabled={!canEdit}
            />
          </div>

          {/* Employee dropdown */}
          {canEdit && (
            <div>
              <label className={LABEL}>الموظف المسؤول</label>
              <select
                value={String(editForm.employeeId)}
                onChange={handleEmployeeChange}
                className={INPUT}
              >
                <option value="">— غير محدد —</option>
                {activeEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}
          {!canEdit && repair.employee && (
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">الموظف</span>
              <span className="font-semibold text-slate-700">{repair.employee.name}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={LABEL}>ملاحظات</label>
            <textarea
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              onBlur={handleBlurNotes}
              rows={3}
              className={INPUT + " resize-none"}
              disabled={!canEdit}
              placeholder="ملاحظات على الصيانة..."
            />
          </div>

          {/* Cost summary (read only) */}
          {!canEdit && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">التكلفة التقديرية</span>
                <span className="font-bold text-slate-800">{fmt(repair.estimatedCost)}</span>
              </div>
              {repair.actualCost != null && (
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">التكلفة الفعلية</span>
                  <span className="font-bold text-emerald-700">{fmt(repair.actualCost)}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">موعد الاستلام</span>
                <span className="font-semibold text-slate-700">
                  {repair.estimatedReady
                    ? new Date(repair.estimatedReady).toLocaleDateString("ar-SA-u-nu-latn")
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Card */}
      <div className={CARD}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700">العميل</h2>
            {canEdit && (
              <button
                onClick={() => { setShowCustomerSearch(v => !v); setCustomerSearch(""); setCustomerResults([]); }}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                <UserCheck size={13} /> تغيير العميل
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          {repair.customer ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">الاسم</span>
                <span className="font-semibold text-slate-800">{repair.customer.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">الجوال</span>
                <span className="font-semibold text-slate-800 font-mono" dir="ltr">{repair.customer.phone || "—"}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-2">لم يُحدد عميل</p>
          )}

          {/* Customer search panel */}
          {showCustomerSearch && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="relative mb-3">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="ابحث باسم العميل أو الجوال..."
                  className="w-full border-0 bg-slate-50 rounded-xl py-2.5 pr-9 pl-3 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
                {customerSearch && (
                  <button onClick={() => setCustomerSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>
              {customerSearching && <p className="text-xs text-slate-400 text-center py-2">جاري البحث...</p>}
              {!customerSearching && customerResults.length === 0 && customerSearch && (
                <p className="text-xs text-slate-400 text-center py-2">لا توجد نتائج</p>
              )}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {customerResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-400 font-mono" dir="ltr">{c.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status History */}
      <div className={CARD}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <h2 className="font-bold text-slate-700">سجل الحالة</h2>
        </div>
        <div className="p-5">
          {repair.statusLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">لا يوجد سجل بعد</p>
          ) : (
            <div className="space-y-3">
              {repair.statusLogs.map((log, i) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${i === repair.statusLogs.length - 1 ? "bg-navy" : "bg-slate-300"}`} />
                    {i < repair.statusLogs.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[log.status]}`}>
                        {STATUS_LABELS[log.status]}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.changedAt).toLocaleDateString("ar-SA-u-nu-latn", {
                          year: "numeric", month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.note && <p className="text-sm text-slate-600 mt-1">{log.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && nextStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-black text-slate-800 mb-1">
              {STATUS_NEXT_LABEL[repair.status] || "تحديث الحالة"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              تحديث الحالة إلى:{" "}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[nextStatus]}`}>
                {STATUS_LABELS[nextStatus]}
              </span>
            </p>
            <label className={LABEL}>ملاحظة (اختياري)</label>
            <textarea
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="أضف ملاحظة للتحديث..."
              rows={3}
              className={INPUT + " resize-none mb-4"}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition hover:opacity-90"
                style={{ background: "#1e3a5f" }}
              >
                {updatingStatus ? "جاري التحديث..." : "تأكيد التحديث"}
              </button>
              <button
                onClick={() => { setShowStatusModal(false); setStatusNote(""); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}

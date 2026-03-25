"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Edit2, Save, X, Gem, Trash2 } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-violet-300 focus:outline-none";
const INPUT_DISABLED = "w-full border-0 bg-slate-100 rounded-xl py-2 px-3 text-sm text-slate-500 cursor-not-allowed";

interface DiamondStone {
  id: number; sku: string; caratWeight: number; color: string; clarity: string;
  cut: string; shape: string; certificateNum: string; certBody: string;
  origin: string; cost: number; salePrice: number; status: string;
  branchId: number; supplierId: number | null; notes: string;
  createdAt: string; updatedAt: string;
  branch?: { name: string };
  supplier?: { id: number; name: string } | null;
}
interface Session { role: string; branchId?: number; }
interface Supplier { id: number; name: string; }

const STATUS_LABEL: Record<string, string> = { available: "متاح", sold: "مباع", mounted: "مركب" };
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
const CUTS = ["Excellent", "Very Good", "Good", "Fair", "Poor"];
const CUT_AR: Record<string, string> = {
  Excellent: "ممتاز", "Very Good": "جيد جداً", Good: "جيد", Fair: "مقبول", Poor: "ضعيف",
};
const CERT_BODIES = ["GIA", "IGI", "HRD", "AGS"];

// Grade colour helpers
function colorGrade(c: string) {
  const idx = COLORS.indexOf(c);
  if (idx < 3) return "text-blue-700";
  if (idx < 6) return "text-emerald-700";
  return "text-slate-600";
}
function clarityGrade(c: string) {
  const idx = CLARITIES.indexOf(c);
  if (idx < 2) return "text-blue-700";
  if (idx < 4) return "text-emerald-700";
  return "text-slate-600";
}

export default function DiamondDetailPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = use(params);
  const router = useRouter();
  const fmt = useFormatCurrency();
  const toast = useToast();
  const [stone, setStone] = useState<DiamondStone | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<Partial<DiamondStone>>({});

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(setSession);
    fetch("/api/suppliers?isActive=true").then(r => r.ok ? r.json() : []).then(setSuppliers);
    fetch(`/api/diamonds/${sku}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setStone(d); setForm(d ?? {}); setLoading(false); });
  }, [sku]);

  const set = (k: string, v: string | number | null) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/diamonds/${sku}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setStone(updated);
      setForm(updated);
      setEditing(false);
      toast.success("تم الحفظ");
    } else {
      toast.error("فشل الحفظ");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/diamonds/${sku}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("تم الحذف");
      router.push("/diamonds");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "فشل الحذف");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400" dir="rtl">جاري التحميل...</main>;
  if (!stone) return <main className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-400" dir="rtl">الحجر غير موجود</main>;

  const canEdit = session?.role === "admin" || (session?.role === "branch" && stone.branchId === session.branchId);
  const canDelete = session?.role === "admin" && stone.status === "available";
  const margin = stone.cost > 0 ? ((stone.salePrice - stone.cost) / stone.cost * 100) : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-20 sm:pb-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowRight size={18} className="text-slate-600" />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <Gem size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 font-mono">{stone.sku}</h1>
          <p className="text-xs text-slate-500">{stone.caratWeight.toFixed(2)} قيراط · {SHAPE_AR[stone.shape] ?? stone.shape}</p>
        </div>
        <span className={`mr-auto px-3 py-1 rounded-xl text-xs font-bold ${STATUS_COLOR[stone.status] ?? "bg-slate-100 text-slate-600"}`}>
          {STATUS_LABEL[stone.status] ?? stone.status}
        </span>
      </div>

      {/* 4Cs summary bar */}
      <div className={`${CARD} mb-4`}>
        <div className="px-5 py-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">الوزن</p>
            <p className="font-black text-slate-800 text-lg">{stone.caratWeight.toFixed(2)}</p>
            <p className="text-xs text-slate-400">قيراط</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">اللون</p>
            <p className={`font-black text-2xl font-mono ${colorGrade(stone.color)}`}>{stone.color || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">النقاوة</p>
            <p className={`font-black text-lg font-mono ${clarityGrade(stone.clarity)}`}>{stone.clarity || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">القطع</p>
            <p className="font-black text-slate-800 text-sm">{(CUT_AR[stone.cut] ?? stone.cut) || "—"}</p>
          </div>
        </div>
      </div>

      {/* Edit / Delete actions */}
      {canEdit && !editing && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
            <Edit2 size={15} />تعديل
          </button>
          {canDelete && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-red-500 text-sm font-bold hover:bg-red-50 transition-colors">
              <Trash2 size={15} />حذف
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-sm">
              <span className="text-red-700 font-bold">تأكيد الحذف؟</span>
              <button onClick={handleDelete} disabled={deleting} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60">
                {deleting ? "..." : "نعم، احذف"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 rounded-lg bg-white text-slate-600 text-xs font-bold">إلغاء</button>
            </div>
          )}
        </div>
      )}

      {editing ? (
        /* ── Edit form ── */
        <div className="space-y-4">
          <div className={CARD}>
            <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #faf5ff, #f3e8ff)" }}>
              <p className="font-black text-slate-800 text-sm">تعديل البيانات</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الوزن (قيراط)</label>
                <input type="number" step="0.01" value={form.caratWeight ?? ""} onChange={e => set("caratWeight", Number(e.target.value))} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الشكل</label>
                <select value={form.shape ?? ""} onChange={e => set("shape", e.target.value)} className={INPUT}>
                  {SHAPES.map(s => <option key={s} value={s}>{SHAPE_AR[s] ?? s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">اللون</label>
                <select value={form.color ?? ""} onChange={e => set("color", e.target.value)} className={INPUT}>
                  <option value="">—</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">النقاوة</label>
                <select value={form.clarity ?? ""} onChange={e => set("clarity", e.target.value)} className={INPUT}>
                  <option value="">—</option>
                  {CLARITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">القطع</label>
                <select value={form.cut ?? ""} onChange={e => set("cut", e.target.value)} className={INPUT}>
                  <option value="">—</option>
                  {CUTS.map(c => <option key={c} value={c}>{CUT_AR[c] ?? c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">المنشأ</label>
                <input type="text" value={form.origin ?? ""} onChange={e => set("origin", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">جهة الشهادة</label>
                <select value={form.certBody ?? ""} onChange={e => set("certBody", e.target.value)} className={INPUT}>
                  <option value="">بدون</option>
                  {CERT_BODIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">رقم الشهادة</label>
                <input type="text" value={form.certificateNum ?? ""} onChange={e => set("certificateNum", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">التكلفة (ر.س)</label>
                <input type="number" step="0.01" value={form.cost ?? ""} onChange={e => set("cost", Number(e.target.value))} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">سعر البيع (ر.س)</label>
                <input type="number" step="0.01" value={form.salePrice ?? ""} onChange={e => set("salePrice", Number(e.target.value))} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الحالة</label>
                <select value={form.status ?? ""} onChange={e => set("status", e.target.value)} className={INPUT}>
                  <option value="available">متاح</option>
                  <option value="mounted">مركب</option>
                  <option value="sold">مباع</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">المورد</label>
                <select value={form.supplierId ?? ""} onChange={e => set("supplierId", e.target.value ? Number(e.target.value) : null)} className={INPUT}>
                  <option value="">بدون مورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
                <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} className={INPUT} rows={2} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditing(false); setForm(stone); }}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
              <X size={16} />إلغاء
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              <Save size={16} />{saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <div className="space-y-4">
          {/* Details */}
          <div className={CARD}>
            <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <p className="font-black text-slate-800 text-sm">تفاصيل الحجر</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Row label="SKU" value={<span className="font-mono text-violet-700">{stone.sku}</span>} />
              <Row label="الشكل" value={SHAPE_AR[stone.shape] ?? stone.shape} />
              <Row label="اللون" value={<span className={`font-mono font-bold ${colorGrade(stone.color)}`}>{stone.color || "—"}</span>} />
              <Row label="النقاوة" value={<span className={`font-mono font-bold ${clarityGrade(stone.clarity)}`}>{stone.clarity || "—"}</span>} />
              <Row label="القطع" value={(CUT_AR[stone.cut] ?? stone.cut) || "—"} />
              <Row label="المنشأ" value={stone.origin || "—"} />
              <Row label="الشهادة" value={stone.certBody ? `${stone.certBody} ${stone.certificateNum}` : stone.certificateNum || "—"} />
              <Row label="الفرع" value={stone.branch?.name ?? "—"} />
              <Row label="المورد" value={stone.supplier?.name ?? "—"} />
              <Row label="تاريخ الإضافة" value={new Date(stone.createdAt).toLocaleDateString("ar-SA")} />
            </div>
          </div>

          {/* Pricing */}
          <div className={CARD}>
            <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
              <p className="font-black text-slate-800 text-sm">التسعير</p>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400 mb-1">التكلفة</p>
                <p className="font-black text-slate-800 text-lg">{fmt(stone.cost)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">سعر البيع</p>
                <p className="font-black text-slate-800 text-lg">{fmt(stone.salePrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">هامش الربح</p>
                <p className={`font-black text-lg ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {margin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {stone.notes && (
            <div className={`${CARD} px-5 py-4`}>
              <p className="text-xs text-slate-400 mb-1">ملاحظات</p>
              <p className="text-sm text-slate-700">{stone.notes}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  );
}

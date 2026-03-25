"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Gem } from "lucide-react";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-violet-300 focus:outline-none";
const LABEL = "block text-sm font-medium text-slate-700 mb-1";

interface Branch { id: number; name: string; }
interface Session { role: string; branchId?: number; }
interface Supplier { id: number; name: string; }

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
const CERT_BODIES = ["GIA", "IGI", "HRD", "AGS", ""];

export default function NewDiamondPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    caratWeight: "",
    color: "G",
    clarity: "VS1",
    cut: "Excellent",
    shape: "Round",
    certificateNum: "",
    certBody: "GIA",
    origin: "",
    cost: "",
    salePrice: "",
    branchId: "",
    supplierId: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(s => {
      setSession(s);
      if (s?.role === "branch" && s.branchId) {
        setForm(f => ({ ...f, branchId: String(s.branchId) }));
      }
    });
    fetch("/api/branches").then(r => r.ok ? r.json() : []).then(setBranches);
    fetch("/api/suppliers?isActive=true").then(r => r.ok ? r.json() : []).then(setSuppliers);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.branchId) { setError("اختر الفرع"); return; }
    if (!form.caratWeight || isNaN(Number(form.caratWeight))) { setError("أدخل وزن القيراط"); return; }
    if (!form.cost) { setError("أدخل التكلفة"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/diamonds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          caratWeight: Number(form.caratWeight),
          cost: Number(form.cost),
          salePrice: Number(form.salePrice) || 0,
          branchId: Number(form.branchId),
          supplierId: form.supplierId ? Number(form.supplierId) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/diamonds/${data.sku}`);
      } else {
        const err = await res.json();
        setError(err.error ?? "فشل الحفظ");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-20 sm:pb-5" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowRight size={18} className="text-slate-600" />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <Gem size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-800">إضافة ماسة جديدة</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 4Cs */}
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #faf5ff, #f3e8ff)" }}>
            <p className="font-black text-slate-800 text-sm">خصائص الحجر (4Cs)</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>الوزن (قيراط) *</label>
              <input type="number" step="0.01" min="0" required value={form.caratWeight}
                onChange={e => set("caratWeight", e.target.value)} className={INPUT} placeholder="1.00" />
            </div>
            <div>
              <label className={LABEL}>الشكل</label>
              <select value={form.shape} onChange={e => set("shape", e.target.value)} className={INPUT}>
                {SHAPES.map(s => <option key={s} value={s}>{SHAPE_AR[s] ?? s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>اللون</label>
              <select value={form.color} onChange={e => set("color", e.target.value)} className={INPUT}>
                <option value="">غير محدد</option>
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>النقاوة</label>
              <select value={form.clarity} onChange={e => set("clarity", e.target.value)} className={INPUT}>
                <option value="">غير محدد</option>
                {CLARITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>القطع</label>
              <select value={form.cut} onChange={e => set("cut", e.target.value)} className={INPUT}>
                <option value="">غير محدد</option>
                {CUTS.map(c => <option key={c} value={c}>{CUT_AR[c] ?? c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>المنشأ</label>
              <input type="text" value={form.origin} onChange={e => set("origin", e.target.value)}
                className={INPUT} placeholder="روسيا، جنوب أفريقيا..." />
            </div>
          </div>
        </div>

        {/* Certificate */}
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <p className="font-black text-slate-800 text-sm">الشهادة</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>جهة الإصدار</label>
              <select value={form.certBody} onChange={e => set("certBody", e.target.value)} className={INPUT}>
                <option value="">بدون شهادة</option>
                {CERT_BODIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>رقم الشهادة</label>
              <input type="text" value={form.certificateNum} onChange={e => set("certificateNum", e.target.value)}
                className={INPUT} placeholder="6178510858" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
            <p className="font-black text-slate-800 text-sm">التسعير</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>التكلفة (ر.س) *</label>
              <input type="number" step="0.01" min="0" required value={form.cost}
                onChange={e => set("cost", e.target.value)} className={INPUT} placeholder="0.00" />
            </div>
            <div>
              <label className={LABEL}>سعر البيع (ر.س)</label>
              <input type="number" step="0.01" min="0" value={form.salePrice}
                onChange={e => set("salePrice", e.target.value)} className={INPUT} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Branch & Supplier */}
        <div className={CARD}>
          <div className="px-5 py-4 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <p className="font-black text-slate-800 text-sm">الفرع والمورد</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>الفرع *</label>
              <select value={form.branchId} onChange={e => set("branchId", e.target.value)}
                className={INPUT} disabled={session?.role === "branch"}>
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>المورد</label>
              <select value={form.supplierId} onChange={e => set("supplierId", e.target.value)} className={INPUT}>
                <option value="">بدون مورد</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>ملاحظات</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                className={INPUT} rows={2} placeholder="أي ملاحظات إضافية..." />
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <Save size={16} />
            {saving ? "جاري الحفظ..." : "حفظ الماسة"}
          </button>
        </div>
      </form>
    </main>
  );
}

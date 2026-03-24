"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none";
const LABEL = "block text-sm font-medium text-slate-700 mb-1";

interface Branch { id: number; name: string; }
interface Session { role: string; branchId?: number; }
interface Supplier { id: number; name: string; }

const CATEGORIES = ["خاتم", "سواره", "عقد", "حلق", "طقم", "أخرى"];
const METAL_TYPES = [{ value: "gold", label: "ذهب" }, { value: "silver", label: "فضة" }, { value: "platinum", label: "بلاتين" }];
const KARATS = [18, 21, 22, 24];

export default function NewInventoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: "خاتم",
    metalType: "gold",
    karat: 18,
    grossWeight: "",
    netWeight: "",
    stoneType: "",
    stoneWeight: "",
    stoneCount: "",
    stoneValue: "",
    makingCharges: "",
    cost: "",
    salePrice: "",
    margin: "",
    supplierId: "",
    notes: "",
    branchId: "",
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

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        ...form,
        karat: Number(form.karat),
        grossWeight: Number(form.grossWeight) || 0,
        netWeight: Number(form.netWeight) || 0,
        stoneWeight: Number(form.stoneWeight) || 0,
        stoneCount: Number(form.stoneCount) || 0,
        stoneValue: Number(form.stoneValue) || 0,
        makingCharges: Number(form.makingCharges) || 0,
        cost: Number(form.cost) || 0,
        salePrice: Number(form.salePrice) || 0,
        margin: Number(form.margin) || 0,
        branchId: Number(form.branchId),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "حدث خطأ");
        return;
      }
      const item = await res.json();
      router.push(`/inventory/${item.sku}`);
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf1f8] p-4 sm:p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50">
            <ArrowRight size={18} className="text-slate-600" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>إضافة قطعة جديدة</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`${CARD} mb-4`}>
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <h2 className="font-bold text-slate-700">بيانات القطعة</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {/* Branch */}
              {session?.role === "admin" && (
                <div className="col-span-2">
                  <label className={LABEL}>الفرع *</label>
                  <select value={form.branchId} onChange={e => set("branchId", e.target.value)} className={INPUT} required>
                    <option value="">اختر الفرع</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={LABEL}>الصنف *</label>
                <select value={form.category} onChange={e => set("category", e.target.value)} className={INPUT} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>نوع المعدن</label>
                <select value={form.metalType} onChange={e => set("metalType", e.target.value)} className={INPUT}>
                  {METAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>العيار</label>
                <select value={form.karat} onChange={e => set("karat", e.target.value)} className={INPUT}>
                  {KARATS.map(k => <option key={k} value={k}>{k}K</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>الوزن الإجمالي (جرام)</label>
                <input type="number" step="0.01" min="0" value={form.grossWeight} onChange={e => set("grossWeight", e.target.value)} className={INPUT} placeholder="0.00" />
              </div>

              <div>
                <label className={LABEL}>الوزن الصافي (جرام)</label>
                <input type="number" step="0.01" min="0" value={form.netWeight} onChange={e => set("netWeight", e.target.value)} className={INPUT} placeholder="0.00" />
              </div>

              <div>
                <label className={LABEL}>المورد</label>
                <select value={form.supplierId} onChange={e => set("supplierId", e.target.value)} className={INPUT}>
                  <option value="">بدون مورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={`${CARD} mb-4`}>
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <h2 className="font-bold text-slate-700">الأحجار الكريمة</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>نوع الحجر</label>
                <input type="text" value={form.stoneType} onChange={e => set("stoneType", e.target.value)} className={INPUT} placeholder="الماس، ياقوت..." />
              </div>
              <div>
                <label className={LABEL}>عدد الأحجار</label>
                <input type="number" min="0" value={form.stoneCount} onChange={e => set("stoneCount", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>وزن الحجر (قيراط)</label>
                <input type="number" step="0.01" min="0" value={form.stoneWeight} onChange={e => set("stoneWeight", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>قيمة الحجر (ريال)</label>
                <input type="number" step="0.01" min="0" value={form.stoneValue} onChange={e => set("stoneValue", e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          <div className={`${CARD} mb-4`}>
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
              <h2 className="font-bold text-slate-700">التسعير</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>أجرة الصنعة (ريال)</label>
                <input type="number" step="0.01" min="0" value={form.makingCharges} onChange={e => set("makingCharges", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>سعر التكلفة (ريال)</label>
                <input type="number" step="0.01" min="0" value={form.cost} onChange={e => set("cost", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>هامش الربح (ريال)</label>
                <input type="number" step="0.01" min="0" value={form.margin} onChange={e => set("margin", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>سعر البيع (ريال)</label>
                <input type="number" step="0.01" min="0" value={form.salePrice} onChange={e => set("salePrice", e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          <div className={`${CARD} mb-6`}>
            <div className="p-5">
              <label className={LABEL}>ملاحظات</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className={INPUT} rows={3} placeholder="أي ملاحظات إضافية..." />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base disabled:opacity-60"
            style={{ background: "#1e3a5f" }}
          >
            <Save size={18} />
            {saving ? "جاري الحفظ..." : "حفظ القطعة"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Edit2, Save, X, Printer, Tag } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const INPUT = "w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none";

const STATUS_LABEL: Record<string, string> = {
  available: "متاح", sold: "مباع", reserved: "محجوز", repair: "صيانة",
};
const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  sold: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  repair: "bg-blue-100 text-blue-700",
};

interface JewelryItem {
  id: number; sku: string; barcode: string; category: string;
  metalType: string; karat: number; grossWeight: number; netWeight: number;
  stoneType: string; stoneWeight: number; stoneCount: number; stoneValue: number;
  makingCharges: number; cost: number; salePrice: number; margin: number;
  status: string; branchId: number; supplierId: number | null; supplierRef: string; notes: string;
  createdAt: string; soldAt?: string;
  branch?: { name: string };
  supplier?: { name: string } | null;
}

interface Supplier { id: number; name: string; }

export default function InventoryItemPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmt = useFormatCurrency();
  const [item, setItem] = useState<JewelryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<JewelryItem>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    fetch(`/api/inventory/${sku}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setItem(d); setForm(d ?? {}); setLoading(false); });
    fetch("/api/suppliers?isActive=true")
      .then(r => r.ok ? r.json() : [])
      .then(setSuppliers);
  }, [sku]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && item) {
      setTimeout(() => window.print(), 300);
    }
  }, [searchParams, item]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/inventory/${sku}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setItem(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  const set = (key: keyof JewelryItem, val: string | number) =>
    setForm(f => ({ ...f, [key]: val }));

  if (loading) return <div className="min-h-screen bg-[#edf1f8] flex items-center justify-center text-slate-400" dir="rtl">جاري التحميل...</div>;
  if (!item) return <div className="min-h-screen bg-[#edf1f8] flex items-center justify-center text-slate-400" dir="rtl">القطعة غير موجودة</div>;

  const metal = item.metalType === "gold" ? "ذهب" : item.metalType === "silver" ? "فضة" : "بلاتين";

  return (
    <div className="min-h-screen bg-[#edf1f8]" dir="rtl">
      {/* Screen layout */}
      <div className="no-print p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white shadow-sm hover:bg-slate-50">
            <ArrowRight size={18} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold font-mono" style={{ color: "#1e3a5f" }}>{item.sku}</h1>
            <p className="text-sm text-slate-500">{item.category} — {metal} {item.karat}K</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-5">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Edit2 size={14} /> تعديل
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: "#1e3a5f" }}
              >
                <Save size={14} /> {saving ? "..." : "حفظ"}
              </button>
              <button
                onClick={() => { setEditing(false); setForm(item); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium text-slate-700"
              >
                <X size={14} /> إلغاء
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer size={14} /> طباعة البطاقة
          </button>
        </div>

        {/* Details card */}
        <div className={`${CARD} mb-4`}>
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><Tag size={16} /> بيانات القطعة</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4 text-sm">
            {editing ? (
              <>
                <Field label="الوزن الصافي (g)" type="number" value={String(form.netWeight ?? "")} onChange={v => set("netWeight", parseFloat(v) || 0)} />
                <Field label="الوزن الإجمالي (g)" type="number" value={String(form.grossWeight ?? "")} onChange={v => set("grossWeight", parseFloat(v) || 0)} />
                <Field label="سعر البيع (ريال)" type="number" value={String(form.salePrice ?? "")} onChange={v => set("salePrice", parseFloat(v) || 0)} />
                <Field label="أجرة الصنعة (ريال)" type="number" value={String(form.makingCharges ?? "")} onChange={v => set("makingCharges", parseFloat(v) || 0)} />
                <Field label="هامش الربح (ريال)" type="number" value={String(form.margin ?? "")} onChange={v => set("margin", parseFloat(v) || 0)} />
                <Field label="سعر التكلفة (ريال)" type="number" value={String(form.cost ?? "")} onChange={v => set("cost", parseFloat(v) || 0)} />
                <Field label="نوع الحجر" value={String(form.stoneType ?? "")} onChange={v => set("stoneType", v)} />
                <Field label="قيمة الحجر (ريال)" type="number" value={String(form.stoneValue ?? "")} onChange={v => set("stoneValue", parseFloat(v) || 0)} />
                <div>
                  <label className="text-slate-500 text-xs mb-1 block">المورد</label>
                  <select
                    value={String(form.supplierId ?? "")}
                    onChange={e => set("supplierId", e.target.value ? parseInt(e.target.value) : (null as unknown as number))}
                    className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  >
                    <option value="">بدون مورد</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500 text-xs mb-1 block">ملاحظات</label>
                  <textarea value={String(form.notes ?? "")} onChange={e => set("notes", e.target.value)} className={INPUT} rows={2} />
                </div>
              </>
            ) : (
              <>
                <Info label="الوزن الصافي" value={`${item.netWeight}g`} />
                <Info label="الوزن الإجمالي" value={`${item.grossWeight}g`} />
                <Info label="سعر البيع" value={fmt(item.salePrice)} highlight />
                <Info label="أجرة الصنعة" value={fmt(item.makingCharges)} />
                <Info label="هامش الربح" value={fmt(item.margin)} />
                <Info label="سعر التكلفة" value={fmt(item.cost)} />
                {item.stoneType && <Info label="نوع الحجر" value={item.stoneType} />}
                {item.stoneValue > 0 && <Info label="قيمة الحجر" value={fmt(item.stoneValue)} />}
                {(item.supplier?.name || item.supplierRef) && <Info label="المورد" value={item.supplier?.name ?? item.supplierRef} />}
                <Info label="الفرع" value={item.branch?.name ?? "-"} />
                <Info label="تاريخ الإضافة" value={new Date(item.createdAt).toLocaleDateString("ar-SA")} />
                {item.notes && <div className="col-span-2"><Info label="ملاحظات" value={item.notes} /></div>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Print layout — barcode tag */}
      <div className="print-only" style={{ padding: "4mm", width: "60mm" }}>
        <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "3mm", fontFamily: "monospace" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", textAlign: "center", marginBottom: "2mm" }}>{item.sku}</div>
          <div style={{ fontSize: "10px", textAlign: "center", color: "#555", marginBottom: "1mm" }}>
            {item.category} | {metal} {item.karat}K
          </div>
          <div style={{ fontSize: "10px", textAlign: "center", color: "#555", marginBottom: "1mm" }}>
            وزن: {item.netWeight}g
          </div>
          <div style={{ fontSize: "12px", fontWeight: "bold", textAlign: "center" }}>
            {item.salePrice.toLocaleString()} ر.س
          </div>
          {item.branch && (
            <div style={{ fontSize: "9px", textAlign: "center", color: "#888", marginTop: "1mm" }}>{item.branch.name}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-slate-500 text-xs mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-slate-500 text-xs mb-0.5">{label}</div>
      <div className={`font-medium ${highlight ? "text-lg" : "text-sm"} text-slate-800`}>{value}</div>
    </div>
  );
}

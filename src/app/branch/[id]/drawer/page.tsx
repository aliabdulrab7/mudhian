"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Save, Printer, CheckCircle, Lock, LockOpen, AlertTriangle,
  MessageSquare, X, Plus, Trash2, ShoppingBag, Landmark, Calculator,
  TrendingUp, Banknote, Wallet, Receipt, Share2, Camera,
} from "lucide-react";
import { todayISO, shiftDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/userPrefs";
import { parseTemplate, parseNotes, DEFAULT_TEMPLATE, type TemplateRow } from "@/lib/drawerTemplate";
import { detectBarcodeType } from "@/lib/barcodeUtils";
import { useToast } from "@/components/Toast";
import type { SessionUser } from "@/lib/auth";

interface SoldItem { id: number; category: string; quantity: number }
interface BankTransfer { id: number; bankName: string; amount: number; beneficiary: string; notes: string }
interface Invoice {
  id: number; drawerId: number; type: "صميت" | "عادية";
  invoiceNum: string; price: number; employeeName: string; employeeId: number | null; barcodes: string[];
}
interface Employee { id: number; name: string; }
interface Drawer {
  id: number; branchId: number; date: string; totalSales: number; balanceValue: number;
  yesterdayBalance: number; earnestReceived: number; staffDeposits: number; customerDepositsIn: number;
  adminWithdrawals: number; previousEarnest: number; boxesBags: number; cashPurchases: number;
  storeExpenses: number; customerDepositsOut: number; returns: number; salariesAdvances: number;
  actualBalance: number; notes: string; fieldNotes: string; customFields: string; isLocked: boolean;
  soldItems: SoldItem[];
  bankTransfers: BankTransfer[];
  invoices: Invoice[];
  branch?: { name: string; branchNum: string };
}

function n(v: string | number) { return typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "")) || 0; }

function DrawerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fmt = useFormatCurrency();
  const toast = useToast();
  const branchId = parseInt(params.id as string);
  const [date, setDate] = useState(() => searchParams.get("date") || todayISO());
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);

  const [fields, setFields] = useState<Partial<Drawer>>({});
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([]);
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, number>>({});
  const [template, setTemplate] = useState<TemplateRow[]>(DEFAULT_TEMPLATE);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [addingBank, setAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScannedInvoiceId, setLastScannedInvoiceId] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setSession);
  }, []);

  const fetchDrawer = useCallback(async () => {
    setLoading(true);
    const [drawerRes, tmplRes, empRes] = await Promise.all([
      fetch(`/api/drawer?branchId=${branchId}&date=${date}`),
      fetch(`/api/settings?key=drawerTemplate`),
      fetch(`/api/branches/${branchId}/employees`),
    ]);
    if (empRes.ok) {
      const empData: Employee[] = await empRes.json();
      setEmployees(empData.filter((e: Employee & { isActive?: boolean }) => e.isActive !== false));
    }
    if (!drawerRes.ok) {
      const errData = await drawerRes.json().catch(() => ({ error: "unknown" }));
      console.error("[fetchDrawer] API error:", drawerRes.status, errData.error);
      setLoading(false);
      return;
    }
    const data = await drawerRes.json();
    const tmplData = tmplRes.ok ? await tmplRes.json() : { value: null };

    setDrawer(data);
    setFields({
      totalSales: data.totalSales, balanceValue: data.balanceValue,
      yesterdayBalance: data.yesterdayBalance, earnestReceived: data.earnestReceived,
      staffDeposits: data.staffDeposits, customerDepositsIn: data.customerDepositsIn,
      adminWithdrawals: data.adminWithdrawals, previousEarnest: data.previousEarnest,
      boxesBags: data.boxesBags, cashPurchases: data.cashPurchases,
      storeExpenses: data.storeExpenses, customerDepositsOut: data.customerDepositsOut,
      returns: data.returns, salariesAdvances: data.salariesAdvances,
      actualBalance: data.actualBalance,
    });
    setSoldItems(data.soldItems ?? []);
    setBankTransfers(data.bankTransfers ?? []);
    setInvoices(
      (data.invoices ?? []).map((inv: Invoice & { barcodes: string; employeeId?: number | null }) => ({
        ...inv,
        employeeId: inv.employeeId ?? null,
        barcodes: (() => { try { return JSON.parse(inv.barcodes as unknown as string); } catch { return []; } })(),
      }))
    );
    try { setFieldNotes(JSON.parse(data.fieldNotes || "{}")); } catch { setFieldNotes({}); }
    setNotes(parseNotes(data.notes));
    try { setCustomFields(JSON.parse(data.customFields || "{}")); } catch { setCustomFields({}); }
    setTemplate(parseTemplate(tmplData.value));
    setLoading(false);
  }, [branchId, date]);

  useEffect(() => { fetchDrawer(); }, [fetchDrawer]);

  useEffect(() => {
    router.replace(`/branch/${branchId}/drawer?date=${date}`, { scroll: false });
  }, [date, branchId, router]);

  const computeBookBalance = useCallback((
    f: Partial<Drawer>, bt: BankTransfer[], tmpl: TemplateRow[], cf: Record<string, number>
  ) => {
    const cashSales = (f.totalSales ?? 0) - (f.balanceValue ?? 0);
    const bankTotal = bt.reduce((s, b) => s + b.amount, 0);
    let total = cashSales - bankTotal;
    for (const row of tmpl.filter(r => r.enabled)) {
      const val = row.custom ? (cf[row.key] ?? 0) : ((f as Record<string, number>)[row.key] ?? 0);
      total += row.sign === "+" ? val : -val;
    }
    return total;
  }, []);

  const save = useCallback(async (
    f?: Partial<Drawer>, si?: SoldItem[], bt?: BankTransfer[],
    fn?: Record<string, string>, nt?: string[], cf?: Record<string, number>
  ) => {
    if (!drawer) return;
    setSaving(true);
    const ff = f ?? fields; const ssi = si ?? soldItems; const bbt = bt ?? bankTransfers;
    const ffn = fn ?? fieldNotes; const nnt = nt ?? notes; const ccf = cf ?? customFields;
    const bookBalance = computeBookBalance(ff, bbt, template, ccf);
    const res = await fetch(`/api/drawer/${drawer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ff, bookBalance,
        fieldNotes: JSON.stringify(ffn),
        notes: JSON.stringify(nnt),
        customFields: JSON.stringify(ccf),
        soldItems: ssi, bankTransfers: bbt,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else { toast.error("فشل الحفظ، يرجى المحاولة مجدداً"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, fields, soldItems, bankTransfers, fieldNotes, notes, customFields, template]);

  const autoSave = useCallback((
    f?: Partial<Drawer>, si?: SoldItem[], bt?: BankTransfer[],
    fn?: Record<string, string>, nt?: string[], cf?: Record<string, number>
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(f, si, bt, fn, nt, cf), 1500);
  }, [save]);

  const setField = (key: keyof Drawer, val: number | string) => {
    const next = { ...fields, [key]: val };
    setFields(next); autoSave(next, soldItems, bankTransfers, fieldNotes, notes, customFields);
  };
  const setSoldQty = (id: number, qty: number) => {
    const next = soldItems.map((s) => s.id === id ? { ...s, quantity: qty } : s);
    setSoldItems(next); autoSave(fields, next, bankTransfers, fieldNotes, notes, customFields);
  };
  const setBankField = (id: number, key: keyof BankTransfer, val: string | number) => {
    const next = bankTransfers.map((b) => b.id === id ? { ...b, [key]: val } : b);
    setBankTransfers(next); autoSave(fields, soldItems, next, fieldNotes, notes, customFields);
  };
  const setFieldNote = (key: string, val: string) => {
    const next = { ...fieldNotes, [key]: val };
    setFieldNotes(next); autoSave(fields, soldItems, bankTransfers, next, notes, customFields);
  };
  const setCustomField = (key: string, val: number) => {
    const next = { ...customFields, [key]: val };
    setCustomFields(next); autoSave(fields, soldItems, bankTransfers, fieldNotes, notes, next);
  };

  const addNote = () => {
    const next = [...notes, ""];
    setNotes(next); autoSave(fields, soldItems, bankTransfers, fieldNotes, next, customFields);
  };
  const removeNote = (idx: number) => {
    const next = notes.filter((_, i) => i !== idx);
    setNotes(next); autoSave(fields, soldItems, bankTransfers, fieldNotes, next, customFields);
  };
  const updateNote = (idx: number, val: string) => {
    const next = notes.map((note, i) => i === idx ? val : note);
    setNotes(next); autoSave(fields, soldItems, bankTransfers, fieldNotes, next, customFields);
  };

  const confirmAddBank = async () => {
    if (!newBankName.trim() || !drawer) return;
    const res = await fetch(`/api/drawer/${drawer.id}/banks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankName: newBankName.trim() }),
    });
    if (res.ok) { const newBank = await res.json(); setBankTransfers((prev) => [...prev, newBank]); }
    setNewBankName(""); setAddingBank(false);
  };

  const deleteBank = async (bankId: number) => {
    if (!drawer || !confirm("هل تريد حذف هذا البنك من اليومية؟")) return;
    const res = await fetch(`/api/drawer/${drawer.id}/banks/${bankId}`, { method: "DELETE" });
    if (res.ok) {
      const next = bankTransfers.filter((b) => b.id !== bankId);
      setBankTransfers(next); autoSave(fields, soldItems, next, fieldNotes, notes, customFields);
    }
  };

  const addInvoice = async (type: "صميت" | "عادية"): Promise<number | null> => {
    if (!drawer) return null;
    const res = await fetch(`/api/drawer/${drawer.id}/invoices`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (res.ok) {
      const newInv = await res.json();
      setInvoices((prev) => [...prev, { ...newInv, barcodes: [] }]);
      return newInv.id;
    }
    return null;
  };

  const addInvoiceFromScan = async (barcode: string) => {
    const newId = await addInvoice("صميت");
    if (newId == null) return;
    await fetch(`/api/drawer/${drawer!.id}/invoices/${newId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcodes: [barcode] }),
    });
    setInvoices((prev) => prev.map((inv) => inv.id === newId ? { ...inv, barcodes: [barcode] } : inv));
    setLastScannedInvoiceId(newId);
    setTimeout(() => setLastScannedInvoiceId(null), 4000);
    toast.info("تم إضافة الفاتورة — اختر الموظف");
    setScannerOpen(false);
  };

  const updateInvoice = async (id: number, patch: Partial<Invoice>) => {
    if (!drawer) return;
    const body: Record<string, unknown> = { ...patch };
    if (patch.barcodes !== undefined) body.barcodes = patch.barcodes;
    if ("employeeId" in patch) body.employeeId = patch.employeeId;
    await fetch(`/api/drawer/${drawer.id}/invoices/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, ...patch } : inv));
  };

  const deleteInvoice = async (id: number) => {
    if (!drawer || !confirm("هل تريد حذف هذه الفاتورة؟")) return;
    const res = await fetch(`/api/drawer/${drawer.id}/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast.success("تم حذف الفاتورة");
    }
  };

  const changeDate = (delta: number) => { setDate(shiftDate(date, delta)); };

  const handleShare = async () => {
    const _cashSales = (fields.totalSales ?? 0) - (fields.balanceValue ?? 0);
    const _bookBalance = computeBookBalance(fields, bankTransfers, template, customFields);
    const diff = (fields.actualBalance ?? 0) - _bookBalance;
    const diffText = diff === 0 ? "✅ متطابق" : diff > 0 ? `زيادة ${fmt(diff)}` : `عجز ${fmt(Math.abs(diff))}`;
    const _arabicDate = new Date(date + "T00:00:00").toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" });
    const text = `📊 يومية المضيان للمجوهرات\n${drawer?.branch?.name ?? ""} — ${_arabicDate}\n──────────────────\nإجمالي المبيعات: ${fmt(fields.totalSales ?? 0)} ر.س\nمبيعات كاش: ${fmt(_cashSales)} ر.س\nالرصيد الدفتري: ${fmt(_bookBalance)} ر.س\nالفرق: ${diffText}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ الملخص");
    }
  };

  const handleLock = async (lock: boolean) => {
    if (!drawer) return;
    await fetch(`/api/drawer/${drawer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLocked: lock }),
    });
    setDrawer({ ...drawer, isLocked: lock });
  };

  if (loading || !drawer) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-400 animate-spin" />
        <p className="text-slate-400 text-sm">جاري التحميل...</p>
      </div>
    </div>
  );

  const isAdmin = session?.role === "admin";
  const isViewer = session?.role === "viewer";
  const readOnly = isViewer || drawer.isLocked;
  const canEdit = !readOnly;

  const bankTotal = (bankTransfers ?? []).reduce((s, b) => s + b.amount, 0);
  const invoiceTotal = invoices.reduce((s, inv) => s + inv.price, 0);
  const invoicesAdiya = invoices.filter((i) => i.type === "عادية");
  const invoicesSamit = invoices.filter((i) => i.type === "صميت");
  const invoiceCategoryMap: Record<string, number> = {};
  for (const inv of invoices) {
    for (const bc of inv.barcodes) {
      const cat = detectBarcodeType(bc);
      if (cat) invoiceCategoryMap[cat] = (invoiceCategoryMap[cat] ?? 0) + 1;
    }
  }
  const cashSales = (fields.totalSales ?? 0) - (fields.balanceValue ?? 0);
  const bookBalance = computeBookBalance(fields, bankTransfers, template, customFields);
  const difference = (fields.actualBalance ?? 0) - bookBalance;
  const totalSoldItems = soldItems.reduce((s, i) => s + i.quantity, 0);

  const arabicDate = new Date(date + "T00:00:00").toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric", month: "long", day: "numeric",
  });

  const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
  const CARD_HDR = "px-5 py-4 flex items-center gap-3";

  // ── Shared print helpers ──────────────────────────────────
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #cbd5e1", padding: "4px 8px", fontSize: "10.5px", ...extra,
  });
  const th = (extra?: React.CSSProperties): React.CSSProperties => ({
    ...td(), background: "#f0f4f8", fontWeight: "700", ...extra,
  });

  return (
    <>
    {/* ════════════════════════════════════════════════════════
        SCREEN LAYOUT
    ════════════════════════════════════════════════════════ */}
    <div className="space-y-4 pb-8 no-print">

      {/* ── TOP BAR ────────────────────────────────────────────── */}
      <div className={`${CARD} px-5 py-3.5 flex flex-wrap items-center gap-3 justify-between no-print`}>
        <div className="flex items-center gap-1">
          <button onClick={() => changeDate(-1)} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronRight size={16} />
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-slate-50 border-0 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          />
          <button onClick={() => changeDate(1)} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setDate(todayISO())}
            className="text-xs text-white px-3 py-1.5 rounded-xl font-semibold shadow-sm transition hover:opacity-90"
            style={{ background: "var(--navy)" }}>
            اليوم
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold">
              <CheckCircle size={13} /> تم الحفظ
            </span>
          )}
          {saving && <span className="text-slate-300 text-xs animate-pulse">جاري الحفظ...</span>}
          {drawer.isLocked && (
            <span className="flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-500 border border-red-100 px-3 py-1.5 rounded-xl">
              <Lock size={11} /> مقفلة
            </span>
          )}
          {isViewer && (
            <span className="text-xs font-medium bg-slate-100 text-slate-400 px-3 py-1.5 rounded-xl">قراءة فقط</span>
          )}
          {canEdit && (
            <button onClick={() => save()}
              className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition"
              style={{ background: "var(--navy)" }}>
              <Save size={13} /> حفظ
            </button>
          )}
          {!isAdmin && !isViewer && !drawer.isLocked && (
            <button onClick={() => { if (confirm("هل تريد إنهاء اليوم وقفل اليومية؟ لن تتمكن من التعديل بعدها إلا بموافقة المدير.")) handleLock(true); }}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition">
              <Lock size={13} /> إنهاء اليوم
            </button>
          )}
          {isAdmin && drawer.isLocked && (
            <button onClick={() => handleLock(false)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition">
              <LockOpen size={13} /> فتح اليومية
            </button>
          )}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-medium px-3 py-2 rounded-xl transition">
            <Share2 size={13} /> <span className="hidden sm:inline">مشاركة</span>
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-medium px-3 py-2 rounded-xl transition">
            <Printer size={13} /> <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* ── BRANCH HEADER ──────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_6px_30px_rgba(30,58,95,0.18)]"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5282 100%)" }}>
        <div className="px-7 py-6 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">يومية المضيان للمجوهرات</p>
            <h2 className="text-3xl font-black text-white leading-tight">{drawer.branch?.name ?? ""}</h2>
            {drawer.isLocked && (
              <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold bg-red-500/20 text-red-200 border border-red-400/30 px-3 py-1 rounded-full">
                <Lock size={10} /> اليومية مقفلة
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">التاريخ</p>
            <p className="text-xl font-black text-white">{arabicDate}</p>
          </div>
        </div>
      </div>

      {/* ── 3 SALES METRIC CARDS ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Total Sales */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f0fdf4, #f7fff9)" }}>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700">إجمالي المبيعات</p>
              <NoteBtn fieldKey="totalSales" notes={fieldNotes} openNote={openNote} setOpenNote={setOpenNote} setNote={setFieldNote} readOnly={!canEdit} />
            </div>
          </div>
          <div className="px-5 py-4">
            {canEdit ? (
              <div className="flex items-baseline gap-2">
                <input type="number" min="0" step="1"
                  value={fields.totalSales || ""}
                  onChange={(e) => setField("totalSales", n(e.target.value))}
                  className="flex-1 text-2xl font-black text-emerald-600 bg-transparent focus:outline-none w-0 min-w-0 placeholder-slate-200"
                  placeholder="0"
                />
                <span className="text-xs font-medium text-slate-300">ريال</span>
              </div>
            ) : (
              <p className="text-2xl font-black text-emerald-600">{fmt(fields.totalSales ?? 0)}</p>
            )}
          </div>
        </div>

        {/* Balance Value */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #fffbeb, #fef9ee)" }}>
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Banknote size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700">قيمة الموازنة</p>
              <p className="text-xs text-amber-400">مبيعات الشبكة / البنك</p>
            </div>
          </div>
          <div className="px-5 py-4">
            {canEdit ? (
              <div className="flex items-baseline gap-2">
                <input type="number" min="0" step="1"
                  value={fields.balanceValue || ""}
                  onChange={(e) => setField("balanceValue", n(e.target.value))}
                  className="flex-1 text-2xl font-black text-amber-600 bg-transparent focus:outline-none w-0 min-w-0 placeholder-slate-200"
                  placeholder="0"
                />
                <span className="text-xs font-medium text-slate-300">ريال</span>
              </div>
            ) : (
              <p className="text-2xl font-black text-amber-600">{fmt(fields.balanceValue ?? 0)}</p>
            )}
          </div>
        </div>

        {/* Cash Sales (computed) */}
        <div className="rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden"
          style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
          <div className={CARD_HDR}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Wallet size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">مبيعات كاش</p>
              <p className="text-xs text-white/50">إجمالي المبيعات − الموازنة</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <p className="text-2xl font-black text-white">{fmt(cashSales)}</p>
          </div>
        </div>
      </div>

      {/* ── SOLD ITEMS + BANK TRANSFERS ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Sold Items */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={15} className="text-slate-400" />
            </div>
            <h3 className="font-black text-slate-700 text-sm flex-1">الأصناف المباعة</h3>
            <span className="text-xs font-black text-slate-500 bg-white shadow-sm px-3 py-1 rounded-full whitespace-nowrap">
              {totalSoldItems} قطعة
            </span>
          </div>
          <div>
            {soldItems.map((item, idx) => (
              <div key={item.id}
                className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-50 transition-colors hover:bg-blue-50/20 ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}>
                <span className="text-sm font-medium text-slate-600">{item.category}</span>
                {canEdit ? (
                  <input type="number" min="0"
                    value={item.quantity || ""}
                    onChange={(e) => setSoldQty(item.id, parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const inputs = document.querySelectorAll<HTMLInputElement>("[data-sold-input]");
                        const next = inputs[idx + 1];
                        if (next) next.focus(); else (inputs[0] as HTMLInputElement)?.focus();
                      }
                    }}
                    data-sold-input
                    className="w-20 text-center font-black text-slate-800 bg-slate-100 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition text-sm border-0"
                    placeholder="0"
                  />
                ) : (
                  <span className="w-20 text-center font-black text-slate-700 bg-slate-100 rounded-xl px-2 py-2 text-sm">{item.quantity || 0}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bank Transfers */}
        <div className={`${CARD} flex flex-col`}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
              <Landmark size={15} className="text-slate-400" />
            </div>
            <h3 className="font-black text-slate-700 text-sm flex-1">التحويلات البنكية</h3>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full whitespace-nowrap">
              {fmt(bankTotal)}
            </span>
          </div>

          {/* Column headers — desktop only */}
          <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-4 py-2.5 border-b border-slate-50">
            {["البنك", "المبلغ", "المستفيد", "ملاحظة", ""].map((h, i) => (
              <span key={i} className={`text-xs font-bold text-slate-300 ${i === 0 ? "text-right" : "text-center"}`}>{h}</span>
            ))}
          </div>

          <div className="flex-1">
            {bankTransfers.map((bt, idx) => (
              <div key={bt.id} className={`border-b border-slate-50 transition-colors ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}>
                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] px-4 py-2.5 items-center gap-1 hover:bg-blue-50/20">
                  <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg text-right">{bt.bankName}</span>
                  {canEdit ? (
                    <input type="number" min="0" value={bt.amount || ""}
                      onChange={(e) => setBankField(bt.id, "amount", n(e.target.value))}
                      className="w-full text-center text-xs font-black text-blue-600 bg-transparent focus:bg-blue-50 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="0" />
                  ) : (
                    <span className="text-center text-xs font-black text-blue-600">{bt.amount ? fmt(bt.amount) : "—"}</span>
                  )}
                  {canEdit ? (
                    <input type="text" value={bt.beneficiary}
                      onChange={(e) => setBankField(bt.id, "beneficiary", e.target.value)}
                      className="w-full text-center text-xs bg-transparent focus:bg-slate-50 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 text-slate-500" placeholder="المستفيد" />
                  ) : (
                    <span className="text-center text-xs text-slate-400">{bt.beneficiary || "—"}</span>
                  )}
                  {canEdit ? (
                    <input type="text" value={bt.notes}
                      onChange={(e) => setBankField(bt.id, "notes", e.target.value)}
                      className="w-full text-center text-xs bg-transparent focus:bg-slate-50 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 text-slate-400" placeholder="ملاحظة" />
                  ) : (
                    <span className="text-center text-xs text-slate-400">{bt.notes || "—"}</span>
                  )}
                  {canEdit ? (
                    <button onClick={() => deleteBank(bt.id)} className="text-slate-200 hover:text-red-400 transition p-1 rounded-lg hover:bg-red-50">
                      <Trash2 size={11} />
                    </button>
                  ) : <span />}
                </div>

                {/* Mobile stacked card layout */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-black text-slate-700">{bt.bankName}</span>
                    {canEdit && (
                      <button onClick={() => deleteBank(bt.id)} className="text-slate-200 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {canEdit ? (
                      <input type="number" min="0" value={bt.amount || ""}
                        onChange={(e) => setBankField(bt.id, "amount", n(e.target.value))}
                        className="text-center text-sm font-black text-blue-600 bg-slate-100 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-blue-50 border-0" placeholder="المبلغ" />
                    ) : (
                      <span className="text-center text-sm font-black text-blue-600 bg-slate-100 rounded-xl px-2 py-2.5">{bt.amount ? fmt(bt.amount) : "—"}</span>
                    )}
                    {canEdit ? (
                      <input type="text" value={bt.beneficiary}
                        onChange={(e) => setBankField(bt.id, "beneficiary", e.target.value)}
                        className="text-center text-sm bg-slate-100 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-slate-600 border-0" placeholder="المستفيد" />
                    ) : (
                      <span className="text-center text-sm text-slate-400 bg-slate-100 rounded-xl px-2 py-2.5">{bt.beneficiary || "—"}</span>
                    )}
                    {canEdit ? (
                      <input type="text" value={bt.notes}
                        onChange={(e) => setBankField(bt.id, "notes", e.target.value)}
                        className="text-center text-sm bg-slate-100 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-slate-500 border-0" placeholder="ملاحظة" />
                    ) : (
                      <span className="text-center text-sm text-slate-400 bg-slate-100 rounded-xl px-2 py-2.5">{bt.notes || "—"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add bank row */}
          {canEdit && addingBank && (
            <div className="px-4 py-3 border-t border-blue-100 bg-blue-50/40 flex gap-2">
              <input type="text" autoFocus value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmAddBank(); if (e.key === "Escape") { setAddingBank(false); setNewBankName(""); } }}
                placeholder="اسم البنك..."
                className="flex-1 text-sm bg-white border border-blue-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={confirmAddBank} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition font-semibold">إضافة</button>
              <button onClick={() => { setAddingBank(false); setNewBankName(""); }} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
                <X size={14} />
              </button>
            </div>
          )}
          {canEdit && !addingBank && (
            <button onClick={() => setAddingBank(true)}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 px-4 py-3.5 transition w-full justify-center font-semibold border-t border-dashed border-slate-100 hover:bg-blue-50/30">
              <Plus size={12} /> إضافة بنك
            </button>
          )}
        </div>
      </div>

      {/* ── CASH CALCULATION ───────────────────────────────────── */}
      <div className={CARD}>
        <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Calculator size={15} className="text-slate-400" />
          </div>
          <h3 className="font-black text-slate-700 text-sm">حساب الرصيد الدفتري</h3>
        </div>

        <div className="divide-y divide-slate-50">
          {/* Cash sales row */}
          <CashRow sign="=" label="قيمة مبيعات كاش" value={cashSales}
            valueClass="text-rose-500 font-black" signColor="text-rose-400" fmt={fmt} />

          {template.filter(r => r.enabled).map(row => (
            <CashRow key={row.key}
              sign={row.sign === "+" ? "+" : "−"}
              signColor={row.sign === "+" ? "text-blue-500" : "text-rose-400"}
              label={row.label}
              value={row.custom ? (customFields[row.key] ?? 0) : ((fields as Record<string, number>)[row.key] ?? 0)}
              editable={canEdit}
              onChange={(v) => row.custom ? setCustomField(row.key, v) : setField(row.key as keyof Drawer, v)}
              fieldKey={row.key} notes={fieldNotes} openNote={openNote}
              setOpenNote={setOpenNote} setNote={setFieldNote}
              fmt={fmt}
            />
          ))}

          <CashRow sign="−" label="يخصم تحويلات بنكية لأبوسلطان"
            value={bankTotal} valueClass="text-slate-500" signColor="text-rose-400" fmt={fmt} />
        </div>

        {/* Book Balance */}
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #1e3a5f, #2d5282)" }}>
          <p className="text-white/60 text-sm font-semibold">صافي رصيد الدرج الدفتري</p>
          <p className="text-3xl font-black text-white tabular-nums">{fmt(bookBalance)}</p>
        </div>
      </div>

      {/* ── ACTUAL BALANCE + DIFFERENCE ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Actual Balance */}
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">الرصيد الفعلي بالدرج</p>
          </div>
          <div className="px-6 py-5">
            {canEdit ? (
              <div className="flex items-baseline gap-2">
                <input type="number" min="0" step="1"
                  value={fields.actualBalance || ""}
                  onChange={(e) => setField("actualBalance", n(e.target.value))}
                  className="flex-1 text-3xl font-black text-slate-800 bg-transparent focus:outline-none w-0 min-w-0 placeholder-slate-200"
                  placeholder="0"
                />
                <span className="text-sm font-medium text-slate-300 mb-0.5">ريال</span>
              </div>
            ) : (
              <p className="text-3xl font-black text-slate-800">{fmt(fields.actualBalance ?? 0)}</p>
            )}
          </div>
        </div>

        {/* Difference */}
        <div className="rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.10)] overflow-hidden text-white"
          style={{
            background: difference === 0
              ? "linear-gradient(135deg, #10b981, #059669)"
              : difference > 0
              ? "linear-gradient(135deg, #3b82f6, #2563eb)"
              : "linear-gradient(135deg, #f43f5e, #e11d48)",
          }}>
          <div className={CARD_HDR}>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wide">العجز / الزيادة في الدرج</p>
          </div>
          <div className="px-6 pb-6">
            <p className="text-3xl font-black">
              {difference === 0 ? "✓ متطابق" : fmt(difference)}
            </p>
            <p className="text-white/50 text-xs mt-1.5">
              {difference === 0 ? "الرصيد متطابق تماماً" : difference > 0 ? "زيادة في الدرج" : "عجز في الدرج"}
            </p>
          </div>
        </div>
      </div>

      {/* ── NOTES ──────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <MessageSquare size={15} className="text-slate-400" />
          </div>
          <h3 className="font-black text-slate-700 text-sm flex-1">ملاحظات اليومية</h3>
          {notes.length > 0 && (
            <span className="text-xs font-bold text-slate-400 bg-white shadow-sm px-2.5 py-1 rounded-full">{notes.length}</span>
          )}
        </div>

        <div className="p-5 space-y-2.5">
          {notes.map((note, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 mt-0.5" />
              {canEdit ? (
                <>
                  <input type="text" value={note}
                    onChange={(e) => updateNote(idx, e.target.value)}
                    className="flex-1 text-sm text-slate-600 bg-slate-50 border-0 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition placeholder-slate-300"
                    placeholder="ملاحظة..."
                  />
                  <button onClick={() => removeNote(idx)} className="text-slate-200 hover:text-red-400 transition flex-shrink-0 p-1 rounded-lg hover:bg-red-50">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-600 flex-1">{note || "—"}</p>
              )}
            </div>
          ))}
          {notes.length === 0 && !canEdit && (
            <p className="text-sm text-slate-300 text-center py-6">لا توجد ملاحظات</p>
          )}
          {canEdit && (
            <button onClick={addNote}
              className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl transition w-full justify-center font-semibold border border-dashed border-blue-200 mt-1">
              <Plus size={13} /> إضافة ملاحظة
            </button>
          )}
        </div>
      </div>

      {/* ── INVOICES ──────────────────────────────────────────── */}
      <div className={CARD}>
        <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Receipt size={15} className="text-slate-400" />
          </div>
          <h3 className="font-black text-slate-700 text-sm flex-1">تفاصيل الفواتير</h3>
          <span className="text-xs font-black text-slate-500 bg-white shadow-sm px-3 py-1 rounded-full">
            {invoices.length} فاتورة
          </span>
          {invoiceTotal > 0 && (
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {fmt(invoiceTotal)} ريال
            </span>
          )}
        </div>

        {/* Invoice summary */}
        {invoices.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-50 flex flex-wrap gap-2">
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
              عادية: {invoicesAdiya.length} — {fmt(invoicesAdiya.reduce((s, i) => s + i.price, 0))}
            </span>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
              صميت: {invoicesSamit.length} — {fmt(invoicesSamit.reduce((s, i) => s + i.price, 0))}
            </span>
            {Object.entries(invoiceCategoryMap).map(([cat, count]) => (
              <span key={cat} className="text-xs font-bold bg-violet-50 text-violet-700 px-2.5 py-1.5 rounded-full">
                {cat}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Mismatch alert: total sales vs invoice total */}
        {invoices.length > 0 && (fields.totalSales ?? 0) > 0 && invoiceTotal !== (fields.totalSales ?? 0) && (
          <div className="mx-4 mb-3 mt-1 flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "linear-gradient(135deg, #fffbeb, #fef9ee)", border: "1px solid #fde68a" }}>
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-700">إجمالي الفواتير لا يساوي إجمالي المبيعات</p>
              <p className="text-xs text-amber-500 mt-0.5">
                المبيعات: {fmt(fields.totalSales ?? 0)} — الفواتير: {fmt(invoiceTotal)} — الفرق: {fmt(Math.abs((fields.totalSales ?? 0) - invoiceTotal))}
              </p>
            </div>
          </div>
        )}
        {invoices.length > 0 && (fields.totalSales ?? 0) > 0 && invoiceTotal === (fields.totalSales ?? 0) && (
          <div className="mx-4 mb-3 mt-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "linear-gradient(135deg, #f0fdf4, #f7fef9)", border: "1px solid #bbf7d0" }}>
            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
            <p className="text-xs font-bold text-emerald-700">إجمالي الفواتير يطابق إجمالي المبيعات ✓</p>
          </div>
        )}

        {invoices.length > 0 && (
          <div className="hidden md:grid grid-cols-[28px_80px_100px_110px_1fr_32px] px-4 py-2.5 border-b border-slate-50 gap-2 items-center">
            <span className="text-xs font-bold text-slate-300">#</span>
            <span className="text-xs font-bold text-slate-300">النوع</span>
            <span className="text-xs font-bold text-slate-300">رقم الفاتورة</span>
            <span className="text-xs font-bold text-slate-300">المبلغ</span>
            <span className="text-xs font-bold text-slate-300">الموظف / الباركودات</span>
            <span />
          </div>
        )}

        <div>
          {invoices.map((inv, idx) => (
            <InvoiceRow key={inv.id} inv={inv} idx={idx} readOnly={!canEdit}
              employees={employees}
              isNew={inv.id === lastScannedInvoiceId}
              onUpdate={(patch) => updateInvoice(inv.id, patch)}
              onDelete={() => deleteInvoice(inv.id)}
              fmt={fmt}
            />
          ))}
          {invoices.length === 0 && !canEdit && (
            <p className="text-sm text-slate-300 text-center py-6">لا توجد فواتير</p>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2 px-4 py-3 border-t border-dashed border-slate-100">
            <button onClick={() => addInvoice("عادية")}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition font-semibold flex-1 justify-center border border-dashed border-blue-200">
              <Plus size={12} /> فاتورة عادية
            </button>
            <button onClick={() => addInvoice("صميت")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl transition font-semibold flex-1 justify-center border border-dashed border-slate-200">
              <Plus size={12} /> فاتورة صميت
            </button>
            <button onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 hover:bg-violet-50 px-4 py-2.5 rounded-xl transition font-semibold justify-center border border-dashed border-violet-200">
              <Camera size={12} /> مسح
            </button>
          </div>
        )}
      </div>

    </div>{/* end screen layout */}

    {/* ════════════════════════════════════════════════════════
        PRINT LAYOUT — A4 single page
    ════════════════════════════════════════════════════════ */}
    <div className="print-only" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" }}>

      {/* Title */}
      <div style={{ textAlign: "center", borderBottom: "2.5px solid #1e3a5f", paddingBottom: "6px", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 2px 0", color: "#1e3a5f" }}>
          يومية المضيان للمجوهرات
        </h1>
        {drawer.isLocked && (
          <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700" }}>🔒 اليومية مقفلة</span>
        )}
      </div>

      {/* Branch + Date */}
      <table style={{ marginBottom: "8px" }}>
        <tbody>
          <tr>
            <td style={th({ width: "80px" })}>الفرع</td>
            <td style={{ ...td(), fontWeight: "800", color: "#1e3a5f", width: "200px" }}>{drawer.branch?.name ?? ""}</td>
            <td style={th({ width: "60px" })}>التاريخ</td>
            <td style={{ ...td(), fontWeight: "700" }}>{arabicDate}</td>
          </tr>
        </tbody>
      </table>

      {/* Two-column: Sold Items | Bank Transfers */}
      <table style={{ marginBottom: "8px" }}>
        <tbody>
          <tr>
            {/* Sold Items */}
            <td style={{ verticalAlign: "top", width: "35%", paddingLeft: "6px" }}>
              <table>
                <thead>
                  <tr>
                    <th style={th({ textAlign: "right" })}>الأصناف المباعة</th>
                    <th style={th({ textAlign: "center", width: "55px" })}>الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {soldItems.map((item) => (
                    <tr key={item.id}>
                      <td style={td()}>{item.category}</td>
                      <td style={{ ...td(), textAlign: "center", fontWeight: "700" }}>{item.quantity || 0}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={th({ textAlign: "right" })}>الإجمالي</td>
                    <td style={th({ textAlign: "center" })}>{totalSoldItems}</td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* Bank Transfers */}
            <td style={{ verticalAlign: "top", width: "65%" }}>
              <table>
                <thead>
                  <tr>
                    <th style={th({ textAlign: "right" })}>البنك</th>
                    <th style={th({ textAlign: "center", width: "90px" })}>المبلغ</th>
                    <th style={th({ textAlign: "center", width: "80px" })}>المستفيد</th>
                    <th style={th({ textAlign: "center", width: "80px" })}>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {bankTransfers.map((bt) => (
                    <tr key={bt.id}>
                      <td style={{ ...td(), fontWeight: "700" }}>{bt.bankName}</td>
                      <td style={{ ...td(), textAlign: "center", fontWeight: "700", color: "#1d4ed8" }}>{bt.amount ? fmt(bt.amount) : "—"}</td>
                      <td style={{ ...td(), textAlign: "center" }}>{bt.beneficiary || "—"}</td>
                      <td style={{ ...td(), textAlign: "center" }}>{bt.notes || "—"}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={th({ textAlign: "right" })}>إجمالي التحويلات</td>
                    <td style={{ ...th(), textAlign: "center", color: "#1d4ed8" }}>{fmt(bankTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Sales summary row */}
      <table style={{ marginBottom: "8px" }}>
        <tbody>
          <tr>
            <td style={th({ width: "130px" })}>إجمالي المبيعات</td>
            <td style={{ ...td(), fontWeight: "800", color: "#059669", width: "130px" }}>{fmt(fields.totalSales ?? 0)}</td>
            <td style={th({ width: "110px" })}>قيمة الموازنة</td>
            <td style={{ ...td(), fontWeight: "800", color: "#b45309", width: "130px" }}>{fmt(fields.balanceValue ?? 0)}</td>
            <td style={th({ width: "90px" })}>مبيعات كاش</td>
            <td style={{ ...td(), fontWeight: "800", color: "#e11d48" }}>{fmt(cashSales)}</td>
          </tr>
        </tbody>
      </table>

      {/* Cash Calculation */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ ...td(), textAlign: "center", fontWeight: "900", color: "#e11d48", width: "24px" }}>=</td>
            <td style={td()}>مبيعات كاش</td>
            <td style={{ ...td(), fontWeight: "800", textAlign: "left" }}>{fmt(cashSales)}</td>
          </tr>
          {template.filter(r => r.enabled).map((row) => {
            const val = row.custom
              ? (customFields[row.key] ?? 0)
              : ((fields as Record<string, number>)[row.key] ?? 0);
            return (
              <tr key={row.key}>
                <td style={{ ...td(), textAlign: "center", fontWeight: "900", color: row.sign === "+" ? "#1d4ed8" : "#e11d48" }}>
                  {row.sign === "+" ? "+" : "−"}
                </td>
                <td style={td()}>{row.label}</td>
                <td style={{ ...td(), fontWeight: "700", textAlign: "left", color: val === 0 ? "#94a3b8" : undefined }}>
                  {val !== 0 ? fmt(val) : "—"}
                </td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...td(), textAlign: "center", fontWeight: "900", color: "#e11d48" }}>−</td>
            <td style={td()}>يخصم تحويلات بنكية لأبوسلطان</td>
            <td style={{ ...td(), fontWeight: "700", textAlign: "left" }}>{fmt(bankTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Book Balance */}
      <table style={{ marginBottom: "8px" }}>
        <tbody>
          <tr style={{ background: "#1e3a5f" }}>
            <td style={{ padding: "7px 10px", fontWeight: "700", fontSize: "12px", color: "white" }}>
              صافي رصيد الدرج الدفتري
            </td>
            <td style={{ padding: "7px 10px", fontWeight: "900", fontSize: "15px", color: "white", textAlign: "left" }}>
              {fmt(bookBalance)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Actual Balance + Difference */}
      <table style={{ marginBottom: notes.length > 0 ? "8px" : "0" }}>
        <tbody>
          <tr>
            <td style={th({ width: "130px" })}>الرصيد الفعلي بالدرج</td>
            <td style={{ ...td(), fontWeight: "900", fontSize: "13px", width: "150px" }}>{fmt(fields.actualBalance ?? 0)}</td>
            <td style={th({ width: "120px" })}>العجز / الزيادة</td>
            <td style={{
              ...td(), fontWeight: "900", fontSize: "13px",
              color: difference === 0 ? "#059669" : difference > 0 ? "#1d4ed8" : "#e11d48",
            }}>
              {difference === 0 ? "✓ متطابق" : fmt(difference)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      {notes.filter(Boolean).length > 0 && (
        <table>
          <tbody>
            <tr>
              <td style={th({ textAlign: "right" })}>ملاحظات</td>
            </tr>
            {notes.filter(Boolean).map((note, idx) => (
              <tr key={idx}>
                <td style={td()}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>{/* end print layout */}

    {/* ════════════════════════════════════════════════════════
        INVOICE PRINT PAGE — separate A4 page (page-break)
    ════════════════════════════════════════════════════════ */}
    {/* ── BARCODE INPUT MODAL ────────────────────────────────── */}
    {scannerOpen && (
      <div className="no-print fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-violet-500" />
              <span className="font-bold text-slate-700">إدخال باركود</span>
            </div>
            <button onClick={() => { setScannerOpen(false); setBarcodeInput(""); }}
              className="text-slate-300 hover:text-slate-500 transition p-1 rounded-lg hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">أدخل رمز الباركود يدوياً (مثال: RNG111، BRL222)</p>
          <input
            autoFocus
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcodeInput.trim()) {
                addInvoiceFromScan(barcodeInput.trim());
                setBarcodeInput("");
              }
            }}
            placeholder="RNG111"
            className="w-full text-lg font-mono font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 focus:border-violet-400 rounded-xl px-4 py-3 focus:outline-none text-center tracking-widest mb-4"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {["RNG", "BRL", "EAR", "NKL", "FSET", "REP"].map((prefix) => (
              <button key={prefix} onClick={() => setBarcodeInput(prefix)}
                className="text-xs font-bold bg-slate-100 hover:bg-violet-50 hover:text-violet-600 text-slate-500 px-3 py-1.5 rounded-lg transition">
                {prefix}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (barcodeInput.trim()) { addInvoiceFromScan(barcodeInput.trim()); setBarcodeInput(""); } }}
            disabled={!barcodeInput.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm">
            إضافة فاتورة
          </button>
        </div>
      </div>
    )}

    {invoices.length > 0 && (
      <div className="print-only" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl", pageBreakBefore: "always" }}>
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2.5px solid #1e3a5f", paddingBottom: "6px", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "17px", fontWeight: "900", margin: "0 0 2px 0", color: "#1e3a5f" }}>
            يومية المضيان للمجوهرات — تفاصيل الفواتير
          </h1>
        </div>

        {/* Branch + Date */}
        <table style={{ marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={th({ width: "80px" })}>الفرع</td>
              <td style={{ ...td(), fontWeight: "800", color: "#1e3a5f", width: "200px" }}>{drawer.branch?.name ?? ""}</td>
              <td style={th({ width: "60px" })}>التاريخ</td>
              <td style={{ ...td(), fontWeight: "700" }}>{arabicDate}</td>
              <td style={th({ width: "80px" })}>عدد الفواتير</td>
              <td style={{ ...td(), fontWeight: "700" }}>{invoices.length}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary row */}
        <table style={{ marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={th({ width: "100px" })}>فواتير عادية</td>
              <td style={{ ...td(), fontWeight: "700", color: "#1d4ed8", width: "120px" }}>
                {invoicesAdiya.length} — {fmt(invoicesAdiya.reduce((s, i) => s + i.price, 0))}
              </td>
              <td style={th({ width: "90px" })}>فواتير صميت</td>
              <td style={{ ...td(), fontWeight: "700", color: "#64748b", width: "120px" }}>
                {invoicesSamit.length} — {fmt(invoicesSamit.reduce((s, i) => s + i.price, 0))}
              </td>
              {Object.entries(invoiceCategoryMap).map(([cat, count]) => (
                <>
                  <td key={`th-${cat}`} style={th({ width: "60px" })}>{cat}</td>
                  <td key={`td-${cat}`} style={{ ...td(), fontWeight: "700", width: "50px" }}>{count}</td>
                </>
              ))}
            </tr>
          </tbody>
        </table>

        {/* Invoice table */}
        <table>
          <thead>
            <tr>
              <th style={{ ...th({ textAlign: "center" }), width: "24px" }}>#</th>
              <th style={th()}>النوع</th>
              <th style={th()}>رقم الفاتورة</th>
              <th style={{ ...th({ textAlign: "center" }), width: "110px" }}>المبلغ</th>
              <th style={th()}>الموظف</th>
              <th style={th()}>الباركودات</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => (
              <tr key={inv.id}>
                <td style={{ ...td(), textAlign: "center" }}>{idx + 1}</td>
                <td style={{ ...td(), fontWeight: "700", color: inv.type === "عادية" ? "#1d4ed8" : "#64748b" }}>{inv.type}</td>
                <td style={td()}>{inv.invoiceNum || "—"}</td>
                <td style={{ ...td(), textAlign: "center", fontWeight: "700", color: "#059669" }}>{inv.price ? fmt(inv.price) : "—"}</td>
                <td style={td()}>{inv.employeeName || "—"}</td>
                <td style={{ ...td(), fontSize: "9px", color: "#64748b" }}>{inv.barcodes.join("، ")}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={th({ textAlign: "right" })}>إجمالي الفواتير</td>
              <td style={{ ...th({ textAlign: "center" }), color: "#059669" }}>{fmt(invoiceTotal)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    )}

    </>
  );
}

// ── NOTE BUTTON ──────────────────────────────────────────────
function NoteBtn({ fieldKey, notes, openNote, setOpenNote, setNote, readOnly }: {
  fieldKey: string; notes: Record<string, string>;
  openNote: string | null; setOpenNote: (k: string | null) => void;
  setNote: (k: string, v: string) => void; readOnly: boolean;
}) {
  const hasNote = !!notes[fieldKey];
  if (readOnly && !hasNote) return null;
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpenNote(openNote === fieldKey ? null : fieldKey)}
        className={`p-0.5 rounded transition ${hasNote ? "text-blue-500" : "text-slate-300 hover:text-slate-400"}`}>
        <MessageSquare size={11} />
      </button>
      {openNote === fieldKey && (
        <div className="absolute z-50 top-6 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl p-3 w-56">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">ملاحظة</span>
            <button onClick={() => setOpenNote(null)} className="text-slate-300 hover:text-slate-500 transition"><X size={12} /></button>
          </div>
          {readOnly ? (
            <p className="text-xs text-slate-600">{notes[fieldKey] || "—"}</p>
          ) : (
            <input type="text" autoFocus value={notes[fieldKey] || ""}
              onChange={(e) => setNote(fieldKey, e.target.value)}
              placeholder="أضف ملاحظة..."
              className="w-full text-xs border-0 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── CASH ROW ─────────────────────────────────────────────────
function CashRow({ sign, label, value, valueClass = "text-slate-600", editable = false, onChange,
  signColor = "text-blue-500", fieldKey, notes, openNote, setOpenNote, setNote, fmt }: {
  sign: string; label: string; value: number; valueClass?: string;
  editable?: boolean; onChange?: (v: number) => void;
  signColor?: string;
  fieldKey?: string; notes?: Record<string, string>;
  openNote?: string | null; setOpenNote?: (k: string | null) => void;
  setNote?: (k: string, v: string) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="flex items-center px-5 py-3 gap-3 hover:bg-slate-50/60 transition-colors">
      <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 ${
        sign === "+" ? "bg-blue-50 text-blue-500"
        : sign === "−" ? "bg-rose-50 text-rose-400"
        : "bg-slate-50 text-slate-400"
      }`}>{sign}</span>
      <span className="text-sm text-slate-500 flex-1 leading-snug">{label}</span>
      {fieldKey && notes && openNote !== undefined && setOpenNote && setNote && (
        <NoteBtn fieldKey={fieldKey} notes={notes} openNote={openNote} setOpenNote={setOpenNote} setNote={setNote} readOnly={!editable} />
      )}
      {editable && onChange ? (
        <input type="number" min="0" step="1"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-32 text-left text-sm font-black bg-slate-50 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white border-0 transition ${valueClass}`}
          placeholder="0"
        />
      ) : (
        <span className={`text-sm font-black w-32 text-left tabular-nums ${valueClass}`}>
          {value !== 0 ? fmt(value) : <span className="text-slate-200 font-normal">—</span>}
        </span>
      )}
    </div>
  );
}

// ── BARCODE TAG INPUT ─────────────────────────────────────────
function BarcodeTagInput({ barcodes, onChange, readOnly }: {
  barcodes: string[];
  onChange: (updated: string[]) => void;
  readOnly: boolean;
}) {
  const [input, setInput] = useState("");

  const addBarcode = () => {
    const val = input.trim();
    if (!val) return;
    onChange([...barcodes, val]);
    setInput("");
  };

  const removeBarcode = (idx: number) => {
    onChange(barcodes.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {barcodes.map((bc, idx) => {
        const type = detectBarcodeType(bc);
        return (
          <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs rounded-full px-2 py-0.5">
            <span className="font-mono">{bc}</span>
            {type && <span className="text-blue-400 text-[10px]">({type})</span>}
            {!readOnly && (
              <button type="button" onClick={() => removeBarcode(idx)} className="text-slate-300 hover:text-red-400 transition leading-none">×</button>
            )}
          </span>
        );
      })}
      {!readOnly && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addBarcode(); }
          }}
          onBlur={addBarcode}
          placeholder="باركود..."
          className="text-xs bg-transparent focus:outline-none text-slate-500 placeholder-slate-200 w-24 min-w-0"
        />
      )}
    </div>
  );
}

// ── INVOICE ROW ───────────────────────────────────────────────
function InvoiceRow({ inv, idx, readOnly, onUpdate, onDelete, employees, fmt, isNew }: {
  inv: { id: number; type: "صميت" | "عادية"; invoiceNum: string; price: number; employeeName: string; employeeId: number | null; barcodes: string[] };
  idx: number; readOnly: boolean; isNew?: boolean;
  employees: { id: number; name: string }[];
  onUpdate: (patch: { type?: "صميت" | "عادية"; invoiceNum?: string; price?: number; employeeName?: string; employeeId?: number | null; barcodes?: string[] }) => void;
  onDelete: () => void;
  fmt: (n: number) => string;
}) {
  const [localPrice, setLocalPrice] = useState(String(inv.price || ""));
  const [localInvoiceNum, setLocalInvoiceNum] = useState(inv.invoiceNum);
  const empSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isNew && empSelectRef.current) {
      empSelectRef.current.focus();
    }
  }, [isNew]);

  const typeEl = readOnly ? (
    <span className={`text-xs font-black px-2 py-1 rounded-lg text-center ${inv.type === "عادية" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
      {inv.type}
    </span>
  ) : (
    <select
      value={inv.type}
      onChange={(e) => onUpdate({ type: e.target.value as "صميت" | "عادية" })}
      className="text-xs font-bold bg-slate-50 rounded-xl px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 cursor-pointer"
    >
      <option value="عادية">عادية</option>
      <option value="صميت">صميت</option>
    </select>
  );

  const invoiceNumEl = inv.type === "عادية" ? (
    readOnly ? (
      <span className="text-xs text-slate-500">{inv.invoiceNum || "—"}</span>
    ) : (
      <input type="text" value={localInvoiceNum}
        onChange={(e) => setLocalInvoiceNum(e.target.value)}
        onBlur={() => { if (localInvoiceNum !== inv.invoiceNum) onUpdate({ invoiceNum: localInvoiceNum }); }}
        placeholder="رقم الفاتورة"
        className="text-xs bg-slate-50 rounded-xl px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 w-full"
      />
    )
  ) : <span className="text-xs text-slate-200">—</span>;

  const priceEl = readOnly ? (
    <span className="text-xs font-black text-emerald-600">{inv.price ? fmt(inv.price) : "—"}</span>
  ) : (
    <input type="number" min="0" step="1" value={localPrice}
      onChange={(e) => setLocalPrice(e.target.value)}
      onBlur={() => { const val = parseFloat(localPrice) || 0; if (val !== inv.price) onUpdate({ price: val }); }}
      placeholder="0"
      className="text-xs font-black text-emerald-600 bg-slate-50 rounded-xl px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
    />
  );

  const empEl = readOnly ? (
    <span className="text-xs text-slate-500">{inv.employeeName || "—"}</span>
  ) : (
    <select ref={empSelectRef}
      value={inv.employeeId != null ? String(inv.employeeId) : ""}
      onChange={(e) => {
        const selectedId = e.target.value ? parseInt(e.target.value) : null;
        const selectedName = selectedId != null ? (employees.find((em) => em.id === selectedId)?.name ?? "") : "";
        onUpdate({ employeeId: selectedId, employeeName: selectedName });
      }}
      className="text-xs bg-slate-50 rounded-xl px-2 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 w-full cursor-pointer"
    >
      <option value="">بدون اسم</option>
      {employees.map((em) => <option key={em.id} value={em.id}>{em.name}</option>)}
    </select>
  );

  const deleteBtn = !readOnly ? (
    <button onClick={onDelete} className="text-slate-200 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center">
      <Trash2 size={12} />
    </button>
  ) : <span />;

  return (
    <div className={`border-b border-slate-50 ${isNew ? "ring-2 ring-blue-400 animate-pulse bg-blue-50/30 rounded-xl" : ""}`}>
      {/* Desktop layout */}
      <div className="hidden md:grid grid-cols-[28px_80px_100px_110px_1fr_32px] px-4 py-2.5 gap-2 items-start hover:bg-slate-50/40 transition-colors">
        <span className="text-xs text-slate-300 font-semibold pt-1.5">{idx + 1}</span>
        {typeEl}
        {invoiceNumEl}
        {priceEl}
        <div className="flex flex-col gap-1.5 min-w-0">
          {empEl}
          <BarcodeTagInput barcodes={inv.barcodes} onChange={(updated) => onUpdate({ barcodes: updated })} readOnly={readOnly} />
        </div>
        {deleteBtn}
      </div>

      {/* Mobile stacked layout */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-300 font-semibold">{idx + 1}</span>
          {typeEl}
          <div className="flex-1">{invoiceNumEl}</div>
          <div className="w-24">{priceEl}</div>
          {deleteBtn}
        </div>
        <div className="mb-1.5">{empEl}</div>
        <BarcodeTagInput barcodes={inv.barcodes} onChange={(updated) => onUpdate({ barcodes: updated })} readOnly={readOnly} />
      </div>
    </div>
  );
}

export default function DrawerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-blue-400 animate-spin" />
          <p className="text-slate-400 text-sm">جاري التحميل...</p>
        </div>
      </div>
    }>
      <DrawerContent />
    </Suspense>
  );
}

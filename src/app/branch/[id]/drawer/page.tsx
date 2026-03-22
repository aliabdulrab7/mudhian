"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Save, Printer, CheckCircle } from "lucide-react";
import { formatCurrency, todayISO } from "@/lib/utils";

interface SoldItem { id: number; category: string; quantity: number }
interface BankTransfer { id: number; bankName: string; amount: number; beneficiary: string; notes: string }
interface Drawer {
  id: number; branchId: number; date: string; totalSales: number; balanceValue: number;
  yesterdayBalance: number; earnestReceived: number; staffDeposits: number; customerDepositsIn: number;
  adminWithdrawals: number; previousEarnest: number; boxesBags: number; cashPurchases: number;
  storeExpenses: number; customerDepositsOut: number; returns: number; salariesAdvances: number;
  actualBalance: number; notes: string;
  soldItems: SoldItem[];
  bankTransfers: BankTransfer[];
  branch: { name: string; branchNum: string };
}

function n(v: string | number) { return typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "")) || 0; }

function DrawerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchId = parseInt(params.id as string);
  const [date, setDate] = useState(() => searchParams.get("date") || todayISO());
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fields, setFields] = useState<Partial<Drawer>>({});
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDrawer = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/drawer?branchId=${branchId}&date=${date}`);
    const data = await res.json();
    setDrawer(data);
    setFields({
      totalSales: data.totalSales,
      balanceValue: data.balanceValue,
      yesterdayBalance: data.yesterdayBalance,
      earnestReceived: data.earnestReceived,
      staffDeposits: data.staffDeposits,
      customerDepositsIn: data.customerDepositsIn,
      adminWithdrawals: data.adminWithdrawals,
      previousEarnest: data.previousEarnest,
      boxesBags: data.boxesBags,
      cashPurchases: data.cashPurchases,
      storeExpenses: data.storeExpenses,
      customerDepositsOut: data.customerDepositsOut,
      returns: data.returns,
      salariesAdvances: data.salariesAdvances,
      actualBalance: data.actualBalance,
      notes: data.notes,
    });
    setSoldItems(data.soldItems);
    setBankTransfers(data.bankTransfers);
    setLoading(false);
  }, [branchId, date]);

  useEffect(() => { fetchDrawer(); }, [fetchDrawer]);

  // Sync date to URL
  useEffect(() => {
    router.replace(`/branch/${branchId}/drawer?date=${date}`, { scroll: false });
  }, [date, branchId, router]);

  const computeBookBalance = (f: Partial<Drawer>, bt: BankTransfer[]) => {
    const bv = f.balanceValue ?? 0;
    const cashSales = (f.totalSales ?? 0) - bv;
    const bankTotal = bt.reduce((s, b) => s + b.amount, 0);
    return cashSales
      + (f.yesterdayBalance ?? 0) + (f.earnestReceived ?? 0)
      + (f.staffDeposits ?? 0) + (f.customerDepositsIn ?? 0)
      - (f.adminWithdrawals ?? 0) - (f.previousEarnest ?? 0)
      - (f.boxesBags ?? 0) - (f.cashPurchases ?? 0)
      - (f.storeExpenses ?? 0) - (f.customerDepositsOut ?? 0)
      - bankTotal - (f.returns ?? 0) - (f.salariesAdvances ?? 0);
  };

  const save = useCallback(async (f?: Partial<Drawer>, si?: SoldItem[], bt?: BankTransfer[]) => {
    if (!drawer) return;
    setSaving(true);
    const ff = f ?? fields; const ssi = si ?? soldItems; const bbt = bt ?? bankTransfers;
    const bookBalance = computeBookBalance(ff, bbt);
    await fetch(`/api/drawer/${drawer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ff, bookBalance, soldItems: ssi, bankTransfers: bbt }),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, fields, soldItems, bankTransfers]);

  const autoSave = useCallback((f?: Partial<Drawer>, si?: SoldItem[], bt?: BankTransfer[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(f, si, bt), 1500);
  }, [save]);

  const setField = (key: keyof Drawer, val: number | string) => {
    const next = { ...fields, [key]: val };
    setFields(next); autoSave(next, soldItems, bankTransfers);
  };
  const setSoldQty = (id: number, qty: number) => {
    const next = soldItems.map((s) => s.id === id ? { ...s, quantity: qty } : s);
    setSoldItems(next); autoSave(fields, next, bankTransfers);
  };
  const setBankField = (id: number, key: keyof BankTransfer, val: string | number) => {
    const next = bankTransfers.map((b) => b.id === id ? { ...b, [key]: val } : b);
    setBankTransfers(next); autoSave(fields, soldItems, next);
  };

  const changeDate = (delta: number) => {
    const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  if (loading || !drawer) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
    </div>
  );

  const bankTotal = bankTransfers.reduce((s, b) => s + b.amount, 0);
  const balanceValue = fields.balanceValue ?? 0;
  const cashSales = (fields.totalSales ?? 0) - balanceValue;
  const bookBalance = computeBookBalance(fields, bankTransfers);
  const difference = (fields.actualBalance ?? 0) - bookBalance;
  const totalSoldItems = soldItems.reduce((s, i) => s + i.quantity, 0);

  const arabicDate = new Date(date + "T00:00:00").toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 justify-between no-print">
        {/* Date navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
            <ChevronRight size={18} />
          </button>

          {/* Clickable date input */}
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition cursor-pointer"
            />
          </div>

          <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => setDate(todayISO())}
            className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition font-medium"
          >
            اليوم
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {saved && <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle size={13} /> تم الحفظ</span>}
          {saving && <span className="text-slate-400 text-xs">جاري الحفظ...</span>}
          <button onClick={() => save()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-xl transition shadow-sm">
            <Save size={13} /> حفظ
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-3 py-2 rounded-xl transition">
            <Printer size={13} /> طباعة
          </button>
        </div>
      </div>

      {/* Journal Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Title */}
        <div className="bg-slate-50 border-b border-slate-200 text-center py-3">
          <h1 className="text-xl font-black text-slate-800 tracking-wide">يومية المضيان للمجوهرات</h1>
        </div>

        {/* Header: branch + date */}
        <div className="grid grid-cols-2 border-b border-slate-200 text-sm">
          <div className="flex items-center border-l border-slate-200">
            <span className="bg-slate-50 px-3 py-2.5 font-semibold text-slate-500 border-l border-slate-200 text-xs whitespace-nowrap">فرع رقم :</span>
            <span className="px-3 py-2.5 font-bold text-blue-700">{drawer.branch.name}</span>
          </div>
          <div className="flex items-center">
            <span className="bg-slate-50 px-3 py-2.5 font-semibold text-slate-500 border-l border-slate-200 text-xs whitespace-nowrap">التاريخ :</span>
            <span className="px-3 py-2.5 font-medium text-slate-700">{arabicDate}</span>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-2 border-b border-slate-200">

          {/* RIGHT: Sold Items */}
          <div className="border-l border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">الأصناف المباعة</th>
                  <th className="px-3 py-2 text-center border-r border-slate-200 text-xs font-semibold text-slate-500 w-24">الكمية</th>
                </tr>
              </thead>
              <tbody>
                {soldItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 text-right text-sm text-slate-700">{item.category}</td>
                    <td className="px-2 py-1 border-r border-slate-100">
                      <input type="number" min="0"
                        value={item.quantity || ""}
                        onChange={(e) => setSoldQty(item.id, parseInt(e.target.value) || 0)}
                        className="w-full text-center bg-transparent focus:bg-blue-50 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm text-slate-800"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-3 py-2 text-right text-xs font-bold text-slate-600">الإجمالي</td>
                  <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-slate-800">{totalSoldItems}</td>
                </tr>
              </tbody>
            </table>

            {/* Total sales */}
            <div className="border-t border-slate-200 bg-emerald-50 px-3 py-2.5 flex justify-between items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800">إجمالي قيمة المبيعات اليومية</span>
              <input type="number" min="0" step="0.01"
                value={fields.totalSales || ""}
                onChange={(e) => setField("totalSales", n(e.target.value))}
                className="w-32 text-left font-bold text-emerald-700 bg-white border border-emerald-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm shadow-sm"
                placeholder="0"
              />
            </div>

            {/* قيمة الموازنة — manual input */}
            <div className="border-t border-slate-200 bg-amber-50 px-3 py-2.5 flex justify-between items-center gap-2">
              <div>
                <span className="text-xs font-semibold text-amber-800">قيمة الموازنة</span>
                <p className="text-xs text-amber-600 opacity-70">مبيعات الشبكة / البنك</p>
              </div>
              <input type="number" min="0" step="0.01"
                value={fields.balanceValue || ""}
                onChange={(e) => setField("balanceValue", n(e.target.value))}
                className="w-32 text-left font-bold text-amber-700 bg-white border border-amber-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm shadow-sm"
                placeholder="0"
              />
            </div>

            {/* Cash sales (auto) */}
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-slate-500">قيمة مبيعات كاش = إجمالي المبيعات − الموازنة</span>
              <span className="font-bold text-rose-600 text-sm">{formatCurrency(cashSales)}</span>
            </div>

            {/* Notes */}
            <div className="border-t border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-400 mb-1.5">أي ملاحظات أخرى على اليومية</p>
              <textarea
                value={fields.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                rows={5}
                className="w-full text-sm border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white resize-none transition"
                placeholder="ملاحظات..."
              />
            </div>
          </div>

          {/* LEFT: Bank Transfers + Cash Calculation */}
          <div>
            {/* Bank table */}
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-2 py-2 text-right font-semibold text-slate-500">إسم البنك</th>
                  <th className="px-2 py-2 text-center border-r border-slate-200 font-semibold text-slate-500">المبلغ</th>
                  <th className="px-2 py-2 text-center border-r border-slate-200 font-semibold text-slate-500">المستفيد</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-500">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {bankTransfers.map((bt) => (
                  <tr key={bt.id} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 text-right text-slate-700 font-medium whitespace-nowrap">{bt.bankName}</td>
                    <td className="px-1 py-1 border-r border-slate-100">
                      <input type="number" min="0" step="0.01"
                        value={bt.amount || ""}
                        onChange={(e) => setBankField(bt.id, "amount", n(e.target.value))}
                        className="w-full text-center bg-transparent focus:bg-blue-50 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-slate-100">
                      <input type="text" value={bt.beneficiary}
                        onChange={(e) => setBankField(bt.id, "beneficiary", e.target.value)}
                        className="w-full text-center bg-transparent focus:bg-blue-50 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="المستفيد"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input type="text" value={bt.notes}
                        onChange={(e) => setBankField(bt.id, "notes", e.target.value)}
                        className="w-full text-center bg-transparent focus:bg-blue-50 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="ملاحظات"
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-2 py-2 text-right text-xs font-bold text-slate-600">إجمالي التحويلات</td>
                  <td className="px-2 py-2 text-center border-r border-slate-200 font-bold text-blue-700">{formatCurrency(bankTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>

            {/* Cash Calculation */}
            <div className="border-t-2 border-slate-200">
              <CashRow sign="=" label="قيمة مبيعات كاش" value={cashSales}
                valueClass="text-rose-600 font-black text-sm" bg="bg-rose-50" signColor="text-rose-500" />
              <CashRow sign="+" label="يضاف رصيد أمس" value={fields.yesterdayBalance ?? 0}
                editable onChange={(v) => setField("yesterdayBalance", v)} />
              <CashRow sign="+" label="يضاف عرابين مستلمة" value={fields.earnestReceived ?? 0}
                editable onChange={(v) => setField("earnestReceived", v)} />
              <CashRow sign="+" label="مستلم أمانات سابقة لدى الموظفين / إضافات أخرى" value={fields.staffDeposits ?? 0}
                editable onChange={(v) => setField("staffDeposits", v)} />
              <CashRow sign="+" label="مستلم أمانات سابقة لدى الزبائن" value={fields.customerDepositsIn ?? 0}
                editable onChange={(v) => setField("customerDepositsIn", v)} />
              <CashRow sign="−" label="يخصم مسحوبات أبوسلطان" value={fields.adminWithdrawals ?? 0}
                editable onChange={(v) => setField("adminWithdrawals", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم عرابين سابقة" value={fields.previousEarnest ?? 0}
                editable onChange={(v) => setField("previousEarnest", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم مشتريات علب وأكياس" value={fields.boxesBags ?? 0}
                editable onChange={(v) => setField("boxesBags", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم مشتريات بضاعة كاش" value={fields.cashPurchases ?? 0}
                editable onChange={(v) => setField("cashPurchases", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم مصروفات محل" value={fields.storeExpenses ?? 0}
                editable onChange={(v) => setField("storeExpenses", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم أمانات لدى الزبائن أو المحلات" value={fields.customerDepositsOut ?? 0}
                editable onChange={(v) => setField("customerDepositsOut", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم تحويلات بنكية لأبوسلطان" value={bankTotal}
                valueClass="text-slate-500" signColor="text-rose-400" />
              <CashRow sign="−" label="يخصم المرتجع والمستبدل من الزبائن" value={fields.returns ?? 0}
                editable onChange={(v) => setField("returns", v)} signColor="text-rose-400" />
              <CashRow sign="−" label="رواتب وسلف وخصومات أخرى" value={fields.salariesAdvances ?? 0}
                editable onChange={(v) => setField("salariesAdvances", v)} signColor="text-rose-400" />
            </div>
          </div>
        </div>

        {/* Book Balance */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-center gap-4">
          <span className="text-sm font-bold text-slate-700">صافي رصيد الدرج الدفتري</span>
          <span className="text-2xl font-black text-rose-600">{formatCurrency(bookBalance)}</span>
        </div>

        {/* Bottom: actual + difference */}
        <div className="grid grid-cols-3 text-sm">
          <div className="col-span-1 flex items-center gap-3 px-4 py-3 border-l border-slate-200">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">الرصيد الفعلي بالدرج</span>
            <input type="number" min="0" step="0.01"
              value={fields.actualBalance || ""}
              onChange={(e) => setField("actualBalance", n(e.target.value))}
              className="w-32 text-center font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition text-sm"
              placeholder="0"
            />
          </div>
          <div className="col-span-1 flex items-center gap-3 px-4 py-3 border-l border-slate-200">
            <span className="text-xs font-semibold text-slate-500">العجز أو الزيادة في الدرج</span>
            <span className={`text-lg font-black px-3 py-1 rounded-xl ${
              difference === 0 ? "bg-emerald-100 text-emerald-700"
              : difference > 0 ? "bg-blue-100 text-blue-700"
              : "bg-red-100 text-red-600"
            }`}>
              {formatCurrency(difference)}
            </span>
          </div>
          <div className="col-span-1 flex items-center justify-center px-4 py-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              difference === 0 ? "bg-emerald-100 text-emerald-600"
              : difference > 0 ? "bg-blue-100 text-blue-600"
              : "bg-red-100 text-red-500"
            }`}>
              {difference === 0 ? "✓ متطابق" : difference > 0 ? "زيادة" : "عجز"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashRow({ sign, label, value, valueClass = "text-slate-700", editable = false, onChange, signColor = "text-blue-500", bg = "" }: {
  sign: string; label: string; value: number; valueClass?: string;
  editable?: boolean; onChange?: (v: number) => void;
  signColor?: string; bg?: string;
}) {
  return (
    <div className={`flex items-center border-b border-slate-100 px-2 py-1 gap-1.5 ${bg}`}>
      <span className={`text-sm font-black w-4 text-center flex-shrink-0 ${signColor}`}>{sign}</span>
      <span className="text-xs text-slate-500 flex-1 leading-tight">{label}</span>
      {editable && onChange ? (
        <input type="number" min="0" step="0.01"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-24 text-left text-xs font-bold bg-transparent focus:bg-blue-50 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${valueClass}`}
          placeholder="0"
        />
      ) : (
        <span className={`text-xs font-bold w-24 text-left ${valueClass}`}>
          {value !== 0 ? formatCurrency(value) : ""}
        </span>
      )}
    </div>
  );
}

export default function DrawerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-slate-400 text-sm animate-pulse">جاري التحميل...</div></div>}>
      <DrawerContent />
    </Suspense>
  );
}

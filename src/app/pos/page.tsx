"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ShoppingCart, User, CreditCard, Banknote, Building2, CheckCircle, History } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

interface JewelryItem {
  id: number; sku: string; category: string; karat: number;
  metalType: string; netWeight: number; salePrice: number; branchId: number;
  status: string;
  branch?: { name: string };
}
interface CartItem { item: JewelryItem; price: number; discount: number; }
interface Customer { id: number; name: string; phone: string; }
interface Employee { id: number; name: string; isActive: boolean; }
interface Session { role: string; branchId?: number; userId: number; }
interface Branch { id: number; name: string; }
interface RecentSale {
  id: number;
  invoiceNum: string;
  totalAmount: number;
  paymentMethod: string;
  notes: string;
  createdAt: string;
  customer: { name: string } | null;
  employee: { name: string } | null;
  branch: { name: string };
}

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي", icon: Banknote },
  { value: "card", label: "شبكة", icon: CreditCard },
  { value: "transfer", label: "تحويل", icon: Building2 },
];

export default function POSPage() {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const toast = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanning, setScanning] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hideRefunded, setHideRefunded] = useState(false);

  const fetchRecentSales = useCallback((branchId: number | null) => {
    const url = branchId ? `/api/pos?branchId=${branchId}&limit=15` : `/api/pos?limit=15`;
    fetch(url).then(r => r.ok ? r.json() : []).then(setRecentSales);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then((s: Session | null) => {
      setSession(s);
      if (s?.role === "branch" && s.branchId) {
        setSelectedBranchId(s.branchId);
        fetchRecentSales(s.branchId);
      } else {
        fetchRecentSales(null);
      }
    });
    fetch("/api/branches").then(r => r.ok ? r.json() : []).then(setBranches);
  }, [fetchRecentSales]);

  useEffect(() => {
    if (selectedBranchId) {
      fetch(`/api/branches/${selectedBranchId}/employees`)
        .then(r => r.ok ? r.json() : [])
        .then((emps: Employee[]) => setEmployees(emps.filter(e => e.isActive)));
    }
  }, [selectedBranchId]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const scanItem = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/inventory/${encodeURIComponent(barcode.trim())}`);
      if (!res.ok) { toast.error("القطعة غير موجودة"); return; }
      const item: JewelryItem = await res.json();
      if (item.status !== "available") { toast.error(`القطعة غير متاحة (${item.status})`); return; }
      if (cart.some(c => c.item.id === item.id)) { toast.error("القطعة موجودة في العربة"); return; }
      setCart(c => [...c, { item, price: item.salePrice, discount: 0 }]);
      if (!selectedBranchId) setSelectedBranchId(item.branchId);
      toast.success(`تمت الإضافة: ${item.sku}`);
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setScanning(false);
      setBarcodeInput("");
      barcodeRef.current?.focus();
    }
  }, [cart, selectedBranchId, toast]);

  const handleBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      scanItem(barcodeInput);
    }
  };

  const removeFromCart = (itemId: number) =>
    setCart(c => c.filter(ci => ci.item.id !== itemId));

  const updateCartPrice = (itemId: number, price: number) =>
    setCart(c => c.map(ci => ci.item.id === itemId ? { ...ci, price } : ci));

  const updateCartDiscount = (itemId: number, discount: number) =>
    setCart(c => c.map(ci => ci.item.id === itemId ? { ...ci, discount } : ci));

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`)
        .then(r => r.ok ? r.json() : [])
        .then(setCustomerResults);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const cartTotal = cart.reduce((s, ci) => s + (ci.price - ci.discount), 0);
  const netTotal = cartTotal - saleDiscount;

  const completeSale = async () => {
    if (!cart.length) { toast.error("العربة فارغة"); return; }
    if (!selectedBranchId) { toast.error("اختر الفرع"); return; }
    setCompleting(true);
    try {
      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          items: cart.map(ci => ({ jewelryItemId: ci.item.id, price: ci.price, discount: ci.discount })),
          customerId: selectedCustomer?.id ?? null,
          employeeId: selectedEmployeeId ?? null,
          paymentMethod,
          discountAmount: saleDiscount,
          notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "حدث خطأ");
        return;
      }
      const { saleId } = await res.json();
      router.push(`/pos/sale/${saleId}`);
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#edf1f8] flex flex-col" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shadow-sm no-print">
        <div className="font-bold text-lg" style={{ color: "#1e3a5f" }}>نقطة البيع</div>
        {session?.role === "admin" && (
          <select
            value={selectedBranchId ?? ""}
            onChange={e => setSelectedBranchId(parseInt(e.target.value))}
            className="border-0 bg-slate-50 rounded-xl py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
          >
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {selectedBranchId && (
          <span className="text-xs text-slate-400">
            {branches.find(b => b.id === selectedBranchId)?.name}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => {
            setShowHistory(h => !h);
            if (!showHistory) fetchRecentSales(selectedBranchId);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition ${
            showHistory
              ? "bg-navy text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <History size={15} />
          سجل المبيعات
        </button>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Cart */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-slate-200">
          {/* Barcode scanner input */}
          <div className="p-4 bg-white border-b border-slate-100">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value.toUpperCase())}
              onKeyDown={handleBarcodeKey}
              placeholder="امسح الباركود أو اكتب SKU ثم اضغط Enter..."
              disabled={scanning}
              className="w-full border-0 bg-slate-50 rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-blue-300 focus:outline-none"
              autoComplete="off"
            />
          </div>

          {/* Cart table */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <ShoppingCart size={60} />
                <p className="mt-3 text-lg">العربة فارغة</p>
                <p className="text-sm">امسح باركود لإضافة قطعة</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">الصنف</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">العيار</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">الوزن</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">السعر</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">خصم</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">الإجمالي</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map(ci => (
                    <tr key={ci.item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{ci.item.category}</div>
                        <div className="text-xs text-slate-400 font-mono">{ci.item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ci.item.karat}K</td>
                      <td className="px-4 py-3 text-slate-600">{ci.item.netWeight}g</td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min="0" step="0.01"
                          value={ci.price}
                          onChange={e => updateCartPrice(ci.item.id, parseFloat(e.target.value) || 0)}
                          className="w-24 border-0 bg-slate-100 rounded-lg py-1 px-2 text-sm focus:ring-1 focus:ring-blue-300 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" min="0" step="0.01"
                          value={ci.discount}
                          onChange={e => updateCartDiscount(ci.item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 border-0 bg-slate-100 rounded-lg py-1 px-2 text-sm focus:ring-1 focus:ring-blue-300 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {fmt(ci.price - ci.discount)}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeFromCart(ci.item.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={5} className="px-4 py-3 font-bold text-slate-700 text-left">المجموع</td>
                    <td className="px-4 py-3 font-bold text-lg" style={{ color: "#1e3a5f" }}>{fmt(cartTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Right: Payment panel */}
        <div className="w-80 bg-white flex flex-col overflow-y-auto border-r border-slate-100 shadow-lg">
          <div className="p-4 flex-1 space-y-4">
            {/* Customer */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <User size={12} /> العميل
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
                  <div>
                    <div className="font-medium text-sm text-slate-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-500">{selectedCustomer.phone}</div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500">×</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="بحث عن عميل..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white rounded-xl shadow-lg border border-slate-100 mt-1">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); setCustomerResults([]); }}
                          className="w-full text-right px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-slate-400">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Employee */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">الموظف</label>
              <select
                value={selectedEmployeeId ?? ""}
                onChange={e => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              >
                <option value="">بدون موظف</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium border-2 transition ${
                        paymentMethod === m.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-100 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Icon size={16} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">خصم إجمالي</label>
              <input
                type="number" min="0" step="0.01"
                value={saleDiscount}
                onChange={e => setSaleDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">ملاحظات</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Summary + Complete button */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>المجموع</span><span>{fmt(cartTotal)}</span>
            </div>
            {saleDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>الخصم</span><span>- {fmt(saleDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg" style={{ color: "#1e3a5f" }}>
              <span>الصافي</span><span>{fmt(netTotal)}</span>
            </div>
            <button
              onClick={completeSale}
              disabled={completing || cart.length === 0}
              className="w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition"
              style={{ background: "#1e3a5f" }}
            >
              <CheckCircle size={18} />
              {completing ? "جاري الإتمام..." : "إتمام البيع"}
            </button>
          </div>
        </div>
      </div>
      {/* History slide-over panel */}
      {showHistory && (
        <div className="absolute inset-0 z-30 flex" dir="rtl">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setShowHistory(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-md bg-white flex flex-col shadow-2xl h-full overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} style={{ color: "#1e3a5f" }} />
                <span className="font-bold text-slate-800">سجل المبيعات الأخيرة</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Filter toggle */}
                <button
                  onClick={() => setHideRefunded(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition ${
                    hideRefunded
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {hideRefunded ? "إخفاء المُسترجعة" : "إظهار الكل"}
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Sales list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {recentSales
                .filter(s => hideRefunded ? !s.notes?.startsWith("[مرتجع]") : true)
                .map(sale => {
                  const isRefunded = sale.notes?.startsWith("[مرتجع]");
                  return (
                    <Link
                      key={sale.id}
                      href={`/pos/sale/${sale.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition"
                      onClick={() => setShowHistory(false)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {sale.invoiceNum}
                          </span>
                          {isRefunded && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                              مُسترجع
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {sale.customer?.name && (
                            <span className="ml-2">{sale.customer.name}</span>
                          )}
                          {sale.employee?.name && (
                            <span className="ml-2 text-slate-300">· {sale.employee.name}</span>
                          )}
                          <span>
                            {new Date(sale.createdAt).toLocaleDateString("ar-SA-u-nu-latn", {
                              month: "2-digit", day: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold text-sm ${isRefunded ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {fmt(sale.totalAmount)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {sale.paymentMethod === "cash" ? "نقدي" : sale.paymentMethod === "card" ? "شبكة" : "تحويل"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              {recentSales.filter(s => hideRefunded ? !s.notes?.startsWith("[مرتجع]") : true).length === 0 && (
                <div className="text-center py-12 text-slate-300 text-sm">
                  لا توجد مبيعات
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback, Fragment } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowRight, Printer, RotateCcw } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";

interface SaleItem {
  id: number;
  price: number;
  discount: number;
  quantity: number;
  jewelryItem: {
    sku: string;
    barcode: string;
    category: string;
    karat: number;
    metalType: string;
    grossWeight: number;
    netWeight: number;
    stoneType: string;
    stoneWeight: number;
    stoneCount: number;
    stoneValue: number;
    makingCharges: number;
  } | null;
}

interface StoreInfo {
  storeVatNumber?: string;
  storePhone?: string;
  storeAddress?: string;
  storeManager?: string;
}

interface Sale {
  id: number;
  invoiceNum: string;
  totalAmount: number;
  discount: number;
  paymentMethod: string;
  notes: string;
  createdAt: string;
  customer: { name: string; phone: string } | null;
  employee: { name: string } | null;
  branch: { name: string; branchNum: string };
  user: { username: string };
  saleItems: SaleItem[];
  goldPricePerGram: number | null;
  storeInfo: StoreInfo;
}

const paymentLabels: Record<string, string> = {
  cash: "نقداً",
  card: "بطاقة / شبكة",
  transfer: "تحويل بنكي",
};

const karatLabels: Record<number, string> = {
  18: "18K", 21: "21K", 22: "22K", 24: "24K",
};

export default function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const fmt = useFormatCurrency();
  const toast = useToast();

  const fetchSale = useCallback(() => {
    setLoading(true);
    fetch(`/api/pos/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setSale(data); setLoading(false); });
  }, [id]);

  useEffect(() => { fetchSale(); }, [fetchSale]);

  const isRefunded = sale?.notes?.startsWith("[مرتجع]") ?? false;

  const handleRefund = async () => {
    setRefunding(true);
    try {
      const res = await fetch(`/api/pos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", reason: refundReason }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "حدث خطأ أثناء الاسترجاع");
        return;
      }
      toast.success("تم الاسترجاع بنجاح");
      setShowRefundModal(false);
      setRefundReason("");
      fetchSale();
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setRefunding(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-slate-400">جاري التحميل...</div>;
  if (!sale) return <div className="text-center py-16 text-red-400">فاتورة غير موجودة</div>;

  // VAT calculation (15% included in price)
  const vatRate = 0.15;
  const baseAmount = sale.totalAmount / (1 + vatRate);
  const vatAmount = sale.totalAmount - baseAmount;

  // Unique karats in this sale
  const itemKarats = [
    ...new Set(
      sale.saleItems
        .map((i) => i.jewelryItem?.karat)
        .filter((k): k is number => !!k)
    ),
  ].sort((a, b) => b - a);

  const saleDate = new Date(sale.createdAt);
  const dateStr = saleDate.toLocaleDateString("ar-SA-u-nu-latn", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const timeStr = saleDate.toLocaleTimeString("ar-SA-u-nu-latn", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Refund Banner (screen only) */}
      {isRefunded && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-center gap-3 no-print">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-bold text-red-700 text-base">هذه الفاتورة مُسترجعة</div>
            <div className="text-sm text-red-500 mt-0.5">
              تم إعادة القطع للمخزون وإلغاء تأثير الفاتورة على اليومية
            </div>
          </div>
        </div>
      )}

      {/* Action Bar (screen only) */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowRight size={16} /> العودة لنقطة البيع
        </Link>
        <div className="flex items-center gap-2">
          {!isRefunded && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="flex items-center gap-2 border-2 border-red-400 text-red-500 px-4 py-2 rounded-xl text-sm hover:bg-red-50 transition font-medium"
            >
              <RotateCcw size={15} /> استرجاع الفاتورة
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm hover:opacity-90 transition"
          >
            <Printer size={15} /> طباعة
          </button>
        </div>
      </div>

      {/* Receipt */}
      <div className={CARD}>
        <div className="p-6 print-receipt" dir="rtl">

          {/* ══ Return Stamp ══ */}
          {isRefunded && (
            <div className="text-center mb-5 py-3 border-2 border-red-500 rounded-2xl">
              <p className="text-red-600 font-black text-xl tracking-wide">مُسترجعة</p>
              <p className="text-red-400 text-xs mt-0.5">RETURNED / REFUNDED</p>
            </div>
          )}

          {/* ══ Store Header ══ */}
          <div className="text-center mb-5 pb-4 border-b border-dashed border-slate-300">
            <h1 className="text-lg font-black text-navy mb-0.5">يومية المضيان للمجوهرات</h1>
            <p className="text-sm font-semibold text-slate-600">{sale.branch.name}</p>
            {sale.storeInfo.storeVatNumber && (
              <p className="text-xs text-slate-500 mt-1">
                الرقم الضريبي: {sale.storeInfo.storeVatNumber}
              </p>
            )}
            {sale.storeInfo.storeAddress && (
              <p className="text-xs text-slate-400 mt-0.5 whitespace-pre-line">
                {sale.storeInfo.storeAddress}
              </p>
            )}
            {sale.storeInfo.storePhone && (
              <p className="text-xs text-slate-400 mt-0.5 dir-ltr">
                {sale.storeInfo.storePhone}
              </p>
            )}
          </div>

          {/* ══ Invoice Type Label ══ */}
          <div className="text-center mb-4">
            <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest ${
              isRefunded
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-700"
            }`}>
              {isRefunded ? "فاتورة استرجاع · RETURN INVOICE" : "فاتورة مبيعات · SALES INVOICE"}
            </span>
          </div>

          {/* ══ Invoice Details ══ */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">رقم الفاتورة</span>
              <span className="font-bold text-slate-800 font-mono text-sm">{sale.invoiceNum}</span>
            </div>
            <div className="text-left">
              <span className="text-slate-400 block mb-0.5">التاريخ والوقت</span>
              <span className="font-semibold text-slate-700">{dateStr} {timeStr}</span>
            </div>
            {sale.customer && (
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">العميل</span>
                <span className="font-semibold text-slate-700">{sale.customer.name}</span>
                {sale.customer.phone && (
                  <span className="block text-slate-400 font-mono">{sale.customer.phone}</span>
                )}
              </div>
            )}
            {sale.employee && (
              <div>
                <span className="text-slate-400 block mb-0.5">الموظف</span>
                <span className="font-semibold text-slate-700">{sale.employee.name}</span>
              </div>
            )}
            <div className={sale.employee ? "text-left" : ""}>
              <span className="text-slate-400 block mb-0.5">البائع</span>
              <span className="text-slate-600">{sale.user.username}</span>
            </div>
          </div>

          {/* ══ Items Table ══ */}
          <div className="mb-5 border-t border-dashed border-slate-300 pt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="text-right pb-2 font-semibold">الصنف</th>
                  <th className="text-center pb-2 font-semibold hidden sm:table-cell print-col">العيار</th>
                  <th className="text-center pb-2 font-semibold hidden sm:table-cell print-col">و.إجمالي</th>
                  <th className="text-center pb-2 font-semibold hidden sm:table-cell print-col">و.صافي</th>
                  <th className="text-left pb-2 font-semibold">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {sale.saleItems.map((item) => {
                  const lineTotal = (item.price - item.discount) * item.quantity;
                  const ji = item.jewelryItem;
                  return (
                    <Fragment key={item.id}>
                      <tr className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-0">
                          <div className="font-bold text-slate-800 text-sm">
                            {ji?.category || "صنف"}
                          </div>
                          <div className="text-slate-400 font-mono text-xs mt-0.5">
                            {ji?.sku || "—"}
                          </div>
                          {/* Mobile: show weights inline */}
                          {ji && (
                            <div className="text-slate-400 mt-0.5 sm:hidden">
                              {karatLabels[ji.karat] || `${ji.karat}K`} ·
                              إج: {ji.grossWeight.toFixed(2)}غ ·
                              ص: {ji.netWeight.toFixed(2)}غ
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-center text-slate-600 hidden sm:table-cell print-col">
                          {ji ? (karatLabels[ji.karat] || `${ji.karat}K`) : "—"}
                        </td>
                        <td className="py-2 text-center text-slate-500 hidden sm:table-cell print-col">
                          {ji ? `${ji.grossWeight.toFixed(2)}غ` : "—"}
                        </td>
                        <td className="py-2 text-center text-slate-500 hidden sm:table-cell print-col">
                          {ji ? `${ji.netWeight.toFixed(2)}غ` : "—"}
                        </td>
                        <td className="py-2 text-left">
                          <div className="font-bold text-slate-800 text-sm">{fmt(lineTotal)}</div>
                          {item.quantity > 1 && (
                            <div className="text-slate-400">×{item.quantity}</div>
                          )}
                        </td>
                      </tr>
                      {item.discount > 0 && (
                        <tr className="border-b border-slate-100">
                          <td colSpan={5} className="pb-2 pt-0 text-left">
                            <span className="text-emerald-600 text-xs">خصم: − {fmt(item.discount * item.quantity)}</span>
                          </td>
                        </tr>
                      )}
                      {ji?.stoneType && (
                        <tr className="border-b border-slate-100">
                          <td colSpan={5} className="pb-2 pt-0 text-xs text-slate-400">
                            حجر: {ji.stoneType}
                            {ji.stoneWeight > 0 && ` · ${ji.stoneWeight} قيراط`}
                            {ji.stoneCount > 0 && ` · ${ji.stoneCount} حبة`}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ══ Gold Rates ══ */}
          {sale.goldPricePerGram && itemKarats.length > 0 && (
            <div className="mb-5 pb-4 border-b border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-2">أسعار الذهب اليوم</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {itemKarats.map((k) => {
                  const rate = sale.goldPricePerGram! * (k / 24);
                  return (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-500">{k} عيار</span>
                      <span className="font-semibold text-slate-700">
                        {rate.toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س/غ
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ Totals ══ */}
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>المجموع قبل الضريبة</span>
              <span>{fmt(baseAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>ضريبة القيمة المضافة (15%)</span>
              <span>{fmt(vatAmount)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>خصم إجمالي</span>
                <span>− {fmt(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-slate-200 pt-2 mt-1">
              <span className="font-black text-slate-800">الإجمالي المدفوع</span>
              <span className="font-black text-navy text-lg">{fmt(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">طريقة الدفع</span>
              <span className="font-semibold text-slate-600">
                {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
              </span>
            </div>
          </div>

          {/* ══ Footer ══ */}
          <div className="text-center pt-4 border-t border-dashed border-slate-200">
            {sale.storeInfo.storeManager && (
              <p className="text-xs text-slate-400 mb-3">
                المدير: {sale.storeInfo.storeManager}
              </p>
            )}
            <p className="text-xs text-slate-400 font-semibold">شكراً لتعاملكم معنا</p>
            <p className="text-xs text-slate-300 mt-1">يومية المضيان للمجوهرات</p>
          </div>
        </div>
      </div>

      {/* ══ Refund Modal ══ */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl">
          <div className={`${CARD} w-full max-w-md`}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">تأكيد استرجاع الفاتورة</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                سيتم إعادة القطع للمخزون وإلغاء تأثير الفاتورة على اليومية
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">
                  سبب الاسترجاع <span className="font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder="اكتب سبب الاسترجاع..."
                  className="w-full border-0 bg-slate-50 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleRefund}
                  disabled={refunding}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                >
                  {refunding ? "جاري الاسترجاع..." : "تأكيد الاسترجاع"}
                </button>
                <button
                  onClick={() => { setShowRefundModal(false); setRefundReason(""); }}
                  disabled={refunding}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Print Styles ══ */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; font-size: 11px; }
          .no-print { display: none !important; }
          .print-col { display: table-cell !important; }
          @page { size: 80mm auto; margin: 5mm; }
        }
      `}</style>
    </div>
  );
}

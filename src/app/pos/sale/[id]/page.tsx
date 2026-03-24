"use client";
import { useEffect, useState, useCallback } from "react";
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
    category: string;
    karat: string;
    metalType: string;
    netWeight: number;
  } | null;
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
}

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
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSale(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

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

  const paymentLabels: Record<string, string> = {
    cash: "نقداً",
    card: "بطاقة",
    transfer: "تحويل بنكي",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Refund Banner */}
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

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <Link href="/pos" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition">
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
            onClick={() => {
              if (isRefunded) {
                toast.info("تحذير: هذه الفاتورة مُسترجعة");
              }
              window.print();
            }}
            disabled={isRefunded}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={15} /> طباعة
          </button>
        </div>
      </div>

      {/* Receipt Card */}
      <div className={CARD}>
        {/* Printable Receipt */}
        <div className="p-6 print-receipt">
          {/* Refunded stamp in print */}
          {isRefunded && (
            <div className="text-center mb-4 py-2 border-2 border-red-400 rounded-xl text-red-600 font-bold text-lg">
              مُسترجعة — REFUNDED
            </div>
          )}

          {/* Store Header */}
          <div className="text-center mb-6 pb-5 border-b border-dashed border-slate-200">
            <h1 className="text-xl font-black text-navy mb-1">يومية المضيان للمجوهرات</h1>
            <p className="text-sm text-slate-500">{sale.branch.name}</p>
            <p className="text-xs text-slate-400 mt-1">فاتورة مبيعات</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div>
              <span className="text-slate-400 block text-xs mb-0.5">رقم الفاتورة</span>
              <span className="font-bold text-slate-800 font-mono">{sale.invoiceNum}</span>
            </div>
            <div className="text-left">
              <span className="text-slate-400 block text-xs mb-0.5">التاريخ</span>
              <span className="font-semibold text-slate-700">
                {new Date(sale.createdAt).toLocaleDateString("ar-SA-u-nu-latn", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            {sale.customer && (
              <div>
                <span className="text-slate-400 block text-xs mb-0.5">العميل</span>
                <span className="font-semibold text-slate-700">{sale.customer.name}</span>
                {sale.customer.phone && (
                  <span className="block text-xs text-slate-400">{sale.customer.phone}</span>
                )}
              </div>
            )}
            {sale.employee && (
              <div>
                <span className="text-slate-400 block text-xs mb-0.5">الموظف</span>
                <span className="font-semibold text-slate-700">{sale.employee.name}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 pb-2">الصنف</th>
                  <th className="text-center py-2 text-xs font-semibold text-slate-500 pb-2 hidden sm:table-cell">التفاصيل</th>
                  <th className="text-center py-2 text-xs font-semibold text-slate-500 pb-2">الكمية</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 pb-2">السعر</th>
                </tr>
              </thead>
              <tbody>
                {sale.saleItems.map((item) => {
                  const lineTotal = (item.price - item.discount) * item.quantity;
                  return (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3">
                        <div className="font-semibold text-slate-800">
                          {item.jewelryItem?.category || "صنف"}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {item.jewelryItem?.sku || "—"}
                        </div>
                      </td>
                      <td className="py-3 text-center text-xs text-slate-500 hidden sm:table-cell">
                        {item.jewelryItem ? (
                          <>
                            <div>{item.jewelryItem.karat}</div>
                            <div>{item.jewelryItem.netWeight}غ</div>
                          </>
                        ) : "—"}
                      </td>
                      <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-left">
                        <div className="font-semibold text-slate-800">{fmt(lineTotal)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-emerald-600">خصم: {fmt(item.discount)}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">المجموع قبل الخصم</span>
              <span className="text-slate-700">
                {fmt(sale.saleItems.reduce((s, i) => s + i.price * i.quantity, 0))}
              </span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">خصم إجمالي</span>
                <span className="text-emerald-600">− {fmt(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-800">الإجمالي المدفوع</span>
              <span className="text-navy text-lg">{fmt(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">طريقة الدفع</span>
              <span className="text-slate-600 font-semibold">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-dashed border-slate-200">
            <p className="text-xs text-slate-400">شكراً لتعاملكم معنا</p>
            <p className="text-xs text-slate-300 mt-1">يومية المضيان للمجوهرات</p>
          </div>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
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
                  onChange={e => setRefundReason(e.target.value)}
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; }
          .no-print { display: none !important; }
          @page { size: 80mm auto; margin: 5mm; }
        }
      `}</style>
    </div>
  );
}

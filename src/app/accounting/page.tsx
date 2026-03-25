"use client";
import { useState, useEffect, useCallback } from "react";
import { BookOpen, BarChart3, ListChecks, RefreshCw, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import { useFormatCurrency } from "@/lib/userPrefs";
import { useToast } from "@/components/Toast";

const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";

type Tab = "coa" | "journal" | "trial-balance";

interface Account {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  type: string;
  parentCode: string;
  isActive: boolean;
}

interface JournalLine {
  id: number;
  debit: number;
  credit: number;
  description: string;
  account: { code: string; nameAr: string };
}

interface JournalEntry {
  id: number;
  entryNum: string;
  date: string;
  description: string;
  ref: string;
  type: string;
  status: string;
  branchId: number | null;
  lines: JournalLine[];
}

interface TrialRow {
  code: string;
  nameAr: string;
  type: string;
  parentCode: string;
  debit: number;
  credit: number;
  balance: number;
}

const TYPE_LABELS: Record<string, string> = {
  asset: "أصول",
  liability: "التزامات",
  equity: "حقوق الملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

const ENTRY_TYPE_LABELS: Record<string, string> = {
  sale: "مبيعات",
  refund: "مرتجع",
  purchase: "مشتريات",
  payroll: "رواتب",
  adjustment: "تسوية",
  manual: "يدوي",
};

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("coa");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<{ entries: JournalEntry[]; total: number; pages: number }>({ entries: [], total: 0, pages: 1 });
  const [trialBalance, setTrialBalance] = useState<{ rows: TrialRow[]; totalDebit: number; totalCredit: number; balanced: boolean } | null>(null);
  const [journalPage, setJournalPage] = useState(1);
  const [journalSearch, setJournalSearch] = useState("");
  const [journalType, setJournalType] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null);
  const fmt = useFormatCurrency();
  const toast = useToast();

  const fetchCOA = useCallback(async () => {
    const res = await fetch("/api/accounting/coa");
    if (res.ok) setAccounts(await res.json());
  }, []);

  const fetchJournal = useCallback(async () => {
    const params = new URLSearchParams({ page: String(journalPage), limit: "30" });
    if (journalSearch) params.set("search", journalSearch);
    if (journalType) params.set("type", journalType);
    const res = await fetch(`/api/accounting/journal?${params}`);
    if (res.ok) setJournal(await res.json());
  }, [journalPage, journalSearch, journalType]);

  const fetchTrialBalance = useCallback(async () => {
    const res = await fetch("/api/accounting/trial-balance");
    if (res.ok) setTrialBalance(await res.json());
  }, []);

  useEffect(() => { if (tab === "coa") fetchCOA(); }, [tab, fetchCOA]);
  useEffect(() => { if (tab === "journal") fetchJournal(); }, [tab, journalPage, journalSearch, journalType, fetchJournal]);
  useEffect(() => { if (tab === "trial-balance") fetchTrialBalance(); }, [tab, fetchTrialBalance]);

  const seedCOA = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/accounting/coa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSeedResult(data);
        toast.success(`تم إنشاء ${data.created} حساب، تم تجاهل ${data.skipped} موجود مسبقاً`);
        fetchCOA();
      } else {
        toast.error("فشل تهيئة دليل الحسابات");
      }
    } finally {
      setSeeding(false);
    }
  };

  const typeColors: Record<string, string> = {
    asset: "bg-blue-50 text-blue-700",
    liability: "bg-rose-50 text-rose-700",
    equity: "bg-violet-50 text-violet-700",
    revenue: "bg-emerald-50 text-emerald-700",
    expense: "bg-amber-50 text-amber-700",
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-20 sm:pb-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e3a5f, #2d5a9e)" }}>
          <Landmark size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">المحاسبة</h1>
          <p className="text-xs text-slate-500">دليل الحسابات · دفتر اليومية · ميزان المراجعة</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([ ["coa", "دليل الحسابات", <ListChecks size={15} key="c" />], ["journal", "دفتر اليومية", <BookOpen size={15} key="j" />], ["trial-balance", "ميزان المراجعة", <BarChart3 size={15} key="t" />] ] as [Tab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === key
                ? "bg-navy text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Chart of Accounts ── */}
      {tab === "coa" && (
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <ListChecks size={18} className="text-blue-600" />
            <span className="font-black text-slate-800">دليل الحسابات</span>
            <span className="mr-auto text-xs text-slate-500">{accounts.length} حساب</span>
            <button
              onClick={seedCOA}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
              {accounts.length === 0 ? "تهيئة الحسابات الافتراضية" : "إضافة الحسابات الناقصة"}
            </button>
          </div>

          {seedResult && (
            <div className="mx-5 my-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle2 size={16} />
              تم إنشاء {seedResult.created} حساب جديد، {seedResult.skipped} حساب موجود مسبقاً
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="text-slate-600 font-bold">دليل الحسابات فارغ</p>
              <p className="text-slate-400 text-sm mt-1">اضغط &quot;تهيئة الحسابات الافتراضية&quot; لإنشاء الحسابات القياسية لمحل مجوهرات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-right text-slate-500 font-bold w-24">الرمز</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">الاسم عربي</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold hidden md:table-cell">الاسم إنجليزي</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold">النوع</th>
                    <th className="px-4 py-3 text-right text-slate-500 font-bold hidden md:table-cell">الأصل</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-700 font-bold">{acc.code}</td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{acc.nameAr}</td>
                      <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{acc.nameEn}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${typeColors[acc.type] ?? "bg-slate-100 text-slate-600"}`}>
                          {TYPE_LABELS[acc.type] ?? acc.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs hidden md:table-cell">{acc.parentCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Journal Entries ── */}
      {tab === "journal" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className={`${CARD} px-5 py-4 flex flex-wrap gap-3 items-center`}>
            <input
              type="text"
              placeholder="بحث برقم القيد أو المرجع..."
              value={journalSearch}
              onChange={(e) => { setJournalSearch(e.target.value); setJournalPage(1); }}
              className="border-0 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none w-64"
            />
            <select
              value={journalType}
              onChange={(e) => { setJournalType(e.target.value); setJournalPage(1); }}
              className="border-0 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            >
              <option value="">جميع الأنواع</option>
              {Object.entries(ENTRY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-xs text-slate-400 mr-auto">{journal.total} قيد</span>
          </div>

          {journal.entries.length === 0 ? (
            <div className={`${CARD} px-5 py-12 text-center`}>
              <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">لا توجد قيود محاسبية</p>
              <p className="text-slate-400 text-sm mt-1">سيتم إنشاء القيود تلقائياً عند إتمام عمليات البيع</p>
            </div>
          ) : (
            journal.entries.map((entry) => (
              <div key={entry.id} className={CARD}>
                <div className={`${CARD_HDR} border-b border-slate-100`} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
                  <BookOpen size={16} className="text-blue-600" />
                  <span className="font-mono font-bold text-slate-800 text-sm">{entry.entryNum}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                    entry.type === "sale" ? "bg-emerald-50 text-emerald-700" :
                    entry.type === "refund" ? "bg-rose-50 text-rose-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                  <span className="text-slate-500 text-xs">{entry.ref}</span>
                  <span className="mr-auto text-slate-400 text-xs">{new Date(entry.date).toLocaleDateString("ar-SA")}</span>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-500 mb-3">{entry.description}</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-right pb-1 font-bold">الحساب</th>
                        <th className="text-left pb-1 font-bold w-28">مدين</th>
                        <th className="text-left pb-1 font-bold w-28">دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((line) => (
                        <tr key={line.id} className="border-t border-slate-50">
                          <td className="py-1.5 text-slate-700">
                            <span className="font-mono text-slate-400 ml-2">{line.account.code}</span>
                            {line.account.nameAr}
                            {line.description && <span className="text-slate-400 mr-2">— {line.description}</span>}
                          </td>
                          <td className="py-1.5 text-left font-mono text-emerald-700">{line.debit > 0 ? fmt(line.debit) : ""}</td>
                          <td className="py-1.5 text-left font-mono text-blue-700">{line.credit > 0 ? fmt(line.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {journal.pages > 1 && (
            <div className="flex justify-center gap-2 mt-2">
              <button disabled={journalPage <= 1} onClick={() => setJournalPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-white shadow-sm text-sm disabled:opacity-40">السابق</button>
              <span className="px-4 py-2 text-sm text-slate-500">{journalPage} / {journal.pages}</span>
              <button disabled={journalPage >= journal.pages} onClick={() => setJournalPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-white shadow-sm text-sm disabled:opacity-40">التالي</button>
            </div>
          )}
        </div>
      )}

      {/* ── Trial Balance ── */}
      {tab === "trial-balance" && (
        <div className={CARD}>
          <div className={CARD_HDR} style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
            <BarChart3 size={18} className="text-violet-600" />
            <span className="font-black text-slate-800">ميزان المراجعة</span>
            {trialBalance && (
              <span className={`mr-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg ${
                trialBalance.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {trialBalance.balanced ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {trialBalance.balanced ? "متوازن" : "غير متوازن"}
              </span>
            )}
            <button onClick={fetchTrialBalance} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700">
              <RefreshCw size={13} />تحديث
            </button>
          </div>

          {!trialBalance ? (
            <div className="px-5 py-12 text-center text-slate-400">جاري التحميل...</div>
          ) : trialBalance.rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <BarChart3 size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">لا توجد قيود لعرض الميزان</p>
              <p className="text-slate-400 text-sm mt-1">أنشئ قيوداً محاسبية أولاً من خلال إتمام عمليات البيع</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-right text-slate-500 font-bold w-20">الرمز</th>
                      <th className="px-4 py-3 text-right text-slate-500 font-bold">اسم الحساب</th>
                      <th className="px-4 py-3 text-right text-slate-500 font-bold hidden md:table-cell">النوع</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-bold">مدين</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-bold">دائن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.rows.map((row) => (
                      <tr key={row.code} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{row.code}</td>
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{row.nameAr}</td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                            { asset: "bg-blue-50 text-blue-700", liability: "bg-rose-50 text-rose-700",
                              equity: "bg-violet-50 text-violet-700", revenue: "bg-emerald-50 text-emerald-700",
                              expense: "bg-amber-50 text-amber-700" }[row.type] ?? "bg-slate-100 text-slate-600"
                          }`}>{TYPE_LABELS[row.type] ?? row.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-left font-mono text-slate-700">{row.debit > 0 ? fmt(row.debit) : "—"}</td>
                        <td className="px-4 py-2.5 text-left font-mono text-slate-700">{row.credit > 0 ? fmt(row.credit) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={3} className="px-4 py-3 font-black text-slate-700 text-sm">الإجمالي</td>
                      <td className="px-4 py-3 text-left font-mono font-black text-slate-800">{fmt(trialBalance.totalDebit)}</td>
                      <td className="px-4 py-3 text-left font-mono font-black text-slate-800">{fmt(trialBalance.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!trialBalance.balanced && (
                <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">الميزان غير متوازن</p>
                    <p className="text-xs mt-0.5">الفرق: {fmt(Math.abs(trialBalance.totalDebit - trialBalance.totalCredit))} — يرجى مراجعة القيود المحاسبية</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

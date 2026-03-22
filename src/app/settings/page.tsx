"use client";
import { useUserPrefs, useFormatCurrency, type Theme, type NumberFormat, type NumberLang } from "@/lib/userPrefs";
import { Moon, Sun, Hash, Languages, SlidersHorizontal } from "lucide-react";

export default function SettingsPage() {
  const { prefs, setPrefs } = useUserPrefs();
  const fmt = useFormatCurrency();

  const previewAmount = 15750;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: "var(--navy)" }}>
          <SlidersHorizontal size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">الإعدادات</h1>
          <p className="text-xs text-slate-400">تخصيص واجهة المستخدم</p>
        </div>
      </div>

      {/* Theme */}
      <Card icon={<Moon size={18} className="text-indigo-500" />} title="المظهر">
        <div className="grid grid-cols-2 gap-3">
          <ToggleBtn
            active={prefs.theme === "light"}
            onClick={() => setPrefs({ theme: "light" as Theme })}
            icon={<Sun size={20} className="text-amber-500" />}
            label="فاتح"
          />
          <ToggleBtn
            active={prefs.theme === "dark"}
            onClick={() => setPrefs({ theme: "dark" as Theme })}
            icon={<Moon size={20} className="text-indigo-400" />}
            label="داكن"
          />
        </div>
      </Card>

      {/* Number Format */}
      <Card icon={<Hash size={18} className="text-blue-500" />} title="تنسيق الأرقام">
        <div className="space-y-2">
          {(
            [
              { value: "comma",         label: "أرقام مع فواصل",           example: "15,750" },
              { value: "comma-decimal", label: "أرقام مع فواصل وكسور",     example: "15,750.00" },
              { value: "plain",         label: "أرقام بدون تنسيق",         example: "15750" },
            ] as { value: NumberFormat; label: string; example: string }[]
          ).map((opt) => {
            const active = prefs.numberFormat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPrefs({ numberFormat: opt.value })}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-right ${
                  active ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
                style={active ? { borderColor: "var(--navy)", backgroundColor: "#e8edf5" } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? "border-4" : "border-slate-300"}`}
                    style={active ? { borderColor: "var(--navy)", backgroundColor: "var(--navy)" } : {}} />
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{opt.example}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Number Language */}
      <Card icon={<Languages size={18} className="text-emerald-500" />} title="لغة الأرقام">
        <div className="grid grid-cols-2 gap-3">
          <ToggleBtn
            active={prefs.numberLang === "en"}
            onClick={() => setPrefs({ numberLang: "en" as NumberLang })}
            label="إنجليزي"
            sub="1234"
          />
          <ToggleBtn
            active={prefs.numberLang === "ar"}
            onClick={() => setPrefs({ numberLang: "ar" as NumberLang })}
            label="عربي"
            sub="١٢٣٤"
          />
        </div>
      </Card>

      {/* Preview */}
      <Card icon={<span className="text-slate-400 font-bold text-sm">ريال</span>} title="معاينة">
        <div className="text-center py-4">
          <p className="text-xs text-slate-400 mb-1">مثال على عرض المبلغ</p>
          <p className="text-3xl font-black" style={{ color: "var(--navy)" }}>{fmt(previewAmount)}</p>
        </div>
      </Card>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: "linear-gradient(135deg, #f8faff, #f0f4fb)" }}>
        {icon}
        <span className="font-black text-sm text-slate-700">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon?: React.ReactNode; label: string; sub?: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition font-medium text-sm ${
        active
          ? "text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
      style={active ? { borderColor: "var(--navy)", backgroundColor: "var(--navy)" } : {}}>
      {icon}
      <span>{label}</span>
      {sub && <span className={`text-lg font-black ${active ? "text-sky-200" : "text-slate-400"}`}>{sub}</span>}
    </button>
  );
}

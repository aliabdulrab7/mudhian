"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type NumberFormat = "comma" | "comma-decimal" | "plain";
export type NumberLang = "en" | "ar";
export type Theme = "light" | "dark";

export interface UserPrefs {
  theme: Theme;
  numberFormat: NumberFormat;
  numberLang: NumberLang;
}

const DEFAULT_PREFS: UserPrefs = { theme: "light", numberFormat: "comma", numberLang: "en" };

const UserPrefsContext = createContext<{
  prefs: UserPrefs;
  setPrefs: (p: Partial<UserPrefs>) => void;
}>({ prefs: DEFAULT_PREFS, setPrefs: () => {} });

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mudhian-prefs");
      if (stored) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (prefs.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [prefs.theme, mounted]);

  const setPrefs = (p: Partial<UserPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefsState(next);
    try { localStorage.setItem("mudhian-prefs", JSON.stringify(next)); } catch {}
  };

  return (
    <UserPrefsContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export const useUserPrefs = () => useContext(UserPrefsContext);

export function formatAmount(amount: number, format: NumberFormat, lang: NumberLang): string {
  const locale = lang === "ar" ? "ar-SA-u-nu-arab" : "en-US";
  const fractionDigits = format === "comma-decimal" ? 2 : 0;

  // Build number string based on format
  let formatted: string;
  if (format === "plain") {
    // No grouping separators at all
    formatted = Math.round(amount).toString();
    if (lang === "ar") {
      formatted = formatted.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
    }
  } else {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }
  return `${formatted} ريال`;
}

export function useFormatCurrency() {
  const { prefs } = useUserPrefs();
  return (amount: number) => formatAmount(amount, prefs.numberFormat, prefs.numberLang);
}

"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, type, message }]);
    const delay = type === "error" ? 5000 : 3000;
    timers.current.set(id, setTimeout(() => dismiss(id), delay));
  }, [dismiss]);

  const ctx: ToastContextValue = {
    success: (msg) => add("success", msg),
    error: (msg) => add("error", msg),
    info: (msg) => add("info", msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toasts.length > 0 && (
        <div
          className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
          style={{ minWidth: 280, maxWidth: "90vw" }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium"
              style={{
                background:
                  t.type === "success" ? "#ecfdf5" :
                  t.type === "error"   ? "#fef2f2" :
                                         "#eff6ff",
                color:
                  t.type === "success" ? "#065f46" :
                  t.type === "error"   ? "#991b1b" :
                                         "#1e40af",
                border: `1px solid ${
                  t.type === "success" ? "#a7f3d0" :
                  t.type === "error"   ? "#fecaca" :
                                         "#bfdbfe"
                }`,
              }}
            >
              {t.type === "success" && <CheckCircle2 size={17} className="shrink-0" />}
              {t.type === "error"   && <AlertCircle  size={17} className="shrink-0" />}
              {t.type === "info"    && <Info          size={17} className="shrink-0" />}
              <span>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ms-1 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

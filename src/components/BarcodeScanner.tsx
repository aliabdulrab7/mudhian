"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (!videoRef.current) return;

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (!active || doneRef.current) return;
            if (result) {
              doneRef.current = true;
              setScanning(false);
              try { controls?.stop(); } catch { /* ignore */ }
              onScan(result.getText());
            }
            if (err) {
              const msg = String(err);
              if (!msg.includes("NotFoundException") && !msg.includes("No MultiFormat")) {
                console.warn("[BarcodeScanner]", err);
              }
            }
          }
        );
        stopRef.current = () => { try { controls?.stop(); } catch { /* ignore */ } };
      } catch (e) {
        setError("لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن.");
        console.error(e);
      }
    }

    start();

    return () => {
      active = false;
      stopRef.current?.();
    };
  }, [onScan]);

  return (
    <div
      className="no-print fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} />
          <span className="font-bold text-sm">مسح الباركود</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera view */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6">
            <p className="text-white text-sm font-medium mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-white text-gray-900 px-6 py-2.5 rounded-2xl font-bold text-sm"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
              playsInline
            />

            {/* Scanner frame overlay */}
            <div className="relative z-10 pointer-events-none" style={{ width: 240, height: 240 }}>
              {[
                { top: 0, right: 0, borderTop: "3px solid #38bdf8", borderRight: "3px solid #38bdf8", borderRadius: "0 12px 0 0" },
                { top: 0, left: 0, borderTop: "3px solid #38bdf8", borderLeft: "3px solid #38bdf8", borderRadius: "12px 0 0 0" },
                { bottom: 0, right: 0, borderBottom: "3px solid #38bdf8", borderRight: "3px solid #38bdf8", borderRadius: "0 0 12px 0" },
                { bottom: 0, left: 0, borderBottom: "3px solid #38bdf8", borderLeft: "3px solid #38bdf8", borderRadius: "0 0 0 12px" },
              ].map((style, i) => (
                <div key={i} style={{ position: "absolute", width: 32, height: 32, ...style }} />
              ))}

              {scanning && (
                <div
                  style={{
                    position: "absolute",
                    left: 4,
                    right: 4,
                    height: 2,
                    background: "linear-gradient(to right, transparent, #38bdf8, transparent)",
                    animation: "scanLine 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom label */}
      <div className="px-4 py-4 text-center z-10" style={{ background: "rgba(0,0,0,0.7)" }}>
        <p className="text-white/70 text-sm">
          {scanning ? "وجّه الكاميرا نحو الباركود" : "✓ تم مسح الباركود"}
        </p>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
      `}</style>
    </div>
  );
}

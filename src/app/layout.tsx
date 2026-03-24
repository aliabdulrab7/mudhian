import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { UserPrefsProvider } from "@/lib/userPrefs";
import { ToastProvider } from "@/components/Toast";

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "يومية المضيان للمجوهرات",
  description: "نظام إدارة اليوميات والمخزون",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "المضيان",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <UserPrefsProvider>
          <ToastProvider>
            <NavBar />
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5 pb-20 sm:pb-5">
              {children}
            </main>
          </ToastProvider>
        </UserPrefsProvider>
      </body>
    </html>
  );
}

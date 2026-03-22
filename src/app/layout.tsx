import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "يومية المضيان للمجوهرات",
  description: "نظام إدارة اليوميات والمخزون",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full bg-gray-50 flex flex-col font-sans">
        <NavBar />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5">
          {children}
        </main>
      </body>
    </html>
  );
}

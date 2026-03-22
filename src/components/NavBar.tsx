"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, BookOpen, Archive, Settings, BarChart3, SlidersHorizontal } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  // Re-fetch on every route change to catch user switching
  useEffect(() => {
    if (pathname === "/login") { setUser(null); return; }
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setUser(data?.userId ? data : null));
  }, [pathname]);

  if (pathname === "/login" || !user) return null;

  const logout = async () => {
    setUser(null);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const branchId = user.branchId;

  return (
    <nav className="bg-navy sticky top-0 z-40" style={{ boxShadow: "0 2px 20px rgba(15, 30, 55, 0.3)" }}>
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-1">
        <Link
          href={user.role === "admin" ? "/dashboard" : `/branch/${branchId}/drawer`}
          className="text-sm font-black text-white ml-4 tracking-wide flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-white text-xs font-black">م</span>
          يومية المضيان
        </Link>

        <div className="w-px h-4 bg-white/15 mx-3" />

        {user.role === "admin" ? (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard size={14} />} label="لوحة التحكم" active={pathname.startsWith("/dashboard")} />
            <NavItem href="/reports" icon={<BarChart3 size={14} />} label="التقارير" active={pathname.startsWith("/reports")} />
            <NavItem href="/admin" icon={<Settings size={14} />} label="إدارة النظام" active={pathname.startsWith("/admin")} />
          </>
        ) : user.role === "viewer" ? (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard size={14} />} label="لوحة التحكم" active={pathname.startsWith("/dashboard")} />
            <NavItem href="/reports" icon={<BarChart3 size={14} />} label="التقارير" active={pathname.startsWith("/reports")} />
          </>
        ) : (
          <>
            <NavItem href={`/branch/${branchId}/drawer`} icon={<BookOpen size={14} />} label="اليومية" active={pathname.includes("/drawer")} />
            <NavItem href={`/branch/${branchId}/archive`} icon={<Archive size={14} />} label="الأرشيف" active={pathname.includes("/archive")} />
          </>
        )}

        <div className="mr-auto flex items-center gap-2">
          {/* User pill */}
          <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-sky-200/70">
              {user.role === "admin" ? "مدير" : user.role === "viewer" ? "مراقب" : user.branchName}
            </span>
            <div className="w-px h-3 bg-white/20" />
            <span className="text-xs text-white font-bold">{user.username}</span>
          </div>

          {/* Settings */}
          <Link href="/settings"
            className={`p-2 rounded-xl transition ${
              pathname.startsWith("/settings")
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
            title="الإعدادات">
            <SlidersHorizontal size={15} />
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white hover:bg-red-500/25 px-3 py-2 rounded-xl transition"
          >
            <LogOut size={13} /> خروج
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, active }: {
  href: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition ${
        active
          ? "bg-white/20 text-white shadow-sm"
          : "text-white/50 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}{label}
    </Link>
  );
}

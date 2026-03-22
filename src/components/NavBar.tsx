"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, BookOpen, Archive, Settings, BarChart3 } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser);
  }, []);

  if (pathname === "/login" || !user) return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const branchId = user.branchId;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-1">
        <Link
          href={user.role === "admin" ? "/dashboard" : `/branch/${branchId}/drawer`}
          className="text-lg font-black text-slate-800 ml-5 hover:text-blue-600 transition"
        >
          مُضيان
        </Link>

        {user.role === "admin" ? (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard size={15} />} label="لوحة التحكم" active={pathname.startsWith("/dashboard")} />
            <NavItem href="/reports" icon={<BarChart3 size={15} />} label="التقارير" active={pathname.startsWith("/reports")} />
            <NavItem href="/admin" icon={<Settings size={15} />} label="إدارة النظام" active={pathname.startsWith("/admin")} />
          </>
        ) : user.role === "viewer" ? (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard size={15} />} label="لوحة التحكم" active={pathname.startsWith("/dashboard")} />
            <NavItem href="/reports" icon={<BarChart3 size={15} />} label="التقارير" active={pathname.startsWith("/reports")} />
          </>
        ) : (
          <>
            <NavItem href={`/branch/${branchId}/drawer`} icon={<BookOpen size={15} />} label="اليومية" active={pathname.includes("/drawer")} />
            <NavItem href={`/branch/${branchId}/archive`} icon={<Archive size={15} />} label="الأرشيف" active={pathname.includes("/archive")} />
          </>
        )}

        <div className="mr-auto flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">
            {user.role === "admin" ? "مدير النظام" : user.role === "viewer" ? "مراقب" : user.branchName}
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:block bg-slate-100 px-2 py-0.5 rounded-full">{user.username}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
          >
            <LogOut size={13} /> خروج
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
        active
          ? "bg-blue-50 text-blue-700 font-semibold"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {icon}{label}
    </Link>
  );
}

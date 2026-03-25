"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, LayoutDashboard, BookOpen, Archive, Settings, BarChart3,
  SlidersHorizontal, Menu, X, Package, ShoppingCart, Wrench, Users,
  Building2, ArrowLeftRight, Landmark,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-fetch on every route change to catch user switching
  useEffect(() => {
    if (pathname === "/login") { setUser(null); return; }
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setUser(data?.userId ? data : null));
  }, [pathname]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (pathname === "/login" || !user) return null;

  const logout = async () => {
    setUser(null);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const branchId = user.branchId;

  const navLinks = user.role === "admin" ? [
    { href: "/dashboard", icon: <LayoutDashboard size={16} />, label: "لوحة التحكم" },
    { href: "/inventory", icon: <Package size={16} />, label: "المخزون" },
    { href: "/pos", icon: <ShoppingCart size={16} />, label: "نقطة البيع" },
    { href: "/repairs", icon: <Wrench size={16} />, label: "الصيانة" },
    { href: "/customers", icon: <Users size={16} />, label: "العملاء" },
    { href: "/suppliers", icon: <Building2 size={16} />, label: "الموردون" },
    { href: "/stock-transfers", icon: <ArrowLeftRight size={16} />, label: "تحويلات المخزون" },
    { href: "/accounting", icon: <Landmark size={16} />, label: "المحاسبة" },
    { href: "/reports", icon: <BarChart3 size={16} />, label: "التقارير" },
    { href: "/admin", icon: <Settings size={16} />, label: "الإدارة" },
  ] : user.role === "viewer" ? [
    { href: "/dashboard", icon: <LayoutDashboard size={16} />, label: "لوحة التحكم" },
    { href: "/inventory", icon: <Package size={16} />, label: "المخزون" },
    { href: "/customers", icon: <Users size={16} />, label: "العملاء" },
    { href: "/reports", icon: <BarChart3 size={16} />, label: "التقارير" },
  ] : [
    { href: `/branch/${branchId}/drawer`, icon: <BookOpen size={16} />, label: "اليومية" },
    { href: `/branch/${branchId}/archive`, icon: <Archive size={16} />, label: "الأرشيف" },
    { href: "/inventory", icon: <Package size={16} />, label: "المخزون" },
    { href: "/pos", icon: <ShoppingCart size={16} />, label: "نقطة البيع" },
    { href: "/repairs", icon: <Wrench size={16} />, label: "الصيانة" },
  ];

  return (
    <>
      <nav className="bg-navy sticky top-0 z-40" style={{ boxShadow: "0 2px 20px rgba(15, 30, 55, 0.3)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-1">
          {/* Logo */}
          <Link
            href={user.role === "admin" ? "/dashboard" : `/branch/${branchId}/drawer`}
            className="text-sm font-black text-white ml-3 tracking-wide flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-white text-xs font-black">م</span>
            <span className="hidden sm:inline">يومية المضيان</span>
          </Link>

          <div className="w-px h-4 bg-white/15 mx-2 hidden sm:block" />

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavItem key={link.href} href={link.href} icon={link.icon} label={link.label}
                active={pathname.startsWith(link.href.includes("/drawer") ? link.href.split("?")[0] : link.href) ||
                  (link.href.includes("/archive") && pathname.includes("/archive"))} />
            ))}
          </div>

          <div className="mr-auto flex items-center gap-2">
            {/* User pill — desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-sky-200/70">
                {user.role === "admin" ? "مدير" : user.role === "viewer" ? "مراقب" : user.branchName}
              </span>
              <div className="w-px h-3 bg-white/20" />
              <span className="text-xs text-white font-bold">{user.username}</span>
            </div>

            {/* Settings */}
            <Link href="/settings"
              className={`p-2.5 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                pathname.startsWith("/settings")
                  ? "bg-white/20 text-white"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              }`}
              title="الإعدادات">
              <SlidersHorizontal size={15} />
            </Link>

            {/* Logout — desktop */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 hover:text-white hover:bg-red-500/25 px-3 py-2 rounded-xl transition"
            >
              <LogOut size={13} /> خروج
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="sm:hidden p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="القائمة"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-white/10" style={{ background: "rgba(15,30,55,0.97)" }}>
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20"
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-white/10 pt-2 mt-2 flex items-center justify-between px-2">
                <div className="text-xs text-white/40">
                  {user.role === "admin" ? "مدير" : user.role === "viewer" ? "مراقب" : user.branchName}
                  {" · "}
                  <span className="text-white/60 font-semibold">{user.username}</span>
                </div>
                <button onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 px-3 py-2 rounded-xl transition">
                  <LogOut size={13} /> خروج
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── MOBILE BOTTOM NAV BAR ──────────────────────────────── */}
      <BottomNav user={user} pathname={pathname} branchId={branchId ?? undefined} />
    </>
  );
}

function BottomNav({ user, pathname, branchId }: {
  user: SessionUser; pathname: string; branchId?: number;
}) {
  const links = user.role === "admin" ? [
    { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "التحكم" },
    { href: "/inventory", icon: <Package size={20} />, label: "المخزون" },
    { href: "/suppliers", icon: <Building2 size={20} />, label: "الموردون" },
    { href: "/stock-transfers", icon: <ArrowLeftRight size={20} />, label: "تحويلات" },
    { href: "/repairs", icon: <Wrench size={20} />, label: "الصيانة" },
    { href: "/admin", icon: <Settings size={20} />, label: "الإدارة" },
  ] : user.role === "viewer" ? [
    { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "التحكم" },
    { href: "/inventory", icon: <Package size={20} />, label: "المخزون" },
    { href: "/customers", icon: <Users size={20} />, label: "العملاء" },
    { href: "/reports", icon: <BarChart3 size={20} />, label: "التقارير" },
    { href: "/settings", icon: <SlidersHorizontal size={20} />, label: "الإعدادات" },
  ] : [
    { href: `/branch/${branchId}/drawer`, icon: <BookOpen size={20} />, label: "اليومية" },
    { href: "/inventory", icon: <Package size={20} />, label: "المخزون" },
    { href: "/pos", icon: <ShoppingCart size={20} />, label: "البيع" },
    { href: "/repairs", icon: <Wrench size={20} />, label: "الصيانة" },
    { href: "/settings", icon: <SlidersHorizontal size={20} />, label: "الإعدادات" },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-safe"
      style={{ background: "rgba(15,30,55,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -4px 24px rgba(0,0,0,0.3)" }}>
      <div className="flex items-stretch justify-around">
        {links.map((link) => {
          const active = pathname.startsWith(link.href.split("?")[0]);
          return (
            <Link key={link.href} href={link.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[60px] text-[10px] font-semibold transition ${
                active ? "text-sky-300" : "text-white/40 hover:text-white/70"
              }`}>
              <span className={active ? "opacity-100" : "opacity-50"}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
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

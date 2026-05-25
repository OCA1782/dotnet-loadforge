"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileCode2,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Play,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";
import { useT } from "@/hooks/useT";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { lang, setLang } = useLangStore();
  const t = useT();

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/scenarios", label: t("nav.scenarios"), icon: FileCode2 },
    { href: "/runs", label: t("nav.runs"), icon: Play },
    { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
    { href: "/reports/compare", label: "Karşılaştır", icon: GitCompare },
    { href: "/guide", label: t("nav.guide"), icon: BookOpen },
  ];

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
        <Zap className="h-5 w-5 text-blue-400" />
        <span className="text-sm font-bold tracking-wide text-zinc-100">
          LoadForge
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-3 flex flex-col gap-1">
        {/* Language toggle */}
        <div className="flex items-center gap-1 rounded-md border border-zinc-800 p-1 mb-1">
          <button
            onClick={() => setLang("en")}
            className={cn(
              "flex-1 rounded py-1 text-xs font-medium transition-colors",
              lang === "en"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLang("tr")}
            className={cn(
              "flex-1 rounded py-1 text-xs font-medium transition-colors",
              lang === "tr"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            TR
          </button>
        </div>

        <Link
          href="/settings/members"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          )}
        >
          <Settings className="h-4 w-4" />
          {t("nav.settings")}
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}

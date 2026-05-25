"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useT } from "@/hooks/useT";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();

  const tabs = [
    { href: "/settings/members", label: t("settings.members") },
    { href: "/settings/api-keys", label: t("settings.apiKeys") },
    { href: "/settings/environments", label: t("settings.environments") },
    { href: "/settings/notifications", label: t("settings.notifications") },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="border-b border-zinc-800 px-8 pt-8">
        <h1 className="mb-4 text-xl font-semibold text-zinc-100">{t("settings.title")}</h1>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2 text-sm rounded-t transition-colors",
                pathname === tab.href
                  ? "border-b-2 border-blue-500 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

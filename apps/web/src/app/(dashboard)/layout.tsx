"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/stores/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
    }
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

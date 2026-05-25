"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const t = useT();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/invitations/${params.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? t("invite.error"));
      }

      const data = await res.json() as { token: string };
      setToken(data.token);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-1 text-lg font-semibold text-zinc-100">{t("invite.title")}</h1>
        <p className="mb-6 text-sm text-zinc-500">{t("invite.subtitle")}</p>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">{t("invite.displayName")}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("invite.namePlaceholder")}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">{t("invite.password")}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("invite.passwordPlaceholder")}
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("invite.joining") : t("invite.join")}
          </Button>
        </form>
      </div>
    </div>
  );
}

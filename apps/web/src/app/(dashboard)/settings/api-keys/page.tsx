"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Copy, Check, Trash2, AlertCircle } from "lucide-react";

export default function ApiKeysPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.listApiKeys(),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createApiKey(name, []),
    onSuccess: (res) => {
      setNewKey(res.plaintextKey);
      setName("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">{t("apikeys.create")}</h2>
        <div className="flex gap-3">
          <Input
            placeholder={t("apikeys.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
          >
            <Key className="mr-2 h-4 w-4" />
            {t("common.generate")}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {newKey && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-amber-700/50 bg-amber-900/20 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-xs text-amber-400">{t("apikeys.warning")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2">
              <code className="flex-1 truncate text-xs text-green-400">{newKey}</code>
              <button onClick={copyKey} className="text-zinc-400 hover:text-zinc-100">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            {t("apikeys.list")} <span className="ml-1 text-zinc-500">({keys.length})</span>
          </h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-zinc-500">{t("common.loading")}</div>
        ) : keys.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">{t("apikeys.noKeys")}</div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className={`text-sm ${k.isRevoked ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                    {k.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    <code>{k.keyPrefix}...</code>
                    {k.lastUsedAt && (
                      <> · {t("apikeys.lastUsed")} {new Date(k.lastUsedAt).toLocaleDateString()}</>
                    )}
                    {k.expiresAt && (
                      <> · {t("apikeys.expires")} {new Date(k.expiresAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                {!k.isRevoked ? (
                  <button
                    onClick={() => revokeMutation.mutate(k.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-xs text-zinc-600">{t("common.revoked")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { EnvironmentDto } from "@/types";

function DeleteModal({
  env,
  onConfirm,
  onCancel,
  isPending,
}: {
  env: EnvironmentDto;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-red-900/50 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-900/30 p-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Ortamı Sil</h2>
        </div>
        <p className="mb-6 text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">{env.name}</span> ortamı silinecek.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending} className="flex-1">
            İptal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white"
          >
            {isPending ? "Siliniyor…" : "Sil"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentsPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnvironmentDto | null>(null);

  const { data: envs = [], isLoading } = useQuery({
    queryKey: ["environments"],
    queryFn: () => api.listEnvironments(),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createEnvironment(name, baseUrl || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["environments"] });
      setName("");
      setBaseUrl("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEnvironment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["environments"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          env={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("envs.create")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">{t("envs.subtitle")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("common.name")} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("envs.namePlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("envs.baseUrl")}</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t("envs.baseUrlPlaceholder")}
                />
              </div>
            </div>
            {error && (
              <p className="rounded-md bg-red-950/40 px-3 py-1.5 text-xs text-red-400">{error}</p>
            )}
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? "Ekleniyor…" : t("envs.create")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("envs.title")}</span>
              <span className="text-xs font-normal text-zinc-500">{envs.length} ortam</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-5 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : envs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <Globe className="h-8 w-8 text-zinc-700" />
                <p className="text-sm text-zinc-500">{t("envs.noEnvs")}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {[t("common.name"), t("envs.baseUrl"), t("common.created"), ""].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {envs.map((env) => (
                    <tr key={env.id} className="group border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-5 py-3 font-medium text-zinc-200">{env.name}</td>
                      <td className="px-5 py-3 text-zinc-400 font-mono text-xs">
                        {env.baseUrl ?? <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">
                        {new Date(env.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(env)}
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-red-400 hover:bg-red-900/20 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

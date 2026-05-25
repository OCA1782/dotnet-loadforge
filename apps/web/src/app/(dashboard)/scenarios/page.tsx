"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCode2, Plus, Pencil, Trash2, Play, X, Save, AlertTriangle, History } from "lucide-react";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ScenarioDto, ScenarioVersionDto } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-500">
      Editor yükleniyor…
    </div>
  ),
});

// ── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  scenario,
  onConfirm,
  onCancel,
  isPending,
}: {
  scenario: ScenarioDto;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-900/30 p-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Senaryoyu Sil</h2>
        </div>
        <p className="mb-1 text-sm text-zinc-300">
          <span className="font-medium text-zinc-100">{scenario.name}</span> senaryosu kalıcı olarak silinecek.
        </p>
        <p className="mb-6 text-xs text-zinc-500">Bu işlem geri alınamaz. Geçmiş test koşumları etkilenmez.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending} className="flex-1">
            İptal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white border-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? "Siliniyor…" : "Evet, Sil"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Version History Panel ─────────────────────────────────────────────────────

function VersionHistoryPanel({
  scenarioId,
  onClose,
}: {
  scenarioId: string;
  onClose: () => void;
}) {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["scenario-versions", scenarioId],
    queryFn: () => api.listScenarioVersions(scenarioId),
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Versiyon Geçmişi</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-5 text-sm text-zinc-500">Yükleniyor…</p>
          ) : versions.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">Versiyon bulunamadı.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {versions.map((v: ScenarioVersionDto) => (
                <div key={v.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-zinc-100">v{v.versionNo}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(v.createdAt).toLocaleDateString("tr-TR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {v.changeNote ? (
                    <p className="text-sm text-zinc-300">{v.changeNote}</p>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Değişiklik notu yok</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">{v.runCount} koşu</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  scenarioId,
  onClose,
}: {
  scenarioId: string;
  onClose: () => void;
}) {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["scenario", scenarioId],
    queryFn: () => api.getScenario(scenarioId),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (detail && !initialized) {
    setName(detail.name);
    setDescription(detail.description ?? "");
    setContent(detail.content ?? "");
    setInitialized(true);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.updateScenario(scenarioId, {
        name,
        description: description || undefined,
        content,
        contentFormat: detail?.contentFormat ?? "yaml",
        changeNote: changeNote || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      qc.invalidateQueries({ queryKey: ["scenario", scenarioId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Hata"),
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-4xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Senaryoyu Düzenle</h2>
            {detail && (
              <p className="text-xs text-zinc-500">
                v{detail.latestVersionNo} · İçerik değişirse yeni versiyon oluşturulur
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !initialized ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            {t("common.loading")}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-0 overflow-hidden">
            {/* Metadata bar */}
            <div className="grid grid-cols-3 gap-4 border-b border-zinc-800 px-6 py-4">
              <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="edit-name">{t("common.name")} *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Senaryo adı"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-note">Değişiklik Notu</Label>
                <Input
                  id="edit-note"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Opsiyonel açıklama"
                />
              </div>
              <div className="col-span-3 flex flex-col gap-1">
                <Label htmlFor="edit-desc">{t("scenarios.new.descLabel")}</Label>
                <Input
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kısa açıklama"
                />
              </div>
            </div>

            {/* Monaco */}
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                language="yaml"
                theme="vs-dark"
                value={content}
                onChange={(v) => setContent(v ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  renderLineHighlight: "line",
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
              {error ? (
                <p className="rounded-md bg-red-950/40 px-3 py-1.5 text-xs text-red-400">{error}</p>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} disabled={isPending}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={() => mutate()} disabled={isPending || !name.trim()}>
                  <Save className="h-4 w-4" />
                  {isPending ? "Kaydediliyor…" : t("scenarios.new.save")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScenarioDto | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => api.listScenarios(),
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScenario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      setDeleteTarget(null);
    },
  });

  return (
    <>
      {historyId && (
        <VersionHistoryPanel scenarioId={historyId} onClose={() => setHistoryId(null)} />
      )}

      {editId && (
        <EditDrawer scenarioId={editId} onClose={() => setEditId(null)} />
      )}

      {deleteTarget && (
        <DeleteModal
          scenario={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{t("scenarios.title")}</h1>
            <p className="text-sm text-zinc-400">{t("scenarios.subtitle")}</p>
          </div>
          <Link href="/scenarios/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t("dashboard.newScenario")}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("scenarios.allScenarios")}</span>
              <span className="text-xs font-normal text-zinc-500">{scenarios.length} senaryo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-5 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : scenarios.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <FileCode2 className="h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">{t("scenarios.noScenarios")}</p>
                <Link href="/scenarios/new">
                  <Button size="sm" variant="secondary">
                    {t("scenarios.createFirst")}
                  </Button>
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {[
                      t("common.name"),
                      t("scenarios.protocol"),
                      t("common.version"),
                      t("common.created"),
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="px-5 py-3 text-left text-xs font-medium text-zinc-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr
                      key={s.id}
                      className="group border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium text-zinc-200">{s.name}</span>
                        {s.description && (
                          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{s.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge>{s.protocol}</Badge>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {s.latestVersionNo != null ? `v${s.latestVersionNo}` : "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {s.latestVersionId && (
                            <Link href={`/runs/new?versionId=${s.latestVersionId}`}>
                              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors">
                                <Play className="h-3 w-3" />
                                {t("common.run")}
                              </button>
                            </Link>
                          )}
                          <button
                            onClick={() => setHistoryId(s.id)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                          >
                            <History className="h-3 w-3" />
                            Geçmiş
                          </button>
                          <button
                            onClick={() => setEditId(s.id)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Düzenle
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Sil
                          </button>
                        </div>
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

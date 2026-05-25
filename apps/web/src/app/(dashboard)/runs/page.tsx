"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play, X, Trash2, AlertTriangle, RotateCcw,
  ChevronDown, ChevronUp, Hash, Clock, Loader2, Zap,
} from "lucide-react";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TestRunDto, TestRunStatus } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE: TestRunStatus[] = ["Pending", "Queued", "Running", "Stopping"];
const DONE:   TestRunStatus[] = ["Completed", "Failed", "Cancelled"];

function isActive(s: TestRunStatus) { return ACTIVE.includes(s); }
function isDone(s: TestRunStatus)   { return DONE.includes(s); }

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const base = Date.now() - new Date(startedAt).getTime();
    setElapsed(Math.floor(base / 1000));
    ref.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(ref.current);
  }, [startedAt]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="tabular-nums">{m}:{String(s).padStart(2, "0")}</span>;
}

// ── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  run, onConfirm, onCancel, isPending,
}: { run: TestRunDto; onConfirm: () => void; onCancel: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-900/30 p-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Koşumu Sil</h2>
        </div>
        <p className="mb-1 text-sm text-zinc-300">
          <span className="font-medium text-zinc-100">{run.scenarioName}</span> koşumu kalıcı olarak silinecek.
        </p>
        <p className="mb-6 text-xs text-zinc-500">Metrik veriler ve raporlar da silinir. Bu işlem geri alınamaz.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending} className="flex-1">İptal</Button>
          <Button onClick={onConfirm} disabled={isPending} className="flex-1 bg-red-700 hover:bg-red-600 text-white border-red-700">
            <Trash2 className="h-4 w-4" />
            {isPending ? "Siliniyor…" : "Evet, Sil"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Force Status Modal ───────────────────────────────────────────────────────

type ForceTarget = "Cancelled" | "Failed" | "Completed";

function ForceModal({
  run, onConfirm, onCancel, isPending,
}: { run: TestRunDto; onConfirm: (t: ForceTarget) => void; onCancel: () => void; isPending: boolean }) {
  const [target, setTarget] = useState<ForceTarget>("Cancelled");

  const options: { value: ForceTarget; label: string; color: string }[] = [
    { value: "Cancelled", label: "İptal Edildi",      color: "text-zinc-400" },
    { value: "Failed",    label: "Başarısız",          color: "text-red-400" },
    { value: "Completed", label: "Tamamlandı",         color: "text-emerald-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-orange-900/50 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-orange-900/30 p-2">
            <Zap className="h-5 w-5 text-orange-400" />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Durumu Zorla Değiştir</h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">{run.scenarioName}</span> — şu an{" "}
          <StatusBadge status={run.status} />
        </p>
        <p className="mb-3 text-xs text-zinc-500">
          Bu işlem, sıkışmış veya beklemede kalan koşumları terminal duruma taşır. Aktif shardlar da durdurulur.
        </p>
        <div className="mb-5 flex flex-col gap-2">
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 px-4 py-3 hover:border-zinc-500">
              <input
                type="radio"
                name="target"
                value={o.value}
                checked={target === o.value}
                onChange={() => setTarget(o.value)}
                className="accent-blue-500"
              />
              <span className={`text-sm font-medium ${o.color}`}>{o.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending} className="flex-1">İptal</Button>
          <Button onClick={() => onConfirm(target)} disabled={isPending} className="flex-1 bg-orange-700 hover:bg-orange-600 text-white border-orange-700">
            <Zap className="h-4 w-4" />
            {isPending ? "Uygulanıyor…" : "Uygula"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Status Filter Tabs ───────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "done" | "failed";

function FilterTabs({ active, onChange, counts }: {
  active: FilterTab;
  onChange: (t: FilterTab) => void;
  counts: Record<FilterTab, number>;
}) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",    label: "Tümü" },
    { key: "active", label: "Aktif" },
    { key: "done",   label: "Tamamlandı" },
    { key: "failed", label: "Başarısız" },
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === t.key
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {t.label}
          <span className={`rounded-full px-1.5 py-0.5 text-xs ${
            active === t.key ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-500"
          }`}>
            {counts[t.key]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RunsPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [tab, setTab] = useState<FilterTab>("all");
  const [deleteTarget, setDeleteTarget] = useState<TestRunDto | null>(null);
  const [forceTarget, setForceTarget]   = useState<TestRunDto | null>(null);
  const [expandedFail, setExpandedFail] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: () => api.listRuns(),
    refetchInterval: 5_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRun(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["runs"] }); setDeleteTarget(null); },
  });

  const forceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ForceTarget }) => api.forceStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["runs"] }); setForceTarget(null); },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => api.bulkDeleteRuns(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const sorted = [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const counts: Record<FilterTab, number> = {
    all:    sorted.length,
    active: sorted.filter((r) => isActive(r.status)).length,
    done:   sorted.filter((r) => r.status === "Completed").length,
    failed: sorted.filter((r) => r.status === "Failed").length,
  };

  const filtered = sorted.filter((r) => {
    if (tab === "active") return isActive(r.status);
    if (tab === "done")   return r.status === "Completed";
    if (tab === "failed") return r.status === "Failed";
    return true;
  });

  const doneCount = sorted.filter((r) => isDone(r.status)).length;

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          run={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
      {forceTarget && (
        <ForceModal
          run={forceTarget}
          onConfirm={(s) => forceMutation.mutate({ id: forceTarget.id, status: s })}
          onCancel={() => setForceTarget(null)}
          isPending={forceMutation.isPending}
        />
      )}

      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{t("runs.title")}</h1>
            <p className="text-sm text-zinc-400">{t("runs.subtitle")}</p>
          </div>
          {doneCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkDeleteMutation.mutate()}
              disabled={bulkDeleteMutation.isPending}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {bulkDeleteMutation.isPending ? "Siliniyor…" : `Tümünü Temizle (${doneCount})`}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <FilterTabs active={tab} onChange={setTab} counts={counts} />
              {counts.active > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-blue-800 bg-blue-950/50 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {counts.active} aktif
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-5 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <Play className="h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">{t("runs.noRuns")}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {[
                      t("dashboard.scenario"),
                      t("common.status"),
                      t("dashboard.vus"),
                      t("runs.rps"),
                      t("dashboard.p95"),
                      t("runs.errPct"),
                      t("runs.started"),
                      "",
                    ].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((run) => (
                    <RunRow
                      key={run.id}
                      run={run}
                      expanded={expandedFail === run.id}
                      onToggleExpand={() => setExpandedFail(expandedFail === run.id ? null : run.id)}
                      onCancel={() => cancelMutation.mutate(run.id)}
                      onForce={() => setForceTarget(run)}
                      onRetry={() => retryMutation.mutate(run.id)}
                      onDelete={() => setDeleteTarget(run)}
                      viewLabel={t("common.view")}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Status açıklamaları */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">Durum Açıklamaları & Aksiyonlar</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-zinc-500 lg:grid-cols-4">
            <span><span className="font-medium text-yellow-400">Bekliyor</span> — Kuyruklanmayı bekliyor. İptal edilebilir.</span>
            <span><span className="font-medium text-yellow-400">Kuyrukta</span> — İşçilere dağıtıldı. İptal veya zorla durdurulabilir.</span>
            <span><span className="font-medium text-blue-400">Çalışıyor</span> — Aktif test. İptal veya zorla tamamlanabilir.</span>
            <span><span className="font-medium text-orange-400">Durduruluyor</span> — İptal sinyali gönderildi. Zorla kapatılabilir.</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Run Row ──────────────────────────────────────────────────────────────────

function RunRow({
  run, expanded, onToggleExpand,
  onCancel, onForce, onRetry, onDelete,
  viewLabel,
}: {
  run: TestRunDto;
  expanded: boolean;
  onToggleExpand: () => void;
  onCancel: () => void;
  onForce: () => void;
  onRetry: () => void;
  onDelete: () => void;
  viewLabel: string;
}) {
  const status = run.status;
  const active = isActive(status);
  const done   = isDone(status);
  const canCancel     = status === "Pending" || status === "Queued" || status === "Running";
  const canForce      = status === "Queued" || status === "Running" || status === "Stopping";
  const canRetry      = done;
  const canDelete     = done;
  const hasFailReason = status === "Failed" && !!run.failReason;

  return (
    <>
      <tr className={`group border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/20 ${active ? "bg-blue-950/10" : ""}`}>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            {run.queuePosition != null && (
              <span className="flex items-center gap-0.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
                <Hash className="h-2.5 w-2.5" />{run.queuePosition}
              </span>
            )}
            <span className="font-medium text-zinc-200">{run.scenarioName}</span>
            <span className="text-xs text-zinc-600">v{run.versionNo}</span>
          </div>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={status} />
            {status === "Running" && run.startedAt && (
              <span className="flex items-center gap-0.5 text-xs text-blue-400">
                <Clock className="h-3 w-3" />
                <ElapsedTimer startedAt={run.startedAt} />
              </span>
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-zinc-400">{run.virtualUsers}</td>
        <td className="px-5 py-3 text-zinc-400">
          {run.summaryRps != null ? run.summaryRps.toFixed(1) : "—"}
        </td>
        <td className="px-5 py-3 text-zinc-400">
          {run.summaryP95Ms != null ? `${run.summaryP95Ms}ms` : "—"}
        </td>
        <td className={`px-5 py-3 ${run.summaryErrorRate != null && run.summaryErrorRate > 0.01 ? "text-red-400" : "text-zinc-400"}`}>
          {run.summaryErrorRate != null ? `${(run.summaryErrorRate * 100).toFixed(1)}%` : "—"}
        </td>
        <td className="px-5 py-3 text-zinc-400">
          {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Link href={`/runs/${run.id}`} className="rounded-md px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors">
              {viewLabel}
            </Link>

            {canCancel && (
              <button onClick={onCancel} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-orange-400 hover:bg-orange-900/20 hover:text-orange-300 transition-colors">
                <X className="h-3 w-3" />İptal
              </button>
            )}

            {canForce && (
              <button onClick={onForce} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300 transition-colors">
                <Zap className="h-3 w-3" />Zorla
              </button>
            )}

            {canRetry && (
              <button onClick={onRetry} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
                <RotateCcw className="h-3 w-3" />Tekrar
              </button>
            )}

            {hasFailReason && (
              <button onClick={onToggleExpand} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors">
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Neden
              </button>
            )}

            {canDelete && (
              <button onClick={onDelete} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors">
                <Trash2 className="h-3 w-3" />Sil
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && hasFailReason && (
        <tr className="border-b border-zinc-800/50 bg-red-950/10">
          <td colSpan={8} className="px-5 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{run.failReason}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

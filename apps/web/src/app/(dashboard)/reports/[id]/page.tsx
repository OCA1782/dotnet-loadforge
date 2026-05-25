"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, ReferenceDot,
} from "recharts";
import {
  CheckCircle, XCircle, Clock, Users, Gauge, Activity,
  AlertTriangle, ChevronLeft, TrendingUp, Bookmark,
  MessageSquare, Trash2, Send, Zap, BookmarkCheck,
} from "lucide-react";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeHealthScore, healthColor, healthBg, healthLabel } from "@/lib/healthScore";
import type { MetricSnapshotDto, RunNoteDto, TestRunDto } from "@/types";

// ── Chart helpers ─────────────────────────────────────────────────────────────

const tooltipStyle = { contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 } };
const axisStyle = { fill: "#71717a", fontSize: 11 };
const gridStyle = { strokeDasharray: "3 3", stroke: "#27272a" };

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

function detectAnomalies(snapshots: MetricSnapshotDto[]) {
  if (snapshots.length < 5) return new Set<number>();
  const rpsMean = snapshots.reduce((s, m) => s + m.rps, 0) / snapshots.length;
  const rpsStd  = Math.sqrt(snapshots.reduce((s, m) => s + (m.rps - rpsMean) ** 2, 0) / snapshots.length);
  const errMean = snapshots.reduce((s, m) => s + m.errorRate, 0) / snapshots.length;
  const errStd  = Math.sqrt(snapshots.reduce((s, m) => s + (m.errorRate - errMean) ** 2, 0) / snapshots.length);

  const anomalies = new Set<number>();
  snapshots.forEach((m, i) => {
    if (Math.abs(m.rps - rpsMean) > 2.5 * rpsStd && rpsStd > 1) anomalies.add(i);
    if (m.errorRate > errMean + 2.5 * errStd && errStd > 0.001)  anomalies.add(i);
  });
  return anomalies;
}

function formatChartData(snapshots: MetricSnapshotDto[], anomalies: Set<number>) {
  return snapshots.map((s, i) => ({
    time: fmtTime(s.timestamp),
    rps: Number(s.rps.toFixed(1)),
    activeVu: s.activeVu,
    p50: s.p50Ms, p90: s.p90Ms, p95: s.p95Ms, p99: s.p99Ms,
    errorPct: Number((s.errorRate * 100).toFixed(2)),
    anomaly: anomalies.has(i) ? s.rps : undefined,
  }));
}

// ── Health Score Badge ────────────────────────────────────────────────────────

function HealthScoreBadge({ run, large }: { run: TestRunDto; large?: boolean }) {
  const score = computeHealthScore(run);
  if (score == null) return null;
  const color = healthColor(score);
  const bg    = healthBg(score);
  const label = healthLabel(score);

  if (large) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border p-5 ${bg}`}>
        <span className={`text-5xl font-black tabular-nums ${color}`}>{score}</span>
        <span className="mt-1 text-xs text-zinc-400">/ 100</span>
        <span className={`mt-2 text-sm font-semibold ${color}`}>{label}</span>
        <span className="mt-0.5 text-xs text-zinc-500">Sağlık Skoru</span>
      </div>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${bg} ${color}`}>
      {score}
      <span className="font-normal text-zinc-500">/ 100</span>
    </span>
  );
}

// ── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({ icon: Icon, label, value, sub, danger = false, accent = false }: {
  icon: React.ElementType; label: string; value: string; sub?: string; danger?: boolean; accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 rounded-md p-2 ${danger ? "bg-red-900/30" : accent ? "bg-blue-900/30" : "bg-zinc-800"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-red-400" : accent ? "text-blue-400" : "text-zinc-400"}`} />
        </div>
        <div>
          <p className={`text-xl font-bold leading-none ${danger ? "text-red-400" : "text-zinc-100"}`}>{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{label}</p>
          {sub && <p className="text-xs text-zinc-600">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(label: string, value: unknown) {
  return (
    <div key={label} className="flex justify-between gap-6 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{String(value ?? "—")}</span>
    </div>
  );
}

// ── Quality Gate ──────────────────────────────────────────────────────────────

function QualityGateSection({ run }: { run: TestRunDto }) {
  type Gate = { label: string; threshold: number; actual: number | null; unit: string };
  const gates: Gate[] = [];
  if (run.maxP95Ms != null)     gates.push({ label: "P95 Latans",  threshold: run.maxP95Ms,            actual: run.summaryP95Ms,  unit: "ms" });
  if (run.maxP99Ms != null)     gates.push({ label: "P99 Latans",  threshold: run.maxP99Ms,            actual: run.summaryP99Ms,  unit: "ms" });
  if (run.maxErrorRate != null) gates.push({ label: "Hata Oranı", threshold: run.maxErrorRate * 100,  actual: run.summaryErrorRate != null ? run.summaryErrorRate * 100 : null, unit: "%" });
  if (gates.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-400" />Kalite Kapısı Karşılaştırması</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800">
            <th className="py-2 text-left text-xs font-medium text-zinc-500">Metrik</th>
            <th className="py-2 text-right text-xs font-medium text-zinc-500">Eşik</th>
            <th className="py-2 text-right text-xs font-medium text-zinc-500">Gerçek</th>
            <th className="py-2 px-4 text-left text-xs font-medium text-zinc-500">Kullanım</th>
            <th className="py-2 text-center text-xs font-medium text-zinc-500">Sonuç</th>
          </tr></thead>
          <tbody>
            {gates.map((g) => {
              const ratio  = g.actual != null ? g.actual / g.threshold : null;
              const pct    = ratio != null ? ratio * 100 : null;
              const passed = g.actual != null ? g.actual <= g.threshold : null;
              return (
                <tr key={g.label} className="border-b border-zinc-800/50">
                  <td className="py-3 font-medium text-zinc-300">{g.label}</td>
                  <td className="py-3 text-right text-zinc-400">≤ {g.threshold.toFixed(g.unit === "%" ? 1 : 0)}{g.unit}</td>
                  <td className={`py-3 text-right font-semibold ${passed === false ? "text-red-400" : passed ? "text-emerald-400" : "text-zinc-400"}`}>
                    {g.actual != null ? `${g.actual.toFixed(g.unit === "%" ? 2 : 0)}${g.unit}` : "—"}
                  </td>
                  <td className="py-3 px-4">
                    {pct != null && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800">
                          <div className={`h-full rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500">{pct.toFixed(0)}%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {passed === true  && <CheckCircle className="mx-auto h-4 w-4 text-emerald-400" />}
                    {passed === false && <XCircle     className="mx-auto h-4 w-4 text-red-400" />}
                    {passed === null  && <span className="text-xs text-zinc-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Smart Insights ────────────────────────────────────────────────────────────

function InsightsPanel({ run, metrics, baseline }: {
  run: TestRunDto; metrics: MetricSnapshotDto[]; baseline: TestRunDto | null;
}) {
  const insights: { icon: React.ElementType; color: string; text: string }[] = [];

  const lastMetric = metrics[metrics.length - 1];
  const total = lastMetric?.totalRequests ?? 0;
  const errors = lastMetric?.totalErrors ?? 0;

  if (total > 0) {
    const successPct = ((total - errors) / total * 100).toFixed(1);
    insights.push({ icon: CheckCircle, color: "text-emerald-400", text: `${total.toLocaleString()} istek tamamlandı, başarı oranı %${successPct}.` });
  }

  // Anomaly detection
  if (metrics.length >= 5) {
    const errRates = metrics.map(m => m.errorRate);
    const errMean  = errRates.reduce((a, b) => a + b, 0) / errRates.length;
    const maxErr   = Math.max(...errRates);
    if (maxErr > errMean * 3 && maxErr > 0.01) {
      const spikeTime = fmtTime(metrics[errRates.indexOf(maxErr)].timestamp);
      insights.push({ icon: AlertTriangle, color: "text-red-400", text: `Saat ${spikeTime}'de hata oranı ani spike yaptı (${(maxErr * 100).toFixed(1)}%). Muhtemel arka uç baskısı.` });
    }

    const rpsValues = metrics.map(m => m.rps);
    const rpsMax = Math.max(...rpsValues);
    const rpsEnd = rpsValues[rpsValues.length - 1];
    if (rpsEnd < rpsMax * 0.7) {
      insights.push({ icon: TrendingUp, color: "text-orange-400", text: `RPS test sonuna doğru düştü (tepe: ${rpsMax.toFixed(1)} → son: ${rpsEnd.toFixed(1)}). Sistem yorgunluğuna işaret edebilir.` });
    }

    // Latency trend
    const p95Values = metrics.map(m => m.p95Ms).filter(v => v > 0);
    if (p95Values.length >= 4) {
      const firstHalf = p95Values.slice(0, Math.floor(p95Values.length / 2));
      const secondHalf = p95Values.slice(Math.floor(p95Values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg * 1.3) {
        insights.push({ icon: Clock, color: "text-orange-400", text: `P95 latansı test süresince %${((secondAvg / firstAvg - 1) * 100).toFixed(0)} arttı. Sürükleme (latency drift) gözlemlendi.` });
      } else if (secondAvg < firstAvg * 0.85) {
        insights.push({ icon: Clock, color: "text-emerald-400", text: `Sistem ısındıkça P95 latansı iyileşti (%${((1 - secondAvg / firstAvg) * 100).toFixed(0)} düşüş). Olumlu işaret.` });
      }
    }
  }

  // Ramp-up insight
  if (run.rampUpSeconds > 0) {
    insights.push({ icon: Users, color: "text-blue-400", text: `${run.rampUpSeconds}s ramp-up ile ${run.virtualUsers} sanal kullanıcıya ulaşıldı.` });
  }

  // Baseline comparison
  if (baseline && baseline.id !== run.id) {
    if (baseline.summaryRps != null && run.summaryRps != null) {
      const delta = ((run.summaryRps - baseline.summaryRps) / baseline.summaryRps * 100);
      const good  = delta >= 0;
      insights.push({
        icon: Gauge,
        color: good ? "text-emerald-400" : "text-red-400",
        text: `Temel çizgiye kıyasla RPS ${good ? "+" : ""}${delta.toFixed(1)}% (${baseline.summaryRps.toFixed(1)} → ${run.summaryRps.toFixed(1)}).`,
      });
    }
    if (baseline.summaryP95Ms != null && run.summaryP95Ms != null) {
      const delta = ((run.summaryP95Ms - baseline.summaryP95Ms) / baseline.summaryP95Ms * 100);
      const good  = delta <= 0;
      insights.push({
        icon: Clock,
        color: good ? "text-emerald-400" : "text-orange-400",
        text: `P95 latansı temel çizgiye göre ${good ? "" : "+"}${delta.toFixed(1)}% (${baseline.summaryP95Ms}ms → ${run.summaryP95Ms}ms).`,
      });
    }
  }

  // Quality gate insights
  if (run.passed === true)  insights.push({ icon: CheckCircle, color: "text-emerald-400", text: "Tüm kalite kapısı eşikleri geçildi." });
  if (run.passed === false) insights.push({ icon: XCircle,     color: "text-red-400",     text: `Kalite kapısı başarısız: ${run.failReason ?? "bilinmeyen sebep"}.` });

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" />Akıllı İçgörüler</CardTitle></CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <ins.icon className={`mt-0.5 h-4 w-4 shrink-0 ${ins.color}`} />
              <span className="text-sm text-zinc-300">{ins.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Run Notes ─────────────────────────────────────────────────────────────────

function RunNotesPanel({ runId }: { runId: string }) {
  const token = useAuthStore((s) => s.token);
  const api   = createApi(token);
  const qc    = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["run-notes", runId],
    queryFn: () => api.listNotes(runId),
  });

  const addMutation = useMutation({
    mutationFn: () => api.addNote(runId, draft),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["run-notes", runId] }); setDraft(""); },
  });

  const delMutation = useMutation({
    mutationFn: (noteId: string) => api.deleteNote(runId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["run-notes", runId] }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-400" />Koşum Notları <span className="text-xs font-normal text-zinc-500">({notes.length})</span></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notes.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {(notes as RunNoteDto[]).map((n) => (
              <li key={n.id} className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                  {n.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-300">{n.authorName}</span>
                    <span className="text-xs text-zinc-600">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400 whitespace-pre-wrap">{n.content}</p>
                </div>
                <button
                  onClick={() => delMutation.mutate(n.id)}
                  className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">Henüz not yok. Koşum hakkında gözlemlerinizi ekleyin.</p>
        )}

        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) addMutation.mutate(); }}
            placeholder="Not ekle… (Ctrl+Enter ile gönder)"
            rows={2}
            className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={!draft.trim() || addMutation.isPending}
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Trend section ─────────────────────────────────────────────────────────────

function TrendSection({ currentRunId, scenarioId, scenarioName }: {
  currentRunId: string; scenarioId: string; scenarioName: string;
}) {
  const token = useAuthStore((s) => s.token);
  const api   = createApi(token);

  const { data: runs = [] } = useQuery({
    queryKey: ["runs-by-scenario", scenarioId],
    queryFn: () => api.listRunsByScenario(scenarioId),
  });

  const trend = useMemo(() =>
    [...runs]
      .filter((r) => r.status === "Completed" && r.summaryRps != null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-10)
      .map((r, i) => ({
        label: `#${i + 1}`,
        rps: r.summaryRps!,
        p95: r.summaryP95Ms ?? 0,
        score: computeHealthScore(r) ?? 0,
        isCurrent: r.id === currentRunId,
        isBaseline: r.isBaseline,
      })),
    [runs, currentRunId]
  );

  if (trend.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          Senaryo Trendi — {scenarioName}
          <span className="text-xs font-normal text-zinc-500">Son {trend.length} koşum</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs text-zinc-500">RPS</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="rps" name="RPS" radius={[3, 3, 0, 0]}>
                  {trend.map((e, i) => <Cell key={i} fill={e.isBaseline ? "#f59e0b" : e.isCurrent ? "#3b82f6" : "#3f3f46"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="mb-2 text-xs text-zinc-500">P95 (ms)</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="p95" name="P95 ms" radius={[3, 3, 0, 0]}>
                  {trend.map((e, i) => <Cell key={i} fill={e.isBaseline ? "#f59e0b" : e.isCurrent ? "#f97316" : "#3f3f46"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="mb-2 text-xs text-zinc-500">Sağlık Skoru</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="score" name="Skor" radius={[3, 3, 0, 0]}>
                  {trend.map((e, i) => (
                    <Cell key={i} fill={e.isBaseline ? "#f59e0b" : e.isCurrent ? "#a78bfa" :
                      e.score >= 85 ? "#22c55e" : e.score >= 65 ? "#eab308" : e.score >= 40 ? "#f97316" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Bu koşum</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Temel çizgi</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-500" />Diğer</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const token  = useAuthStore((s) => s.token);
  const api    = createApi(token);
  const qc     = useQueryClient();
  const t      = useT();

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["run", id],
    queryFn: () => api.getRun(id),
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["run-metrics", id],
    queryFn: () => api.getRunMetrics(id),
    enabled: !!run,
  });

  // Senaryo bazlı temel çizgiyi bul
  const { data: scenarioRuns = [] } = useQuery({
    queryKey: ["runs-by-scenario", run?.scenarioId],
    queryFn: () => api.listRunsByScenario(run!.scenarioId),
    enabled: !!run?.scenarioId,
  });

  const baseline = useMemo(() =>
    (scenarioRuns as TestRunDto[]).find((r) => r.isBaseline && r.id !== id) ?? null,
    [scenarioRuns, id]
  );

  const baselineMutation = useMutation({
    mutationFn: () => api.setBaseline(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["run", id] });
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["runs-by-scenario", run?.scenarioId] });
    },
  });

  const anomalies = useMemo(() => detectAnomalies(metrics), [metrics]);
  const chartData = useMemo(() => formatChartData(metrics, anomalies), [metrics, anomalies]);

  const lastMetric = metrics[metrics.length - 1];
  const totalRequests = lastMetric?.totalRequests ?? null;
  const totalErrors   = lastMetric?.totalErrors   ?? null;
  const successRate   = totalRequests != null && totalRequests > 0
    ? ((totalRequests - (totalErrors ?? 0)) / totalRequests * 100)
    : null;

  const rampUpEndTime = useMemo(() => {
    if (!run?.startedAt || !run.rampUpSeconds || chartData.length === 0) return null;
    const rampEnd = new Date(run.startedAt).getTime() + run.rampUpSeconds * 1000;
    const idx = metrics.findIndex((m) => new Date(m.timestamp).getTime() >= rampEnd);
    return idx >= 0 ? chartData[idx]?.time : null;
  }, [run, metrics, chartData]);

  if (runLoading || !run) {
    return <div className="flex items-center justify-center p-16 text-sm text-zinc-500">{t("run.loading")}</div>;
  }

  const wallSeconds = run.startedAt && run.completedAt
    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null;

  const score = computeHealthScore(run);
  const anomalyCount = anomalies.size;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb + başlık */}
      <div className="flex flex-col gap-2">
        <Link href="/reports" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="h-3 w-3" />{t("report.breadcrumb")}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-100">{run.scenarioName}</h1>
              <StatusBadge status={run.status} />
              {run.isBaseline && (
                <span className="flex items-center gap-1 rounded-full border border-yellow-700 bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                  <BookmarkCheck className="h-3 w-3" />Temel Çizgi
                </span>
              )}
              {anomalyCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-red-800 bg-red-950/40 px-2.5 py-0.5 text-xs font-medium text-red-400">
                  <AlertTriangle className="h-3 w-3" />{anomalyCount} anomali
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              v{run.versionNo} · {run.executionMode} · {run.virtualUsers} VU · {run.durationSeconds}s
              {run.rampUpSeconds > 0 && ` · ${run.rampUpSeconds}s ramp-up`}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => baselineMutation.mutate()}
            disabled={baselineMutation.isPending}
            className={run.isBaseline ? "border-yellow-700 text-yellow-400" : ""}
          >
            {run.isBaseline ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {run.isBaseline ? "Temel Çizgiyi Kaldır" : "Temel Çizgi Yap"}
          </Button>
        </div>
      </div>

      {/* Quality gate banner */}
      {run.passed !== null && (
        <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${run.passed ? "border-emerald-800 bg-emerald-950/30 text-emerald-400" : "border-red-800 bg-red-950/30 text-red-400"}`}>
          {run.passed ? <CheckCircle className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
          <div>
            <p className="font-semibold">{run.passed ? t("run.qualityPassed") : t("run.qualityFailed")}</p>
            {!run.passed && run.failReason && <p className="mt-0.5 text-sm opacity-80">{run.failReason}</p>}
          </div>
        </div>
      )}

      {/* Ana metric grid + sağlık skoru */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {score != null && (
          <div className="col-span-2 lg:col-span-1">
            <HealthScoreBadge run={run} large />
          </div>
        )}
        <div className={`col-span-2 grid grid-cols-2 gap-4 ${score != null ? "lg:col-span-4 lg:grid-cols-4" : "lg:col-span-5 lg:grid-cols-4"}`}>
          <MetricTile icon={Gauge}         label={t("run.avgRps")}     value={run.summaryRps     != null ? run.summaryRps.toFixed(1)           : "—"} accent />
          <MetricTile icon={Clock}         label={t("run.p95Latency")} value={run.summaryP95Ms   != null ? `${run.summaryP95Ms} ms`             : "—"}
            sub={run.summaryP99Ms != null ? `P99: ${run.summaryP99Ms} ms` : undefined} />
          <MetricTile icon={Users}         label={t("run.virtualUsers")} value={String(run.virtualUsers)}
            sub={`${run.rampUpSeconds}s ${t("run.rampUp").toLowerCase()}`} />
          <MetricTile icon={AlertTriangle} label={t("run.errorRate")}  value={run.summaryErrorRate != null ? `${(run.summaryErrorRate * 100).toFixed(2)}%` : "—"}
            danger={run.summaryErrorRate != null && run.summaryErrorRate > 0.01} />
        </div>
      </div>

      {/* Toplam istek istatistikleri */}
      {totalRequests != null && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-5 w-5 text-zinc-400" />
            <div><p className="text-xl font-bold text-zinc-100">{totalRequests.toLocaleString()}</p><p className="text-xs text-zinc-500">Toplam İstek</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-red-400" />
            <div><p className="text-xl font-bold text-red-400">{(totalErrors ?? 0).toLocaleString()}</p><p className="text-xs text-zinc-500">Toplam Hata</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div><p className="text-xl font-bold text-emerald-400">{successRate != null ? `${successRate.toFixed(1)}%` : "—"}</p><p className="text-xs text-zinc-500">Başarı Oranı</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Akıllı içgörüler */}
      <InsightsPanel run={run} metrics={metrics} baseline={baseline} />

      {/* Quality gate karşılaştırma */}
      <QualityGateSection run={run} />

      {/* Grafikler */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("run.rpsChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rpsG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                  <YAxis tick={axisStyle} />
                  <Tooltip {...tooltipStyle} />
                  {rampUpEndTime && <ReferenceLine x={rampUpEndTime} stroke="#71717a" strokeDasharray="4 2" label={{ value: "Ramp-up↑", fill: "#71717a", fontSize: 9, position: "insideTopRight" }} />}
                  <Area type="monotone" dataKey="rps" stroke="#3b82f6" fill="url(#rpsG)" strokeWidth={2} name="RPS" dot={false} />
                  {chartData.filter(d => d.anomaly != null).map((d, i) => (
                    <ReferenceDot key={i} x={d.time} y={d.anomaly!} r={5} fill="#ef4444" stroke="#ef4444" />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("run.latencyChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                  <YAxis tick={axisStyle} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {run.maxP95Ms && <ReferenceLine y={run.maxP95Ms} stroke="#f97316" strokeDasharray="4 2" label={{ value: `Max P95: ${run.maxP95Ms}ms`, fill: "#f97316", fontSize: 9 }} />}
                  <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={1.5} dot={false} name="P50" />
                  <Line type="monotone" dataKey="p90" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="P90" />
                  <Line type="monotone" dataKey="p95" stroke="#f97316" strokeWidth={2}   dot={false} name="P95" />
                  <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2}   dot={false} name="P99" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("run.vuChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="vuG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                  <YAxis tick={axisStyle} />
                  <Tooltip {...tooltipStyle} />
                  {rampUpEndTime && <ReferenceLine x={rampUpEndTime} stroke="#71717a" strokeDasharray="4 2" />}
                  <Area type="monotone" dataKey="activeVu" stroke="#a78bfa" fill="url(#vuG)" strokeWidth={2} name="Active VUs" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("run.errChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="errG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                  <YAxis tick={axisStyle} tickFormatter={(v) => `${v}%`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, t("run.errorRate")]} />
                  {run.maxErrorRate && <ReferenceLine y={run.maxErrorRate * 100} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Eşik: ${(run.maxErrorRate * 100).toFixed(1)}%`, fill: "#ef4444", fontSize: 9 }} />}
                  <Area type="monotone" dataKey="errorPct" stroke="#ef4444" fill="url(#errG)" strokeWidth={2} name="Error %" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card><CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-zinc-500">
          <Activity className="h-4 w-4" />{t("report.noMetrics")}
        </CardContent></Card>
      )}

      {/* Senaryo trendi */}
      <TrendSection currentRunId={id} scenarioId={run.scenarioId} scenarioName={run.scenarioName} />

      {/* Koşum notları */}
      <RunNotesPanel runId={id} />

      {/* Koşum detayları */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("run.config")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {fmt(t("run.scenario"),   run.scenarioName)}
            {fmt(t("run.version"),    `v${run.versionNo}`)}
            {fmt(t("run.vus"),        run.virtualUsers)}
            {fmt(t("run.dur"),        `${run.durationSeconds}s`)}
            {fmt(t("run.rampUp"),     `${run.rampUpSeconds}s`)}
            {fmt(t("run.targetRps"),  run.targetRps ?? "—")}
            {fmt(t("run.execMode"),   run.executionMode)}
            {run.maxP95Ms     && fmt("Max P95 Eşiği",  `${run.maxP95Ms}ms`)}
            {run.maxP99Ms     && fmt("Max P99 Eşiği",  `${run.maxP99Ms}ms`)}
            {run.maxErrorRate && fmt("Max Hata Eşiği", `${(run.maxErrorRate * 100).toFixed(1)}%`)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("run.timeline")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {fmt(t("run.createdAt"),   new Date(run.createdAt).toLocaleString())}
            {fmt(t("run.startedAt"),   run.startedAt   ? new Date(run.startedAt).toLocaleString()   : "—")}
            {fmt(t("run.completedAt"), run.completedAt ? new Date(run.completedAt).toLocaleString() : "—")}
            {wallSeconds != null && fmt(t("run.wallDuration"), `${wallSeconds}s`)}
            {fmt(t("run.metricsCount"), metrics.length > 0 ? `${metrics.length} ${t("report.snapshots")}` : "—")}
            {totalRequests != null && fmt("Toplam İstek", totalRequests.toLocaleString())}
            {totalErrors   != null && fmt("Toplam Hata",  totalErrors.toLocaleString())}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

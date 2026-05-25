"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Clock, Plus, Activity,
  Gauge, Users, AlertTriangle, RefreshCw, Radio,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeHealthScore, healthColor } from "@/lib/healthScore";
import type { MetricSnapshotDto, TestRunDto } from "@/types";

const LIVE_INTERVAL = 4_000;
const IDLE_INTERVAL = 15_000;

const gridStyle = { strokeDasharray: "3 3", stroke: "#27272a" };
const axisStyle = { fill: "#71717a", fontSize: 10 };
const tooltipStyle = {
  contentStyle: {
    background: "#18181b", border: "1px solid #3f3f46",
    borderRadius: 6, fontSize: 11,
  },
};

// ── Live Pulse Dot ───────────────────────────────────────────────────────────

function PulseDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-400" />
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, pulse,
}: {
  label: string; value: number; icon: React.ElementType; color: string; pulse?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-zinc-100">{value}</p>
            <PulseDot active={!!pulse && value > 0} />
          </div>
          <p className="text-xs text-zinc-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Live Mini Chart for active run ──────────────────────────────────────────

function LiveMiniChart({ runId }: { runId: string }) {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);

  const { data: metrics = [] } = useQuery({
    queryKey: ["run-metrics-mini", runId],
    queryFn: () => api.getRunMetrics(runId),
    refetchInterval: LIVE_INTERVAL,
  });

  const chartData = metrics.slice(-30).map((m: MetricSnapshotDto) => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    rps: Number(m.rps.toFixed(1)),
    p95: m.p95Ms,
    err: Number((m.errorRate * 100).toFixed(1)),
    vu: m.activeVu,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-zinc-600">
        Veri bekleniyor…
      </div>
    );
  }

  const lastRps = chartData[chartData.length - 1]?.rps ?? 0;
  const lastP95 = chartData[chartData.length - 1]?.p95 ?? 0;
  const lastErr = chartData[chartData.length - 1]?.err ?? 0;
  const lastVu  = chartData[chartData.length - 1]?.vu ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-6 px-1 text-xs">
        <span className="text-zinc-400">RPS <span className="font-semibold text-blue-400">{lastRps}</span></span>
        <span className="text-zinc-400">P95 <span className="font-semibold text-orange-400">{lastP95}ms</span></span>
        <span className="text-zinc-400">VU <span className="font-semibold text-violet-400">{lastVu}</span></span>
        <span className={`text-zinc-400`}>
          Hata <span className={`font-semibold ${lastErr > 1 ? "text-red-400" : "text-emerald-400"}`}>{lastErr}%</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={chartData} margin={{ top: 0, right: 4, left: -32, bottom: 0 }}>
          <defs>
            <linearGradient id={`rpsG-${runId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey="time" tick={false} />
          <YAxis tick={axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Area
            type="monotone" dataKey="rps" stroke="#3b82f6"
            fill={`url(#rpsG-${runId})`} strokeWidth={1.5} dot={false} name="RPS"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Active Run Card ──────────────────────────────────────────────────────────

function ActiveRunCard({ run }: { run: TestRunDto }) {
  return (
    <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulseDot active />
          <span className="text-sm font-semibold text-zinc-100">{run.scenarioName}</span>
          <StatusBadge status={run.status} />
        </div>
        <Link href={`/runs/${run.id}`} className="text-xs text-blue-400 hover:text-blue-300">
          Canlı İzle →
        </Link>
      </div>
      <div className="mb-3 flex gap-4 text-xs text-zinc-400">
        <span><Users className="mb-0.5 mr-1 inline h-3 w-3" />{run.virtualUsers} VU</span>
        <span><Clock className="mb-0.5 mr-1 inline h-3 w-3" />{run.durationSeconds}s</span>
        <span>v{run.versionNo}</span>
      </div>
      <LiveMiniChart runId={run.id} />
    </div>
  );
}

// ── Refresh Countdown ────────────────────────────────────────────────────────

function RefreshCountdown({ seconds, onRefresh }: { seconds: number; onRefresh: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setRemaining(seconds);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { onRefresh(); return seconds; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [seconds, onRefresh]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-600">
      <RefreshCw className="h-3 w-3" />
      {remaining}s
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const t = useT();

  const activeRuns = useQuery({
    queryKey: ["runs"],
    queryFn: () => api.listRuns(),
    refetchInterval: LIVE_INTERVAL,
  });

  const runs: TestRunDto[] = activeRuns.data ?? [];
  const active  = runs.filter((r) => r.status === "Running" || r.status === "Queued");
  const passed  = runs.filter((r) => r.passed === true).length;
  const failed  = runs.filter((r) => r.passed === false).length;
  const recent  = [...runs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const hasActive = active.length > 0;
  const pollInterval = hasActive ? LIVE_INTERVAL : IDLE_INTERVAL;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100">{t("dashboard.title")}</h1>
            {hasActive && (
              <span className="flex items-center gap-1.5 rounded-full border border-blue-800 bg-blue-950/50 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                <Radio className="h-3 w-3 animate-pulse" />
                Canlı
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshCountdown
            seconds={pollInterval / 1000}
            onRefresh={() => activeRuns.refetch()}
          />
          <Link href="/scenarios/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t("dashboard.newScenario")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.activeRuns")}
          value={active.length}
          icon={Activity}
          color="bg-blue-900/40 text-blue-400"
          pulse
        />
        <StatCard label={t("dashboard.passed")} value={passed} icon={CheckCircle} color="bg-emerald-900/40 text-emerald-400" />
        <StatCard label={t("dashboard.failed")} value={failed} icon={XCircle} color="bg-red-900/40 text-red-400" />
        <StatCard label={t("dashboard.totalRuns")} value={runs.length} icon={Clock} color="bg-zinc-800 text-zinc-400" />
      </div>

      {/* Active Runs — Live Section */}
      {hasActive && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Activity className="h-4 w-4 text-blue-400" />
            Aktif Koşumlar
            <span className="rounded-full bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-400">
              {active.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {active.map((run) => (
              <ActiveRunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("dashboard.recentRuns")}</span>
            {activeRuns.isFetching && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeRuns.isLoading ? (
            <p className="p-5 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : recent.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">{t("dashboard.noRuns")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {[
                    t("dashboard.scenario"),
                    t("common.status"),
                    t("dashboard.vus"),
                    t("dashboard.duration"),
                    "RPS",
                    t("dashboard.p95"),
                    t("dashboard.errorRate"),
                    "Sağlık",
                    "",
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((run) => (
                  <RunRow key={run.id} run={run} viewLabel={t("common.view")} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RunRow({ run, viewLabel }: { run: TestRunDto; viewLabel: string }) {
  const isLive = run.status === "Running" || run.status === "Queued";

  return (
    <tr className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${isLive ? "bg-blue-950/10" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isLive && <PulseDot active />}
          <span className="font-medium text-zinc-200">{run.scenarioName}</span>
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
      <td className="px-4 py-3 text-zinc-400">{run.virtualUsers}</td>
      <td className="px-4 py-3 text-zinc-400">{run.durationSeconds}s</td>
      <td className="px-4 py-3 text-zinc-400">
        {run.summaryRps != null ? (
          <span className="flex items-center gap-1">
            <Gauge className="h-3 w-3 text-blue-500" />
            {run.summaryRps.toFixed(1)}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-zinc-400">
        {run.summaryP95Ms != null ? `${run.summaryP95Ms}ms` : "—"}
      </td>
      <td className={`px-4 py-3 ${run.summaryErrorRate != null && run.summaryErrorRate > 0.01 ? "text-red-400" : "text-zinc-400"}`}>
        {run.summaryErrorRate != null ? (
          <span className="flex items-center gap-1">
            {run.summaryErrorRate > 0.01 && <AlertTriangle className="h-3 w-3" />}
            {(run.summaryErrorRate * 100).toFixed(1)}%
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3">
        {(() => {
          const score = computeHealthScore(run);
          return score != null ? (
            <span className={`text-sm font-bold ${healthColor(score)}`}>{score}</span>
          ) : <span className="text-zinc-600">—</span>;
        })()}
      </td>
      <td className="px-4 py-3">
        <Link href={`/runs/${run.id}`} className="text-xs text-blue-400 hover:text-blue-300">
          {viewLabel}
        </Link>
      </td>
    </tr>
  );
}

"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, ResponsiveContainer,
} from "recharts";
import { CheckCircle, XCircle, Clock, Users, Gauge } from "lucide-react";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import type { MetricSnapshotDto } from "@/types";

function fmt(label: string, value: unknown) {
  return (
    <div key={label} className="flex justify-between gap-6 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{String(value ?? "—")}</span>
    </div>
  );
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const t = useT();

  const isLive = (status: string) => status === "Running" || status === "Queued";

  const { data: run } = useQuery({
    queryKey: ["run", id],
    queryFn: () => api.getRun(id),
    refetchInterval: (q) => q.state.data && isLive(q.state.data.status) ? 3_000 : false,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["run-metrics", id],
    queryFn: () => api.getRunMetrics(id),
    refetchInterval: run && isLive(run.status) ? 3_000 : false,
    enabled: !!run,
  });

  const chartData = formatChartData(metrics);

  if (!run) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-zinc-500">
        {t("run.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-zinc-100">{run.scenarioName}</h1>
          <p className="text-sm text-zinc-400">
            v{run.versionNo} · {run.executionMode} · {run.virtualUsers} VUs · {run.durationSeconds}s
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {run.passed !== null && (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
          run.passed
            ? "border-emerald-800 bg-emerald-950/30 text-emerald-400"
            : "border-red-800 bg-red-950/30 text-red-400"
        }`}>
          {run.passed ? <CheckCircle className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-medium">
            {run.passed ? t("run.qualityPassed") : `${t("run.qualityFailed")} — ${run.failReason}`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile icon={Gauge} label={t("run.avgRps")}
          value={run.summaryRps != null ? run.summaryRps.toFixed(1) : "—"} />
        <MetricTile icon={Clock} label={t("run.p95Latency")}
          value={run.summaryP95Ms != null ? `${run.summaryP95Ms}ms` : "—"} />
        <MetricTile icon={Clock} label={t("run.p99Latency")}
          value={run.summaryP99Ms != null ? `${run.summaryP99Ms}ms` : "—"} />
        <MetricTile icon={Users} label={t("run.errorRate")}
          value={run.summaryErrorRate != null ? `${(run.summaryErrorRate * 100).toFixed(2)}%` : "—"}
          danger={run.summaryErrorRate != null && run.summaryErrorRate > 0.01} />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>{t("run.rpsChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6 }} />
                  <Area type="monotone" dataKey="rps" stroke="#3b82f6" fill="url(#rpsGrad)" strokeWidth={2} name="RPS" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("run.latencyChart")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={1.5} dot={false} name="P50" />
                  <Line type="monotone" dataKey="p90" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="P90" />
                  <Line type="monotone" dataKey="p95" stroke="#f97316" strokeWidth={2} dot={false} name="P95" />
                  <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="P99" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("run.config")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {fmt(t("run.scenario"), run.scenarioName)}
            {fmt(t("run.version"), `v${run.versionNo}`)}
            {fmt(t("run.vus"), run.virtualUsers)}
            {fmt(t("run.dur"), `${run.durationSeconds}s`)}
            {fmt(t("run.rampUp"), `${run.rampUpSeconds}s`)}
            {fmt(t("run.targetRps"), run.targetRps ?? t("common.noData"))}
            {fmt(t("run.execMode"), run.executionMode)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("run.timeline")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {fmt(t("run.createdAt"), new Date(run.createdAt).toLocaleString())}
            {fmt(t("run.startedAt"), run.startedAt ? new Date(run.startedAt).toLocaleString() : "—")}
            {fmt(t("run.completedAt"), run.completedAt ? new Date(run.completedAt).toLocaleString() : "—")}
            {run.startedAt && run.completedAt && fmt(
              t("run.wallDuration"),
              `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, danger = false }: {
  icon: React.ElementType; label: string; value: string; danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
        <div>
          <p className={`text-lg font-bold ${danger ? "text-red-400" : "text-zinc-100"}`}>{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatChartData(snapshots: MetricSnapshotDto[]) {
  return snapshots.map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    rps: Number(s.rps.toFixed(1)),
    p50: s.p50Ms, p90: s.p90Ms, p95: s.p95Ms, p99: s.p99Ms,
    errorRate: Number((s.errorRate * 100).toFixed(2)),
  }));
}

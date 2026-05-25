"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  CheckCircle, XCircle, TrendingUp, TrendingDown, Minus, GitCompare,
} from "lucide-react";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { computeHealthScore, healthColor, healthLabel } from "@/lib/healthScore";
import type { TestRunDto } from "@/types";

const tooltipStyle = {
  contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 },
};
const gridStyle = { strokeDasharray: "3 3", stroke: "#27272a" };
const axisStyle = { fill: "#71717a", fontSize: 11 };

// ── Delta helpers ─────────────────────────────────────────────────────────────

function delta(a: number | null | undefined, b: number | null | undefined, lowerIsBetter = false) {
  if (a == null || b == null) return null;
  const diff = a - b;
  if (Math.abs(diff) < 0.001) return { value: 0, icon: Minus, color: "text-zinc-400" };
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  return {
    value: diff,
    icon: improved ? TrendingUp : TrendingDown,
    color: improved ? "text-emerald-400" : "text-red-400",
  };
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricPair({
  label,
  a,
  b,
  format,
  lowerIsBetter,
}: {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}) {
  const d = delta(a, b, lowerIsBetter);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="text-center flex-1">
          <p className="text-xs text-blue-400 mb-1">A</p>
          <p className="text-lg font-bold text-zinc-100">{a != null ? format(a) : "—"}</p>
        </div>
        {d && d.value !== 0 && (
          <div className={`flex flex-col items-center text-xs ${d.color}`}>
            <d.icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="text-center flex-1">
          <p className="text-xs text-violet-400 mb-1">B</p>
          <p className="text-lg font-bold text-zinc-100">{b != null ? format(b) : "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ── Run Selector ─────────────────────────────────────────────────────────────

function RunSelector({
  label,
  color,
  runs,
  value,
  onChange,
}: {
  label: string;
  color: string;
  runs: TestRunDto[];
  value: string;
  onChange: (id: string) => void;
}) {
  const completed = runs.filter(
    (r) => r.status === "Completed" || r.status === "Failed"
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm font-medium text-zinc-200">{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      >
        <option value="">— Koşu seçin —</option>
        {completed.map((r) => (
          <option key={r.id} value={r.id}>
            {r.scenarioName} v{r.versionNo} · {new Date(r.createdAt).toLocaleDateString()}
            {r.summaryRps != null ? ` · ${r.summaryRps.toFixed(0)} RPS` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const t = useT();

  const [runAId, setRunAId] = useState("");
  const [runBId, setRunBId] = useState("");

  const { data: allRuns = [] } = useQuery({
    queryKey: ["runs"],
    queryFn: () => api.listRuns(),
  });

  const { data: runA } = useQuery({
    queryKey: ["run", runAId],
    queryFn: () => api.getRun(runAId),
    enabled: !!runAId,
  });

  const { data: runB } = useQuery({
    queryKey: ["run", runBId],
    queryFn: () => api.getRun(runBId),
    enabled: !!runBId,
  });

  const scoreA = runA ? computeHealthScore(runA) : null;
  const scoreB = runB ? computeHealthScore(runB) : null;

  // Radar chart data
  const radarData = (() => {
    if (!runA || !runB) return [];
    const errA = runA.summaryErrorRate != null ? Math.max(0, 100 - runA.summaryErrorRate * 100 * 20) : 0;
    const errB = runB.summaryErrorRate != null ? Math.max(0, 100 - runB.summaryErrorRate * 100 * 20) : 0;
    const p95Map = (p: number | null | undefined) => {
      if (p == null) return 0;
      if (p <= 50) return 100; if (p <= 100) return 90; if (p <= 200) return 75;
      if (p <= 500) return 55; if (p <= 1000) return 35; return 10;
    };
    const rpsScore = (r: TestRunDto) =>
      r.targetRps && r.summaryRps ? Math.min(100, (r.summaryRps / r.targetRps) * 100) : r.summaryRps ? 100 : 50;

    return [
      { metric: "Hata Skoru", A: errA, B: errB },
      { metric: "P95 Skoru", A: p95Map(runA.summaryP95Ms), B: p95Map(runB.summaryP95Ms) },
      { metric: "RPS Skoru", A: rpsScore(runA), B: rpsScore(runB) },
      { metric: "Genel Sağlık", A: scoreA ?? 0, B: scoreB ?? 0 },
    ];
  })();

  // Bar chart for summary comparison
  const barData = (() => {
    if (!runA || !runB) return [];
    return [
      {
        name: "RPS",
        A: runA.summaryRps ?? 0,
        B: runB.summaryRps ?? 0,
      },
      {
        name: "P95 (ms)",
        A: runA.summaryP95Ms ?? 0,
        B: runB.summaryP95Ms ?? 0,
      },
      {
        name: "P99 (ms)",
        A: runA.summaryP99Ms ?? 0,
        B: runB.summaryP99Ms ?? 0,
      },
    ];
  })();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-zinc-100">{t("compare.title")}</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">{t("compare.subtitle")}</p>
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-6 pt-5">
          <RunSelector
            label={t("compare.runA")}
            color="bg-blue-400"
            runs={allRuns}
            value={runAId}
            onChange={setRunAId}
          />
          <RunSelector
            label={t("compare.runB")}
            color="bg-violet-400"
            runs={allRuns}
            value={runBId}
            onChange={setRunBId}
          />
        </CardContent>
      </Card>

      {(!runA || !runB) ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-800 py-16 text-center">
          <GitCompare className="h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">{t("compare.noSelection")}</p>
        </div>
      ) : (
        <>
          {/* Run header cards */}
          <div className="grid grid-cols-2 gap-4">
            {[{ run: runA, score: scoreA, color: "border-blue-800/50 bg-blue-950/10", label: "A" },
              { run: runB, score: scoreB, color: "border-violet-800/50 bg-violet-950/10", label: "B" }]
              .map(({ run, score, color, label }) => (
              <div key={run.id} className={`rounded-xl border p-4 ${color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-500">Koşu {label}</span>
                      <StatusBadge status={run.status} />
                      {run.passed != null && (
                        run.passed
                          ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                          : <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-base font-semibold text-zinc-100">{run.scenarioName}</p>
                    <p className="text-xs text-zinc-500">
                      v{run.versionNo} · {run.virtualUsers} VU · {run.durationSeconds}s
                      · {new Date(run.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {score != null && (
                    <div className="text-right">
                      <p className={`text-3xl font-black ${healthColor(score)}`}>{score}</p>
                      <p className="text-xs text-zinc-500">{healthLabel(score)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Metric comparison */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricPair
              label="RPS"
              a={runA.summaryRps} b={runB.summaryRps}
              format={(v) => v.toFixed(1)}
            />
            <MetricPair
              label="P95 Gecikme"
              a={runA.summaryP95Ms} b={runB.summaryP95Ms}
              format={(v) => `${v}ms`}
              lowerIsBetter
            />
            <MetricPair
              label="P99 Gecikme"
              a={runA.summaryP99Ms} b={runB.summaryP99Ms}
              format={(v) => `${v}ms`}
              lowerIsBetter
            />
            <MetricPair
              label="Hata Oranı"
              a={runA.summaryErrorRate != null ? runA.summaryErrorRate * 100 : null}
              b={runB.summaryErrorRate != null ? runB.summaryErrorRate * 100 : null}
              format={(v) => `${v.toFixed(2)}%`}
              lowerIsBetter
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performans Skoru (Radar)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Radar name="Koşu A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Radar name="Koşu B" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                    <Legend />
                    <Tooltip {...tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metrik Karşılaştırması</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="name" tick={axisStyle} />
                    <YAxis tick={axisStyle} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Bar dataKey="A" name="Koşu A" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="B" name="Koşu B" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Config comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Yapılandırma Karşılaştırması</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Parametre", "Koşu A", "Koşu B"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Senaryo", runA.scenarioName, runB.scenarioName],
                    ["Versiyon", `v${runA.versionNo}`, `v${runB.versionNo}`],
                    ["Sanal Kullanıcı", runA.virtualUsers, runB.virtualUsers],
                    ["Süre", `${runA.durationSeconds}s`, `${runB.durationSeconds}s`],
                    ["Rampa", `${runA.rampUpSeconds}s`, `${runB.rampUpSeconds}s`],
                    ["Hedef RPS", runA.targetRps ?? "—", runB.targetRps ?? "—"],
                    ["Çalıştırma Modu", runA.executionMode, runB.executionMode],
                  ].map(([param, a, b]) => (
                    <tr key={String(param)} className="border-b border-zinc-800/50">
                      <td className="px-4 py-2 text-zinc-500">{param}</td>
                      <td className={`px-4 py-2 ${String(a) !== String(b) ? "text-blue-400 font-medium" : "text-zinc-300"}`}>{a}</td>
                      <td className={`px-4 py-2 ${String(a) !== String(b) ? "text-violet-400 font-medium" : "text-zinc-300"}`}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

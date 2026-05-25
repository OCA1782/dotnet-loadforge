"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { createApi } from "@/lib/api";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3, ArrowRight, CheckCircle, XCircle,
  Gauge, Clock, Search,
} from "lucide-react";
import type { TestRunDto } from "@/types";

// ── Test type definitions ────────────────────────────────────────────────────

type TestTypeId = "smoke" | "load" | "stress" | "spike" | "soak" | "breakpoint";
type TestTypeMeta = {
  id: TestTypeId; color: string; bgColor: string; borderColor: string;
  points: string; vus: string; duration: string; rampUp: string;
};

const TEST_TYPES: TestTypeMeta[] = [
  { id: "smoke",      color: "text-emerald-400", bgColor: "bg-emerald-900/15", borderColor: "border-emerald-800/50", points: "0,80 100,80",                                    vus: "1–5",     duration: "30–60s",   rampUp: "0s"               },
  { id: "load",       color: "text-blue-400",    bgColor: "bg-blue-900/15",    borderColor: "border-blue-800/50",    points: "0,80 25,20 100,20",                               vus: "25–200",  duration: "5–30 min", rampUp: "1–5 min"          },
  { id: "stress",     color: "text-orange-400",  bgColor: "bg-orange-900/15",  borderColor: "border-orange-800/50", points: "0,80 20,65 40,45 60,25 100,25",                   vus: "100–500", duration: "10–30 min",rampUp: "2–5 min (stepped)"},
  { id: "spike",      color: "text-red-400",     bgColor: "bg-red-900/15",     borderColor: "border-red-800/50",    points: "0,75 35,75 45,5 55,75 100,75",                    vus: "500–2000",duration: "2–5 min",  rampUp: "< 10s"            },
  { id: "soak",       color: "text-violet-400",  bgColor: "bg-violet-900/15",  borderColor: "border-violet-800/50", points: "0,80 10,40 100,40",                               vus: "20–100",  duration: "1–24 h",   rampUp: "5 min"            },
  { id: "breakpoint", color: "text-rose-400",    bgColor: "bg-rose-900/15",    borderColor: "border-rose-800/50",   points: "0,80 100,5",                                      vus: "1 → ∞",   duration: "10–60 min",rampUp: "Continuous"       },
];

const STROKE: Record<string, string> = {
  "text-emerald-400": "#34d399", "text-blue-400": "#60a5fa",
  "text-orange-400": "#fb923c", "text-red-400": "#f87171",
  "text-violet-400": "#a78bfa", "text-rose-400": "#fb7185",
};

function VuProfile({ points, color }: { points: string; color: string }) {
  return (
    <svg viewBox="0 0 100 90" className="h-14 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={STROKE[color] ?? "#60a5fa"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TestTypeCard({ meta }: { meta: TestTypeMeta }) {
  const t = useT();
  return (
    <Link href={`/scenarios/new?preset=${meta.id}`}
      className={`flex flex-col rounded-xl border ${meta.borderColor} ${meta.bgColor} p-5 transition-all hover:scale-[1.01] hover:shadow-lg`}>
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-sm font-bold ${meta.color}`}>{t(`preset.${meta.id}`)}</span>
        <span className="text-xs text-zinc-500">{t(`testType.${meta.id}.tagline`)}</span>
      </div>
      <div className="mb-3">
        <VuProfile points={meta.points} color={meta.color} />
        <p className="mt-1 text-center text-[10px] text-zinc-600">{t("reports.vuProfile")}</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">{t(`testType.${meta.id}.desc`)}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-zinc-600">VUs</dt><dd className={`font-medium ${meta.color}`}>{meta.vus}</dd>
        <dt className="text-zinc-600">{t("dashboard.duration")}</dt><dd className={`font-medium ${meta.color}`}>{meta.duration}</dd>
        <dt className="text-zinc-600">{t("run.rampUp")}</dt><dd className={`font-medium ${meta.color}`}>{meta.rampUp}</dd>
        <dt className="text-zinc-600">{t("common.created")}</dt><dd className="col-span-2 text-zinc-500">{t(`testType.${meta.id}.when`)}</dd>
      </dl>
      <div className={`mt-4 flex items-center gap-1 text-xs font-medium ${meta.color}`}>
        {t("reports.usePreset")} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

// ── Summary stats bar ────────────────────────────────────────────────────────

function SummaryBar({ runs }: { runs: TestRunDto[] }) {
  const done = runs.filter((r) => r.status === "Completed" || r.status === "Failed");
  const passed = done.filter((r) => r.passed === true).length;
  const passRate = done.length > 0 ? (passed / done.length) * 100 : null;

  const rpsValues = runs.filter((r) => r.summaryRps != null).map((r) => r.summaryRps!);
  const p95Values = runs.filter((r) => r.summaryP95Ms != null).map((r) => r.summaryP95Ms!);

  const avgRps = rpsValues.length > 0 ? rpsValues.reduce((a, b) => a + b, 0) / rpsValues.length : null;
  const avgP95 = p95Values.length > 0 ? p95Values.reduce((a, b) => a + b, 0) / p95Values.length : null;

  const stats = [
    { icon: BarChart3,   label: "Toplam Koşum",    value: runs.length.toString(),                      color: "text-zinc-300"   },
    { icon: CheckCircle, label: "Geçti / Kaldı",    value: passRate != null ? `${passRate.toFixed(0)}%` : "—", color: passRate != null && passRate >= 80 ? "text-emerald-400" : "text-red-400" },
    { icon: Gauge,       label: "Ort. RPS",          value: avgRps != null ? avgRps.toFixed(1) : "—",   color: "text-blue-400"   },
    { icon: Clock,       label: "Ort. P95",          value: avgP95 != null ? `${Math.round(avgP95)}ms` : "—", color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 p-4">
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const t = useT();

  const [search, setSearch]           = useState("");
  const [scenarioFilter, setScenario] = useState("all");
  const [statusFilter, setStatus]     = useState("all");

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: () => api.listRuns(),
    enabled: !!token,
  });

  const finished = useMemo(() =>
    [...runs]
      .filter((r) => r.status === "Completed" || r.status === "Failed" || r.status === "Cancelled")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [runs]
  );

  const scenarios = useMemo(() => {
    const names = [...new Set(finished.map((r) => r.scenarioName))].sort();
    return names;
  }, [finished]);

  const filtered = useMemo(() =>
    finished.filter((r) => {
      if (search && !r.scenarioName.toLowerCase().includes(search.toLowerCase())) return false;
      if (scenarioFilter !== "all" && r.scenarioName !== scenarioFilter) return false;
      if (statusFilter === "passed" && r.passed !== true) return false;
      if (statusFilter === "failed" && r.passed !== false) return false;
      if (statusFilter === "cancelled" && r.status !== "Cancelled") return false;
      return true;
    }),
    [finished, search, scenarioFilter, statusFilter]
  );

  return (
    <div className="flex flex-col gap-10 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">{t("reports.title")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("reports.subtitle")}</p>
      </div>

      {/* Özet istatistikler */}
      {finished.length > 0 && <SummaryBar runs={finished} />}

      {/* Tamamlanmış koşumlar */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-200">
            {t("reports.completedRuns")}{" "}
            <span className="text-zinc-500">({filtered.length})</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Senaryo ara…"
                className="h-8 rounded-md border border-zinc-700 bg-zinc-900 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {/* Senaryo filtresi */}
            <select
              value={scenarioFilter}
              onChange={(e) => setScenario(e.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
            >
              <option value="all">Tüm senaryolar</option>
              {scenarios.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Durum filtresi */}
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
            >
              <option value="all">Tümü</option>
              <option value="passed">Geçti</option>
              <option value="failed">Başarısız</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900">
          {isLoading ? (
            <p className="p-6 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <BarChart3 className="h-10 w-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">{t("reports.noRuns")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Senaryo", t("common.status"), "Sonuç", t("dashboard.vus"),
                    t("runs.rps"), t("dashboard.p95"), t("runs.errPct"),
                    "Tamamlandı", ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((run) => (
                  <ReportRow key={run.id} run={run} label={t("common.report")} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Test türü rehberi */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-zinc-200">{t("reports.guide")}</h2>
        <p className="mb-4 text-xs text-zinc-500">Hangi test türünü ne zaman kullanmalısın?</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TEST_TYPES.map((meta) => <TestTypeCard key={meta.id} meta={meta} />)}
        </div>
      </section>
    </div>
  );
}

function ReportRow({ run, label }: { run: TestRunDto; label: string }) {
  const hasQualityGate = run.passed !== null;
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
      <td className="px-5 py-3">
        <div className="font-medium text-zinc-200">{run.scenarioName}</div>
        <div className="text-xs text-zinc-600">v{run.versionNo} · {run.virtualUsers} VU · {run.durationSeconds}s</div>
      </td>
      <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
      <td className="px-5 py-3">
        {hasQualityGate ? (
          run.passed
            ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" />Geçti</span>
            : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" />Kaldı</span>
        ) : <span className="text-xs text-zinc-600">—</span>}
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
        {run.completedAt ? new Date(run.completedAt).toLocaleString() : "—"}
      </td>
      <td className="px-5 py-3">
        <Link href={`/reports/${run.id}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
          {label} <ArrowRight className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}

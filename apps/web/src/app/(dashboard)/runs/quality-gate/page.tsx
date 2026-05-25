"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldX, Minus, CheckCircle2, XCircle,
  Terminal, Clock, Gauge, AlertTriangle,
} from "lucide-react";
import type { TestRunDto } from "@/types";
import Link from "next/link";

function fmt(n: number | null | undefined, unit: string) {
  if (n == null) return "—";
  return `${n}${unit}`;
}

function GateCell({ value, threshold, unit, lowerIsBetter = true }: {
  value: number | null;
  threshold: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  if (value == null || threshold == null) return <span className="text-zinc-600">—</span>;
  const pass = lowerIsBetter ? value <= threshold : value >= threshold;
  return (
    <span className={pass ? "text-emerald-400" : "text-red-400"}>
      {fmt(value, unit)}
      <span className="text-zinc-600 text-xs ml-1">/ {fmt(threshold, unit)}</span>
    </span>
  );
}

export default function QualityGatePage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);

  const { data: runs = [], isLoading } = useQuery<TestRunDto[]>({
    queryKey: ["runs"],
    queryFn: () => api.listRuns(),
    enabled: !!token,
  });

  const gateRuns = useMemo(
    () => runs.filter((r) => r.maxErrorRate != null || r.maxP95Ms != null || r.maxP99Ms != null),
    [runs]
  );

  const passed = gateRuns.filter((r) => r.passed === true).length;
  const failed = gateRuns.filter((r) => r.passed === false).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-400" />
        <h1 className="text-lg font-semibold text-zinc-100">CI/CD Quality Gate</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Gauge className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Gate'li Run</p>
              <p className="text-xl font-bold text-zinc-100">{gateRuns.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Geçti</p>
              <p className="text-xl font-bold text-emerald-400">{passed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <XCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-xs text-zinc-500">Başarısız</p>
              <p className="text-xl font-bold text-red-400">{failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
          ) : gateRuns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <ShieldX className="h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-400">Eşik değeri tanımlı run bulunamadı.</p>
              <p className="text-xs text-zinc-600">
                Run başlatırken maxErrorRate / maxP95Ms / maxP99Ms parametrelerini doldurun.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="px-4 py-3 text-left font-medium">Sonuç</th>
                    <th className="px-4 py-3 text-left font-medium">Senaryo</th>
                    <th className="px-4 py-3 text-left font-medium">Durum</th>
                    <th className="px-4 py-3 text-right font-medium">Hata Oranı</th>
                    <th className="px-4 py-3 text-right font-medium">P95</th>
                    <th className="px-4 py-3 text-right font-medium">P99</th>
                    <th className="px-4 py-3 text-right font-medium">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {gateRuns.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                      <td className="px-4 py-3">
                        {r.passed === true ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : r.passed === false ? (
                          <XCircle className="h-4 w-4 text-red-400" />
                        ) : (
                          <Minus className="h-4 w-4 text-zinc-600" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reports/${r.id}`} className="hover:text-blue-400 text-zinc-200">
                          {r.scenarioName}
                        </Link>
                        <p className="text-xs text-zinc-600">v{r.versionNo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <GateCell
                          value={r.summaryErrorRate != null ? Math.round(r.summaryErrorRate * 100) : null}
                          threshold={r.maxErrorRate != null ? Math.round(r.maxErrorRate * 100) : null}
                          unit="%"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <GateCell value={r.summaryP95Ms} threshold={r.maxP95Ms} unit="ms" />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <GateCell value={r.summaryP99Ms} threshold={r.maxP99Ms} unit="ms" />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {r.completedAt
                            ? new Date(r.completedAt).toLocaleDateString("tr-TR")
                            : "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CLI Integration */}
      <Card className="border-zinc-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-200">CI/CD Entegrasyonu</p>
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <p className="text-zinc-500">
              Quality gate eşikleri aşıldığında CLI exit code <code className="text-orange-400">1</code> döner, pipeline'ı durdurur.
            </p>
            <div className="rounded bg-zinc-900 p-3 font-mono text-zinc-300 leading-5">
              <span className="text-zinc-500"># GitHub Actions örneği</span>{"\n"}
              <span className="text-blue-400">- name:</span> LoadForge Yük Testi{"\n"}
              {"  "}<span className="text-blue-400">run:</span> |{"\n"}
              {"    "}./loadforge run scenario.yaml \{"\n"}
              {"      "}--max-error-rate 0.01 \{"\n"}
              {"      "}--max-p95 500{"\n"}
              {"  "}<span className="text-blue-400">env:</span>{"\n"}
              {"    "}LOADFORGE_API_URL: {"${{ vars.LOADFORGE_URL }}"}{"\n"}
              {"    "}LOADFORGE_TOKEN: {"${{ secrets.LOADFORGE_TOKEN }}"}
            </div>
            <div className="flex items-start gap-2 rounded border border-amber-800/40 bg-amber-950/20 p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
              <p className="text-zinc-400">
                Sadece quality gate eşiği tanımlı run'lar bu sayfada listelenir.
                Run başlatırken en az bir eşik parametresi belirtmeyi unutmayın.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

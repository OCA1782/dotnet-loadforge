"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RunNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionId = searchParams.get("versionId") ?? "";

  const token = useAuthStore((s) => s.token);
  const api = createApi(token);

  const [vus, setVus] = useState(10);
  const [duration, setDuration] = useState(60);
  const [rampUp, setRampUp] = useState(10);
  const [targetRps, setTargetRps] = useState("");
  const [maxErrorRate, setMaxErrorRate] = useState("");
  const [maxP95Ms, setMaxP95Ms] = useState("");
  const [maxP99Ms, setMaxP99Ms] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [executionMode] = useState("single");
  const [error, setError] = useState<string | null>(null);

  const { data: environments = [] } = useQuery({
    queryKey: ["environments"],
    queryFn: () => api.listEnvironments(),
    enabled: !!token,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => api.listScenarios(),
    enabled: !!token && !versionId,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      api.startRun({
        scenarioVersionId: versionId,
        executionMode,
        virtualUsers: vus,
        durationSeconds: duration,
        rampUpSeconds: rampUp,
        targetRps: targetRps ? Number(targetRps) : undefined,
        maxErrorRate: maxErrorRate ? Number(maxErrorRate) / 100 : undefined,
        maxP95Ms: maxP95Ms ? Number(maxP95Ms) : undefined,
        maxP99Ms: maxP99Ms ? Number(maxP99Ms) : undefined,
        environmentId: environmentId || undefined,
      }),
    onSuccess: (data) => router.push(`/runs/${data.id}`),
    onError: (e: Error) => setError(e.message),
  });

  if (!versionId) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <p className="text-sm text-zinc-400">
          Bir senaryo seçmeden koşu başlatamazsınız.
        </p>
        <Link href="/scenarios">
          <Button variant="secondary" size="sm">Senaryolara Git</Button>
        </Link>
      </div>
    );
  }

  const scenario = scenarios.find((s) => s.latestVersionId === versionId);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/scenarios">
          <button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
            <ChevronLeft className="h-4 w-4" />
            Senaryolar
          </button>
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-lg font-bold text-zinc-100">
          {scenario?.name ? `${scenario.name} — Yeni Koşu` : "Yeni Test Koşusu"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yük Profili</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Sanal Kullanıcı (VU) *</Label>
            <Input
              type="number" min={1} max={100000}
              value={vus}
              onChange={(e) => setVus(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Süre (saniye) *</Label>
            <Input
              type="number" min={1} max={86400}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rampa Süresi (saniye)</Label>
            <Input
              type="number" min={0}
              value={rampUp}
              onChange={(e) => setRampUp(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Hedef RPS <span className="text-zinc-600">(opsiyonel)</span></Label>
            <Input
              type="number" min={1}
              value={targetRps}
              onChange={(e) => setTargetRps(e.target.value)}
              placeholder="Sınırsız"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Ortam <span className="text-zinc-600">(opsiyonel)</span></Label>
            <select
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            >
              <option value="">— Ortam seçin —</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}{env.baseUrl ? ` (${env.baseUrl})` : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalite Kapıları <span className="text-xs font-normal text-zinc-500">— boş bırakılırsa kontrol yapılmaz</span></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Maks. Hata Oranı (%)</Label>
            <Input
              type="number" min={0} max={100} step={0.1}
              value={maxErrorRate}
              onChange={(e) => setMaxErrorRate(e.target.value)}
              placeholder="örn. 1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Maks. P95 (ms)</Label>
            <Input
              type="number" min={1}
              value={maxP95Ms}
              onChange={(e) => setMaxP95Ms(e.target.value)}
              placeholder="örn. 500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Maks. P99 (ms)</Label>
            <Input
              type="number" min={1}
              value={maxP99Ms}
              onChange={(e) => setMaxP99Ms(e.target.value)}
              placeholder="örn. 1000"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md bg-red-950/40 px-4 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending || !versionId}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {startMutation.isPending ? "Başlatılıyor…" : "Testi Başlat"}
        </Button>
        <Link href="/scenarios">
          <Button variant="ghost" size="sm">İptal</Button>
        </Link>
      </div>
    </div>
  );
}

export default function RunNewPage() {
  return (
    <Suspense>
      <RunNewForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-500">
      Loading editor…
    </div>
  ),
});

type Preset = { id: string; vus: number; duration: string; rampUp: string };

const PRESETS: Preset[] = [
  { id: "smoke",      vus: 2,    duration: "60s",  rampUp: "0s"  },
  { id: "load",       vus: 50,   duration: "5m",   rampUp: "60s" },
  { id: "stress",     vus: 200,  duration: "10m",  rampUp: "2m"  },
  { id: "spike",      vus: 500,  duration: "2m",   rampUp: "10s" },
  { id: "soak",       vus: 30,   duration: "1h",   rampUp: "5m"  },
  { id: "breakpoint", vus: 1000, duration: "30m",  rampUp: "15m" },
];

const PRESET_COLORS: Record<string, string> = {
  smoke:      "text-emerald-400 border-emerald-800 hover:bg-emerald-900/20",
  load:       "text-blue-400   border-blue-800   hover:bg-blue-900/20",
  stress:     "text-orange-400 border-orange-800 hover:bg-orange-900/20",
  spike:      "text-red-400    border-red-800    hover:bg-red-900/20",
  soak:       "text-violet-400 border-violet-800 hover:bg-violet-900/20",
  breakpoint: "text-rose-400   border-rose-800   hover:bg-rose-900/20",
};

function buildYaml(preset: Preset | null, name: string): string {
  const p = preset ?? { vus: 10, duration: "60s", rampUp: "10s" };
  return `version: "1"
name: ${name || "My Load Test"}
config:
  duration: ${p.duration}
  virtualUsers: ${p.vus}
  rampUp: ${p.rampUp}
  targetRps: 0

environments:
  default:
    baseUrl: https://httpbin.org

steps:
  - name: GET /get
    protocol: http
    request:
      method: GET
      url: /get
      timeoutMs: 10000
    assertions:
      - type: statusCode
        equals: 200
      - type: responseTime
        lessThanMs: 2000
`;
}

export default function NewScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const initialPreset = PRESETS.find((p) => p.id === searchParams.get("preset")) ?? null;

  const [activePreset, setActivePreset] = useState<Preset | null>(initialPreset);
  const [name, setName] = useState(initialPreset ? `${t(`preset.${initialPreset.id}`)} Test` : "");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(() =>
    buildYaml(initialPreset, initialPreset ? `${t(`preset.${initialPreset.id}`)} Test` : "My Load Test")
  );
  const [error, setError] = useState<string | null>(null);

  function applyPreset(preset: Preset) {
    setActivePreset(preset);
    const newName = `${t(`preset.${preset.id}`)} Test`;
    setName(newName);
    setContent(buildYaml(preset, newName));
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.createScenario({
        name,
        description: description || undefined,
        content,
        contentFormat: "yaml",
        changeNote: "Initial version",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      router.push("/scenarios");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed"),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">{t("scenarios.new.title")}</h1>
        <p className="text-sm text-zinc-400">{t("scenarios.new.subtitle")}</p>
      </div>

      {/* Preset picker */}
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">{t("scenarios.new.presetLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${PRESET_COLORS[preset.id]} ${
                activePreset?.id === preset.id ? "ring-1 ring-current" : "opacity-70 hover:opacity-100"
              }`}
            >
              {t(`preset.${preset.id}`)}
              <span className="ml-1.5 opacity-60">
                {preset.vus} VU · {preset.duration}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: metadata */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("common.name")} *</Label>
            <Input
              id="name"
              placeholder={t("scenarios.new.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desc">{t("scenarios.new.descLabel")}</Label>
            <textarea
              id="desc"
              rows={3}
              placeholder={t("scenarios.new.descPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-950/40 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <Button onClick={() => mutate()} disabled={isPending || !name.trim()} className="w-full">
            {isPending ? t("scenarios.new.saving") : t("scenarios.new.save")}
          </Button>

          <Button variant="secondary" onClick={() => router.back()} className="w-full">
            {t("common.cancel")}
          </Button>

          {/* DSL hint */}
          <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-400">{t("scenarios.new.dslTitle")}</p>
            <p><span className="text-blue-400">virtualUsers</span>: {t("scenarios.new.dslVus")}</p>
            <p><span className="text-blue-400">duration</span>: {t("scenarios.new.dslDuration")}</p>
            <p><span className="text-blue-400">rampUp</span>: {t("scenarios.new.dslRampUp")}</p>
            <p><span className="text-blue-400">targetRps</span>: {t("scenarios.new.dslRps")}</p>
            <p><span className="text-blue-400">assertions</span>: {t("scenarios.new.dslAssertions")}</p>
          </div>
        </div>

        {/* Right: Monaco editor */}
        <div className="col-span-2 overflow-hidden rounded-lg border border-zinc-700">
          <MonacoEditor
            height="600px"
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
              padding: { top: 12 },
            }}
          />
        </div>
      </div>
    </div>
  );
}

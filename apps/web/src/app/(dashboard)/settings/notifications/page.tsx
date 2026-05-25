"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Plus, Trash2, Play, Power, CheckCircle, XCircle } from "lucide-react";
import type { WebhookDto } from "@/types";

const ALL_EVENTS = [
  { value: "run.completed", label: "Koşu Tamamlandı" },
  { value: "run.failed", label: "Koşu Başarısız" },
  { value: "run.quality_gate_failed", label: "Kalite Kapısı Başarısız" },
];

export default function NotificationsPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();
  const t = useT();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["run.completed", "run.failed"]);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => api.listWebhooks(),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createWebhook(name, url, selectedEvents),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setName("");
      setUrl("");
      setSelectedEvents(["run.completed", "run.failed"]);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testWebhook(id),
    onSuccess: (data, id) => {
      setTestResults((prev) => ({ ...prev, [id]: data.response }));
      setTimeout(() => setTestResults((prev) => { const n = {...prev}; delete n[id]; return n; }), 5000);
    },
    onError: (e: Error, id) => {
      setTestResults((prev) => ({ ...prev, [id]: `Hata: ${e.message}` }));
      setTimeout(() => setTestResults((prev) => { const n = {...prev}; delete n[id]; return n; }), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  function toggleEvent(ev: string) {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("webhooks.create")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">{t("webhooks.subtitle")}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("common.name")} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("webhooks.namePlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL *</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("webhooks.urlPlaceholder")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("webhooks.events")}</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map((ev) => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedEvents.includes(ev.value)
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-red-950/40 px-3 py-1.5 text-xs text-red-400">{error}</p>
          )}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !url.trim() || selectedEvents.length === 0}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {createMutation.isPending ? "Ekleniyor…" : t("webhooks.create")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-zinc-400" />
            {t("webhooks.title")}
            <span className="ml-auto text-xs font-normal text-zinc-500">{webhooks.length} webhook</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Bell className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">{t("webhooks.noWebhooks")}</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {webhooks.map((wh: WebhookDto) => (
                <div key={wh.id} className="flex items-start gap-4 p-4 hover:bg-zinc-800/20">
                  <div className="mt-0.5">
                    {wh.isActive
                      ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-zinc-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-200 text-sm">{wh.name}</p>
                    <p className="text-xs text-zinc-500 truncate font-mono mt-0.5">{wh.url}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {wh.events.map((ev) => (
                        <span key={ev} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                          {ev}
                        </span>
                      ))}
                    </div>
                    {testResults[wh.id] && (
                      <p className={`mt-1.5 text-xs ${testResults[wh.id].startsWith("Hata") || testResults[wh.id].startsWith("HTTP 4") || testResults[wh.id].startsWith("HTTP 5") ? "text-red-400" : "text-emerald-400"}`}>
                        Test sonucu: {testResults[wh.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => testMutation.mutate(wh.id)}
                      disabled={testMutation.isPending}
                      title="Test gönder"
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(wh.id)}
                      title={wh.isActive ? "Pasife al" : "Aktif et"}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(wh.id)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

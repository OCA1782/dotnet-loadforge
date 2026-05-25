"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { createApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen, Plus, Trash2, FileCode2, Globe, X,
} from "lucide-react";
import Link from "next/link";
import type { ProjectDto } from "@/types";

export default function ProjectsPage() {
  const token = useAuthStore((s) => s.token);
  const api = createApi(token);
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const { data: projects = [], isLoading } = useQuery<ProjectDto[]>({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createProject(name.trim(), description.trim() || undefined, baseUrl.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      setBaseUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold text-zinc-100">Projeler</h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {projects.length}
          </span>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> Yeni Proje
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="border-blue-800/50 bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-zinc-200">Yeni Proje Oluştur</p>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4 text-zinc-400 hover:text-zinc-200" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Proje Adı *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="API Test Suite"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Açıklama</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kısa açıklama"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                  İptal
                </Button>
                <Button
                  size="sm"
                  disabled={!name.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
                </Button>
              </div>
              {createMutation.isError && (
                <p className="text-xs text-red-400">{(createMutation.error as Error).message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-16 text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">Henüz proje yok</p>
          <p className="mt-1 text-xs text-zinc-600">Yukarıdan yeni bir proje oluşturun.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={() => deleteMutation.mutate(p.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
  deleting,
}: {
  project: ProjectDto;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Card className="group relative">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
            <p className="truncate text-sm font-medium text-zinc-100">{project.name}</p>
          </div>
          <button
            onClick={onDelete}
            disabled={deleting || project.scenarioCount > 0}
            title={project.scenarioCount > 0 ? "Senaryo içeren proje silinemez" : "Sil"}
            className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {project.description && (
          <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">{project.description}</p>
        )}

        {project.baseUrl && (
          <div className="mt-2 flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-zinc-600" />
            <span className="truncate text-xs text-zinc-500">{project.baseUrl}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-1.5">
            <FileCode2 className="h-3.5 w-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500">{project.scenarioCount} senaryo</span>
          </div>
          <Link
            href={`/scenarios`}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Senaryolar →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

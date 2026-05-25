import type {
  ApiKeyDto,
  CreateApiKeyResponse,
  EnvironmentDto,
  InviteResponse,
  LoginResponse,
  MemberDto,
  MetricSnapshotDto,
  ProjectDto,
  RunNoteDto,
  ScenarioDetailDto,
  ScenarioDto,
  ScenarioVersionDto,
  StartRunRequest,
  TestRunDto,
  UserRole,
  WebhookDto,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }

  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, organizationName: string) =>
    request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, organizationName }),
    }),
};

// ── Factory for authenticated calls ─────────────────────────────────────────

export function createApi(token: string | null) {
  const get = <T>(path: string) => request<T>(path, { method: "GET" }, token);
  const post = <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, token);

  return {
    // Scenarios
    listScenarios: (): Promise<ScenarioDto[]> =>
      get<ScenarioDto[]>("/api/scenarios"),

    getScenario: (id: string) =>
      get<ScenarioDetailDto>(`/api/scenarios/${id}`),

    createScenario: (payload: {
      name: string;
      description?: string;
      content: string;
      contentFormat: string;
      changeNote?: string;
    }) => post<{ id: string }>("/api/scenarios", payload),

    updateScenario: (id: string, payload: {
      name: string;
      description?: string;
      content: string;
      contentFormat: string;
      changeNote?: string;
    }) => request<void>(`/api/scenarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, token),

    deleteScenario: (id: string) =>
      request<void>(`/api/scenarios/${id}`, { method: "DELETE" }, token),

    // Test Runs
    startRun: (payload: StartRunRequest) =>
      post<{ id: string }>("/api/test-runs", payload),

    getRun: (id: string) => get<TestRunDto>(`/api/test-runs/${id}`),

    listRuns: () => get<TestRunDto[]>("/api/test-runs"),

    listRunsByScenario: (scenarioId: string) =>
      get<TestRunDto[]>(`/api/test-runs?scenarioId=${scenarioId}`),

    cancelRun: (id: string) => post(`/api/test-runs/${id}/cancel`),

    deleteRun: (id: string) =>
      request<void>(`/api/test-runs/${id}`, { method: "DELETE" }, token),

    forceStatus: (id: string, status: "Cancelled" | "Failed" | "Completed") =>
      post<void>(`/api/test-runs/${id}/force-status`, { status }),

    retryRun: (id: string) =>
      post<{ id: string }>(`/api/test-runs/${id}/retry`),

    setBaseline: (id: string) =>
      post<void>(`/api/test-runs/${id}/baseline`),

    // Run Notes
    listNotes: (runId: string) =>
      get<RunNoteDto[]>(`/api/test-runs/${runId}/notes`),

    addNote: (runId: string, content: string) =>
      post<RunNoteDto>(`/api/test-runs/${runId}/notes`, { content }),

    deleteNote: (runId: string, noteId: string) =>
      request<void>(`/api/test-runs/${runId}/notes/${noteId}`, { method: "DELETE" }, token),

    bulkDeleteRuns: (runIds?: string[]) =>
      request<{ deleted: number }>("/api/test-runs", {
        method: "DELETE",
        body: JSON.stringify({ runIds: runIds ?? null }),
      }, token),

    // Metrics (for live monitor — polling)
    getRunMetrics: (runId: string) =>
      get<MetricSnapshotDto[]>(`/api/test-runs/${runId}/metrics`),

    // Members
    listMembers: () => get<MemberDto[]>("/api/members"),
    inviteMember: (email: string, role: UserRole) =>
      post<InviteResponse>("/api/members/invite", { email, role }),
    updateMemberRole: (memberId: string, role: UserRole) =>
      request<void>(`/api/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }, token),
    removeMember: (memberId: string) =>
      request<void>(`/api/members/${memberId}`, { method: "DELETE" }, token),

    // API Keys
    listApiKeys: () => get<ApiKeyDto[]>("/api/api-keys"),
    createApiKey: (name: string, scopes: string[], expiresAt?: string) =>
      post<CreateApiKeyResponse>("/api/api-keys", { name, scopes, expiresAt: expiresAt ?? null }),
    revokeApiKey: (id: string) =>
      request<void>(`/api/api-keys/${id}`, { method: "DELETE" }, token),

    // Environments
    listEnvironments: () => get<EnvironmentDto[]>("/api/environments"),
    createEnvironment: (name: string, baseUrl?: string) =>
      post<EnvironmentDto>("/api/environments", { name, baseUrl: baseUrl ?? null }),
    deleteEnvironment: (id: string) =>
      request<void>(`/api/environments/${id}`, { method: "DELETE" }, token),

    // Webhooks
    listWebhooks: () => get<WebhookDto[]>("/api/webhooks"),
    createWebhook: (name: string, url: string, events: string[]) =>
      post<WebhookDto>("/api/webhooks", { name, url, events }),
    toggleWebhook: (id: string) =>
      post<{ isActive: boolean }>(`/api/webhooks/${id}/toggle`),
    testWebhook: (id: string) =>
      post<{ response: string }>(`/api/webhooks/${id}/test`),
    deleteWebhook: (id: string) =>
      request<void>(`/api/webhooks/${id}`, { method: "DELETE" }, token),

    // Scenario versions
    listScenarioVersions: (scenarioId: string) =>
      get<ScenarioVersionDto[]>(`/api/scenarios/${scenarioId}/versions`),

    // Projects
    listProjects: () => get<ProjectDto[]>("/api/projects"),
    createProject: (name: string, description?: string, baseUrl?: string) =>
      post<{ id: string }>("/api/projects", { name, description: description ?? null, baseUrl: baseUrl ?? null }),
    deleteProject: (id: string) =>
      request<void>(`/api/projects/${id}`, { method: "DELETE" }, token),
  };
}

export type ApiClient = ReturnType<typeof createApi>;

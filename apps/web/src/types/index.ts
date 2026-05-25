export type TestRunStatus =
  | "Pending"
  | "Queued"
  | "Running"
  | "Stopping"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type UserRole = 1 | 2 | 3 | 4 | 5;

export const UserRoleLabel: Record<UserRole, string> = {
  1: "Owner",
  2: "Admin",
  3: "Developer",
  4: "Viewer",
  5: "CiBot",
};

export interface TestRunDto {
  id: string;
  scenarioId: string;
  scenarioName: string;
  scenarioVersionId: string;
  versionNo: number;
  status: TestRunStatus;
  executionMode: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  targetRps: number | null;
  passed: boolean | null;
  failReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  summaryRps: number | null;
  summaryP95Ms: number | null;
  summaryP99Ms: number | null;
  summaryErrorRate: number | null;
  createdAt: string;
  queuePosition: number | null;
  maxErrorRate: number | null;
  maxP95Ms: number | null;
  maxP99Ms: number | null;
  isBaseline: boolean;
}

export interface RunNoteDto {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface MetricSnapshotDto {
  timestamp: string;
  rps: number;
  activeVu: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
}

export interface ScenarioDto {
  id: string;
  name: string;
  description: string | null;
  protocol: string;
  createdAt: string;
  latestVersionId: string | null;
  latestVersionNo: number | null;
}

export interface ScenarioDetailDto extends ScenarioDto {
  content: string | null;
  contentFormat: string | null;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface StartRunRequest {
  scenarioVersionId: string;
  environmentId?: string;
  executionMode: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  targetRps?: number;
  maxErrorRate?: number;
  maxP95Ms?: number;
  maxP99Ms?: number;
}

export interface MemberDto {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  joinedAt: string;
  lastLoginAt: string | null;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
}

export interface CreateApiKeyResponse extends ApiKeyDto {
  plaintextKey: string;
}

export interface InviteResponse {
  invitationId: string;
  token: string;
  email: string;
  role: UserRole;
  expiresAt: string;
}

export interface EnvironmentDto {
  id: string;
  name: string;
  baseUrl: string | null;
  createdAt: string;
}

export interface WebhookDto {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ScenarioVersionDto {
  id: string;
  versionNo: number;
  changeNote: string | null;
  createdBy: string;
  createdAt: string;
  runCount: number;
}

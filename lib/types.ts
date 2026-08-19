export type EmployeeRole =
  | "OWNER"
  | "ADMIN"
  | "TECHNICAL"
  | "SUPPORT"
  | "CONTENT"
  | "MARKETING";

export const EMPLOYEE_ROLES: EmployeeRole[] = [
  "OWNER",
  "ADMIN",
  "TECHNICAL",
  "SUPPORT",
  "CONTENT",
  "MARKETING",
];

export interface Employee {
  id: string;
  name: string;
  login: string;
  email: string;
  role: EmployeeRole;
  department?: string | null;
  status?: string | null;
  activeSessionCount?: number | null;
  lastLoginAt?: string | null;
  permissionOverrides?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  employee: Employee;
}

export interface AuditLogEntry {
  id: string;
  employeeId: string;
  employeeLogin: string;
  area: string;
  objectType: string;
  objectId: string;
  action: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  comment: string | null;
  createdAt: string;
  reverted: boolean;
}

export interface OverviewPayload {
  apiUsage?: Record<string, unknown> | null;
  whitelist?: {
    auto?: number | null;
    whitelist?: number | null;
    blacklist?: number | null;
    [key: string]: unknown;
  } | null;
  modelLab?: Record<string, unknown> | null;
  pendingJobs?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SearchResult {
  type: string;
  id: string;
  label: string;
  url: string;
}

export interface ApiError {
  error: string;
}

// --- Football domain (legacy-admin-token backed, /api/admin/football/*) ---
// Shapes are intentionally permissive: the backend for this domain is being
// built in parallel and exact key casing / presence may vary. Always render
// defensively (feature-detect, never crash on a missing field).

export interface FootballTeamRef {
  id: string;
  name: string;
  logoUrl?: string | null;
  [key: string]: unknown;
}

export interface FootballLeagueRef {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface FootballMatch {
  id: string;
  kickoffUtc?: string | null;
  league?: FootballLeagueRef | null;
  homeTeam?: FootballTeamRef | null;
  awayTeam?: FootballTeamRef | null;
  status?: string | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  visible?: boolean | null;
  analysisEnabled?: boolean | null;
  tipEnabled?: boolean | null;
  learningEnabled?: boolean | null;
  liveEnabled?: boolean | null;
  hasAnalysis?: boolean | null;
  [key: string]: unknown;
}

export interface FootballMatchListResponse {
  matches: FootballMatch[];
  count?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/** Full match detail: a superset of the list row, rest of the fields unknown. */
export type FootballMatchDetail = FootballMatch & Record<string, unknown>;

export type LeagueManualStatus = "auto" | "whitelist" | "blacklist";

export interface FootballLeague {
  leagueId: string;
  name: string;
  manualStatus?: LeagueManualStatus | string;
  [key: string]: unknown;
}

export interface FootballAsset {
  type: string;
  id: string;
  entityName?: string | null;
  status: string;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export type SettlementJobStatus = "running" | "completed" | "failed" | string;

// --- Jobs / API Usage / App Control (control-center session auth) ---
// Backend returns raw DB column names here (unlike the Football domain,
// which maps to camelCase - see lib/settlementJob.ts) since these three
// endpoints call PhoenixDatabase methods directly and pass rows through
// ControlCenterRoutes._jsonSafe without a rename step.

export interface JobRow {
  id: number | string;
  status: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  last_error?: string | null;
  [key: string]: unknown;
}

export interface JobsPayload {
  dailyPipeline: JobRow[];
  settlement: JobRow[];
  learningRuns: JobRow[];
}

export interface ApiUsageRow {
  api_name: string;
  usage_date: string;
  requests: number;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface ApiUsagePayload {
  today: ApiUsageRow[];
  history: ApiUsageRow[];
}

export type AppControlStatusValue = "ACTIVE" | "MAINTENANCE" | "DISABLED";

export interface AppControlStatus {
  status: AppControlStatusValue | string;
  message?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface SettlementJob {
  id: number;
  status: SettlementJobStatus;
  minHoursSinceKickoff?: number | null;
  batchSize?: number | null;
  checked?: number | null;
  settled?: number | null;
  pending?: number | null;
  failed?: number | null;
  error?: string | null;
  lastError?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  [key: string]: unknown;
}

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

// --- Model Lab (legacy PHOENIX_ADMIN_TOKEN auth, /api/admin/model-lab/*) ---
// Raw DB column names throughout, same reasoning as the Football domain's
// /matches/settle/* group and Jobs/API-Usage: this API predates the Control
// Center and its _jsonSafe helper doesn't rename keys.

export type ModelStatus = "champion" | "challenger" | "retired" | string;

export interface ModelVersion {
  id: number;
  readable_version: string;
  parent_model_id?: number | null;
  generation?: number | null;
  league_id?: string | null;
  market: string;
  model_type?: string | null;
  training_count?: number | null;
  validation_count?: number | null;
  holdout_count?: number | null;
  shadow_count?: number | null;
  created_at?: string | null;
  status: ModelStatus;
  champion_since?: string | null;
  last_promotion_at?: string | null;
  config_hash?: string | null;
  code_schema_version?: string | null;
  evaluation_summary?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ModelEvaluation {
  id: number;
  model_version_id: number;
  compared_against_model_id?: number | null;
  league_id?: string | null;
  market: string;
  evaluation_type: string;
  match_scope?: string | null;
  sample_size?: number | null;
  brier_score?: number | null;
  log_loss?: number | null;
  accuracy?: number | null;
  roi?: number | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export type ModelVersionDetail = ModelVersion & { evaluations: ModelEvaluation[] };

export interface ModelLabOverview {
  learningSystem?: string;
  promotionEnabled: boolean;
  generativeAi?: string;
  whitelistLeagues?: number;
  activeChampions?: number;
  activeChallengers?: number;
  shadowPredictions?: number;
  learningEligibleMatches?: number;
  lastLearningRun?: Record<string, unknown> | null;
  nextLearningRunBerlin?: string | null;
  nextChampionReviewBerlin?: string | null;
  [key: string]: unknown;
}

export interface LearningRun {
  id: number;
  started_at?: string | null;
  completed_at?: string | null;
  status: string;
  trigger_type?: string | null;
  current_step?: string | null;
  leagues_processed?: number | null;
  markets_processed?: number | null;
  eligible_matches?: number | null;
  excluded_matches?: number | null;
  exclusions_by_reason?: Record<string, unknown> | null;
  challengers_created?: number | null;
  errors?: unknown[] | null;
  summary?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ShadowPrediction {
  id: number;
  model_version_id: number;
  fixture_id: string;
  league_id: string;
  market: string;
  settled: boolean;
  outcome_index?: number | null;
  brier_score?: number | null;
  log_loss?: number | null;
  settled_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface MonthlyReview {
  id: number;
  review_year: number;
  review_month: number;
  league_id?: string | null;
  market: string;
  champion_model_id?: number | null;
  challenger_model_id?: number | null;
  same_match_sample?: number | null;
  recommendation: string;
  reason?: string | null;
  reviewed_at?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface ModelLabLeagueMarket {
  market: string;
  sampleSize?: number | null;
  status: string;
  champion?: { id: number; readableVersion: string } | null;
  bestChallenger?: { id: number; readableVersion: string } | null;
  challengerCount?: number | null;
  [key: string]: unknown;
}

export interface EligibilityAudit {
  totalStoredSnapshots: number;
  eligible: number;
  notEligible: number;
  exclusionsByReason: Record<string, number>;
  perLeague: { leagueId: string; storedSnapshots: number; whitelisted: number; settled: number; eligible: number }[];
}

export interface ModelLabLeague {
  leagueId: string;
  leagueName?: string | null;
  country?: string | null;
  storedMatches?: number | null;
  settledMatches?: number | null;
  eligibleMatches?: number | null;
  markets: ModelLabLeagueMarket[];
  [key: string]: unknown;
}

// --- Phase 4: Devices & Support (installation-based, no PHÖNIX user
// accounts exist yet - see lib/src/database/database.dart _migrateSupport
// on the backend). Raw DB column names throughout (control-center session
// auth, but these rows come straight from PhoenixDatabase without a
// camelCase rename step, same reasoning as Jobs/API-Usage/App-Control).

export interface PushDevice {
  installation_id: string;
  platform: string;
  locale?: string | null;
  enabled: boolean;
  news_enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
  favorite_count?: number | null;
  ticket_count?: number | null;
  [key: string]: unknown;
}

export type TicketStatus = "NEU" | "IN_BEARBEITUNG" | "WARTET_AUF_NUTZER" | "GELOEST" | "GESCHLOSSEN";
export type TicketCategory = "frage" | "bug" | "premium" | "match" | "sonstiges";
export type TicketPriority = "niedrig" | "normal" | "hoch" | "dringend";

export interface SupportTicket {
  id: number;
  installation_id: string;
  category: TicketCategory | string;
  subject: string;
  message: string;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  assigned_employee_id?: number | null;
  app_version?: string | null;
  platform?: string | null;
  os_version?: string | null;
  device_model?: string | null;
  match_id?: string | null;
  screen?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface AssignableEmployee {
  id: number;
  name: string;
}

export interface SupportTicketMessage {
  id: number;
  ticket_id: number;
  author_type: "user" | "employee";
  employee_id?: number | null;
  message: string;
  internal_note: boolean;
  created_at?: string | null;
  [key: string]: unknown;
}

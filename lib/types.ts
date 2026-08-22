export type EmployeeRole =
  | "OWNER"
  | "VICE_OWNER"
  | "ADMIN"
  | "TECHNICAL"
  | "SUPPORT"
  | "CONTENT"
  | "MARKETING"
  | "SECURITY";

export const EMPLOYEE_ROLES: EmployeeRole[] = [
  "OWNER",
  "VICE_OWNER",
  "ADMIN",
  "TECHNICAL",
  "SUPPORT",
  "CONTENT",
  "MARKETING",
  "SECURITY",
];

/** Plain-German display name for each role code, so the raw English constant never shows up in the UI directly. */
export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Inhaber",
  VICE_OWNER: "Stellvertretender Inhaber",
  ADMIN: "Administrator",
  TECHNICAL: "Technik",
  SUPPORT: "Support",
  CONTENT: "Redaktion",
  MARKETING: "Marketing",
  SECURITY: "Sicherheit",
};
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

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
  employeeId: string | null;
  employeeLogin: string;
  employeeName: string;
  employeeRole: string | null;
  area: string;
  objectType: string;
  objectId: string;
  action: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  comment: string | null;
  ip: string | null;
  createdAt: string;
  reverted: boolean;
  revertedAt: string | null;
}

export interface JobStatusCounts {
  running: number;
  failed24h: number;
  completed24h: number;
}

export interface OverviewPayload {
  apiUsage?: ApiUsageRow[] | null;
  whitelist?: {
    auto?: number | null;
    whitelist?: number | null;
    blacklist?: number | null;
    [key: string]: unknown;
  } | null;
  modelLab?: {
    whitelistLeagues?: number | null;
    activeChampions?: number | null;
    activeChallengers?: number | null;
    shadowPredictions?: number | null;
    learningEligibleMatches?: number | null;
    lastLearningRun?: {
      status?: string | null;
      started_at?: string | null;
      completed_at?: string | null;
      trigger_type?: string | null;
      leagues_processed?: number | null;
      markets_processed?: number | null;
      eligible_matches?: number | null;
      excluded_matches?: number | null;
      challengers_created?: number | null;
    } | null;
    [key: string]: unknown;
  } | null;
  pendingJobs?: {
    dailyPipeline?: JobStatusCounts | null;
    settlement?: JobStatusCounts | null;
  } | null;
  warnings?: {
    missingLeagueLogos?: number | null;
  } | null;
  footballToday?: {
    scheduledMatches?: number | null;
    newAnalysesToday?: number | null;
    tipsToday?: number | null;
    matchesWithoutRecommendation?: number | null;
    analysisRunning?: number | null;
    analysisFailed?: number | null;
    lowDataQuality?: number | null;
    newValueSignals?: number | null;
    openSettlementJobs?: number | null;
  } | null;
  today?: {
    activeSupportCases?: number | null;
    activeUsers?: number | null;
    activeLiveMatches?: number | null;
  } | null;
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
  updatedAt?: string | null;
  topTip?: { marketKey: string; marketLabel: string } | null;
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
  has_logo?: boolean;
  [key: string]: unknown;
}

/** Row shape from GET /api/admin/football/teams (raw SQL column names). */
export interface FootballTeamProfile {
  id: string;
  name: string;
  logo?: string | null;
  league_id?: string | null;
  league_name?: string | null;
  country?: string | null;
  stored_matches?: number;
  analyzed_matches?: number;
  tips_count?: number;
  won?: number;
  lost?: number;
  has_logo?: boolean;
  data_status?: "full" | "partial" | "missing" | string;
  active_status?: "active" | "inactive" | string;
  hit_rate_percent?: number | null;
  roi_percent?: number | null;
  coverage_percent?: number | null;
  [key: string]: unknown;
}

export interface FootballTeamListResponse {
  teams: FootballTeamProfile[];
  total: number;
  limit: number;
  offset: number;
}

/** Row shape from GET /api/admin/football/tips - the backend returns the raw SQL column names (snake_case); this UI never shows those keys directly, only translated German labels built from them. */
export interface FootballTip {
  phase_two_scan_run_id: number;
  fixture_id: string;
  prediction_date?: string | null;
  kickoff?: string | null;
  model_version: string;
  market_key: string;
  market_label: string;
  model_probability?: number | null;
  fair_odds?: number | null;
  market_odds?: number | null;
  assigned_units?: number | null;
  data_quality: number;
  confidence: number;
  result_status: "pending" | "won" | "lost" | "push" | string;
  home_score?: number | null;
  away_score?: number | null;
  profit_units?: number | null;
  settled_at?: string | null;
  created_at?: string | null;
  is_value_tip?: boolean | null;
  value_percent?: number | null;
  simulation_count?: number | null;
  league_id?: string | null;
  league_name?: string | null;
  country?: string | null;
  home_team_id?: string | null;
  home_team_name?: string | null;
  home_logo?: string | null;
  away_team_id?: string | null;
  away_team_name?: string | null;
  away_logo?: string | null;
  match_status?: string | null;
  whitelist_status?: LeagueManualStatus | string | null;
  [key: string]: unknown;
}

export interface FootballTipListResponse {
  tips: FootballTip[];
  total: number;
  limit: number;
  offset: number;
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

export interface FootballAssetHistoryItem {
  id: number;
  mime_type: string;
  archived_at: string;
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
  training_start?: string | null;
  training_end?: string | null;
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
  calibration?: unknown[] | null;
  accuracy?: number | null;
  roi?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export type ModelVersionDetail = ModelVersion & { evaluations: ModelEvaluation[] };

// Section 13 (AN2): "Statusgrund" - warum ein Modell champion/challenger/
// retired wurde bzw. eine Beförderung abgelehnt wurde. Kommt 1:1 aus der
// bestehenden phoenix_model_audit_log-Tabelle (bisher nur backend-intern
// geschrieben, nie im Control Center gelesen).
export interface ModelAuditLogEntry {
  id: number;
  occurred_at?: string | null;
  action: string;
  actor: string;
  model_version_id?: number | null;
  league_id?: string | null;
  market?: string | null;
  learning_run_id?: number | null;
  details?: Record<string, unknown> | null;
  [key: string]: unknown;
}

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

// Section 15 (AN2): "ausstehend" - Vorschauzahlen vor generieren/abrechnen.
export interface ShadowStatus {
  pendingSettle: number;
  totalShadowPredictions: number;
  actionInProgress: "generate" | "settle" | null;
}

// Section 15 (AN2): "Champion-vs-Challenger, Signifikanz" - derselbe
// gepaarte Bootstrap-Vergleich wie bei Reviews, hier live pro Modell.
export interface ShadowComparisonToChampion {
  championModelId: number;
  championReadableVersion?: string | null;
  minPromotionSample: number;
  sampleSize: number;
  meanDifference: number;
  lowerBound: number;
  upperBound: number;
  status: "challengerClearlyBetter" | "approximatelyEqual" | "championBetter" | "notEnoughData" | string;
}

// Section 14 (AN2): "Vorher/Nachher-Vergleich" - das paarweise, statistische
// Champion-vs-Challenger-Ergebnis, das der Monthly-Review-Service bereits
// berechnet (metrics.dart PairedUncertaintyResult.toJson()), aber bisher nie
// im Frontend gelesen wurde.
export interface MonthlyReviewUncertainty {
  sampleSize: number;
  meanDifference: number;
  lowerBound: number;
  upperBound: number;
  status: "challengerClearlyBetter" | "approximatelyEqual" | "championBetter" | "notEnoughData" | string;
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
  metrics?: Record<string, unknown> | null;
  uncertainty?: MonthlyReviewUncertainty | null;
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

// --- Phase 5: News CMS, FAQ, Advertising, Push Center, Premium Matrix ---
// Raw DB column names throughout, same reasoning as the other
// control-center session-auth endpoints added in Phase 2/4.

export type EditorialStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";

export interface EditorialArticle {
  id: number;
  title: string;
  summary?: string | null;
  body?: string | null;
  category: string;
  image_url?: string | null;
  author_employee_id?: number | null;
  status: EditorialStatus | string;
  homepage_feature: boolean;
  breaking: boolean;
  send_push: boolean;
  push_sent_at?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type FaqStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface FaqArticle {
  id: number;
  title: string;
  body?: string | null;
  category: string;
  position: number;
  status: FaqStatus | string;
  author_employee_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type AdSlot = "home_banner" | "match_detail_infeed" | "news_infeed";
export type AdAudience = "ALL" | "FREE" | "PREMIUM";

export interface AdCampaign {
  id: number;
  name: string;
  slot: AdSlot | string;
  image_url: string;
  link_url: string;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  target_country?: string | null;
  target_audience: AdAudience | string;
  impressions: number;
  clicks: number;
  created_by_employee_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface PushBroadcast {
  id: number;
  title: string;
  body: string;
  target_type: "all" | "league" | string;
  target_value?: string | null;
  sent_count: number;
  failed_count: number;
  sent_by_employee_id?: number | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export type PremiumTier = "FREE" | "PREMIUM" | "DISABLED";

export interface PremiumFeature {
  feature_key: string;
  feature_label: string;
  tier: PremiumTier | string;
  updated_at?: string | null;
  updated_by?: string | null;
}

// --- Phase 6: Feature Flags, Release, Incidents, Security, System Health ---

export type FlagAudience = "ALL" | "FREE" | "PREMIUM" | "BETA" | "CUSTOM_SEGMENT";
export type FlagStage = "STAGING" | "PRODUCTION";

export interface FeatureFlag {
  flag_key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  rollout_percentage: number;
  audience: FlagAudience | string;
  stage: FlagStage | string;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface ReleaseConfig {
  current_version?: string | null;
  minimum_supported_version?: string | null;
  forced_update: boolean;
  changelog?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

export type IncidentSeverity = "minor" | "major" | "critical";
export type IncidentStatus = "OPEN" | "MONITORING" | "RESOLVED";

export interface Incident {
  id: number;
  title: string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  affected_systems?: string | null;
  responsible_employee_id?: number | null;
  actions_taken?: string | null;
  postmortem?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface AdminSession {
  token: string;
  employee_id: number;
  employee_name: string;
  employee_login: string;
  created_at?: string | null;
  expires_at?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

export interface FailedLoginAttempt {
  login: string;
  ip?: string | null;
  attempted_at?: string | null;
}

export interface SystemHealth {
  apiUsage: Record<string, unknown>[];
  pendingJobs: { footballDailyPipeline: number; footballMatchSettlement: number };
  appStatus: Record<string, unknown>;
  database: { sizeBytes: number; largestTables: { table: string; rows: number }[] };
  openTicketCount: number;
  openIncidentCount: number;
}

export interface SystemAuditReport {
  generatedAt: string;
  criticalCount: number;
  warningCount: number;
  critical: string[];
  warnings: string[];
  sections: Record<string, string[]>;
  reportText: string;
}

export interface PermissionsCatalog {
  allPermissions: string[];
  roleDefaults: Record<string, string[]>;
  roles: string[];
}

export interface ModuleControl {
  module_key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  enforced_in_backend: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface SystemAuditRun {
  id: number;
  critical_count: number;
  warning_count: number;
  report_text: string;
  generated_at?: string | null;
}

/** PHÖNIX Account System - row shape from GET /api/admin/control-center/users (raw SQL column names; UI translates, never shows them raw). */
export interface PhoenixUser {
  id: number;
  phoenix_user_id: string;
  account_type: "USER" | "EMPLOYEE" | "OWNER" | string;
  email: string;
  email_verified: boolean;
  username?: string | null;
  display_name?: string | null;
  account_status:
    | "PENDING_EMAIL_VERIFICATION"
    | "ACTIVE"
    | "SUSPENDED"
    | "PERMANENTLY_SUSPENDED"
    | "DELETION_PENDING"
    | "DELETED"
    | string;
  created_at: string;
  last_active_at?: string | null;
  has_premium?: boolean;
  has_active_ban?: boolean;
  [key: string]: unknown;
}

export interface PhoenixUserListResponse {
  users: PhoenixUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface PhoenixUserSession {
  token: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  device_model?: string | null;
  platform?: string | null;
  app_version?: string | null;
}

export interface PhoenixUserPremiumEntitlement {
  id: number;
  source: "GOOGLE_PLAY" | "WEBSITE" | "MANUAL" | "PROMOTION" | "STAFF" | "PARTNER" | string;
  active: boolean;
  tier?: string | null;
  starts_at: string;
  expires_at?: string | null;
  auto_renew: boolean;
  cancelled_at?: string | null;
  provider_product_id?: string | null;
  reason?: string | null;
  created_at: string;
  granted_by_employee_id?: number | null;
  granted_by_name?: string | null;
}

export interface PhoenixUserBan {
  id: number;
  case_number: string;
  status: "ACTIVE" | "LIFTED" | "EXPIRED" | string;
  reason: string;
  internal_report: string;
  duration_type: "1_HOUR" | "24_HOURS" | "7_DAYS" | "30_DAYS" | "CUSTOM" | "PERMANENT" | string;
  expires_at?: string | null;
  refund_decision?: string | null;
  refund_reason?: string | null;
  support_ticket_id?: number | null;
  created_at: string;
  created_by_name?: string | null;
  lifted_at?: string | null;
  lifted_by_name?: string | null;
  lift_reason?: string | null;
}

export interface PhoenixUserSupportTicketRef {
  id: number;
  category: string;
  priority: string;
  status: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

export interface PhoenixUserDetailResponse {
  user: PhoenixUser;
  sessions: PhoenixUserSession[];
  premiumEntitlements: PhoenixUserPremiumEntitlement[];
  bans: PhoenixUserBan[];
  supportTickets: PhoenixUserSupportTicketRef[];
}

/** GET /api/football/performance response shape - all numbers computed server-side over the full filtered dataset (never a paginated row subset). */
export interface PerformanceSummary {
  sampleSize: number;
  withTip: number;
  pending: number;
  won: number;
  lost: number;
  push: number;
  hitRatePercent: number | null;
  stakedUnits: number;
  profitUnits: number;
  roiPercent: number | null;
  yieldPercent: number | null;
  avgOdds: number | null;
  avgValuePercent: number | null;
}

export interface PerformanceByMarket {
  marketKey: string;
  marketLabel: string;
  won: number;
  lost: number;
  push: number;
  sampleSize: number;
  hitRatePercent: number | null;
  profitUnits: number;
  roiPercent: number | null;
  yieldPercent: number | null;
  avgOdds: number | null;
}

export interface PerformanceTimeSeriesPoint {
  period: string;
  won: number;
  lost: number;
  push: number;
  tipCount: number;
  hitRatePercent: number | null;
  roiPercent: number | null;
  yieldPercent: number | null;
  profitUnits: number;
  avgOdds: number | null;
  avgValuePercent: number | null;
}

export interface PerformanceAggregateResponse {
  summary: PerformanceSummary;
  previousPeriod?: PerformanceSummary;
  byMarket?: PerformanceByMarket[];
  timeSeries?: PerformanceTimeSeriesPoint[];
}

export type DataCoverageStatus = "available" | "partial" | "missing" | "unknown";

export interface DataCoverageCategory {
  coveragePercent: number;
  status: DataCoverageStatus;
  withCount?: number;
  withoutCount?: number;
}

export interface DataCoverageResponse {
  sampleSize: number;
  overallCoveragePercent: number | null;
  lastUpdated: string | null;
  categories: Record<string, DataCoverageCategory>;
}

export type LeagueMarketStatus =
  | "NOT_ENOUGH_DATA"
  | "GLOBAL_ONLY"
  | "LEAGUE_ADAPTATION"
  | "CHALLENGER_READY"
  | "SHADOW_ACTIVE"
  | "CHAMPION_ACTIVE";

export const LEAGUE_MARKET_STATUS_LABEL: Record<LeagueMarketStatus, string> = {
  NOT_ENOUGH_DATA: "Zu wenig Daten",
  GLOBAL_ONLY: "Nur globales Modell",
  LEAGUE_ADAPTATION: "Liga-Anpassung möglich",
  CHALLENGER_READY: "Herausforderer bereit",
  SHADOW_ACTIVE: "Shadow-Test aktiv",
  CHAMPION_ACTIVE: "Liga-Champion aktiv",
};

export interface LeagueMarketModelRef {
  id: number;
  readableVersion: string;
}

export interface LeagueLearningMarket {
  market: string;
  marketLabel: string;
  sampleSize: number;
  // Section 14 (AN2): Schwellenwert für den Übergang aus "Nur globales
  // Modell"/"Zu wenig Daten" zur liga-spezifischen Anpassung - reale
  // Backend-Konfiguration (leagueAdaptationSampleThreshold), kein Frontend-Wert.
  sampleThreshold?: number | null;
  status: LeagueMarketStatus | string;
  champion: LeagueMarketModelRef | null;
  bestChallenger: LeagueMarketModelRef | null;
  challengerCount: number;
}

export interface LeagueTeamRow {
  id: string;
  name: string;
  logo: string | null;
  stored_matches: number;
  analyzed_matches: number;
  tips_count: number;
  won: number;
  lost: number;
  staked_units: number;
  profit_units: number;
  avg_data_quality: number | null;
  hitRatePercent: number | null;
  roiPercent: number | null;
}

export interface LeagueLearningOverview {
  leagueId: string;
  leagueName: string | null;
  country: string | null;
  storedMatches: number;
  settledMatches: number;
  eligibleMatches: number;
  markets: LeagueLearningMarket[];
}

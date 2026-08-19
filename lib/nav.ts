export interface NavLeaf {
  label: string;
  href?: string;
  enabled: boolean;
}

export interface NavGroup {
  label: string;
  href?: string;
  enabled: boolean;
  children?: NavLeaf[];
}

// Full product nav tree. Only items marked `enabled: true` (and with an
// `href`) lead to a real, backend-connected page. Everything else renders
// visibly disabled with a "Bald verfügbar" badge and never navigates or
// shows placeholder data.
export const NAV_TREE: NavGroup[] = [
  { label: "Overview", href: "/overview", enabled: true },
  { label: "Operations", enabled: false },
  {
    label: "Football",
    enabled: false,
    children: [
      { label: "Matches", href: "/football/matches", enabled: true },
      { label: "Teams", href: "/football/teams", enabled: true },
      { label: "Ligen", href: "/football/leagues", enabled: true },
      { label: "Wappen & Assets", href: "/football/assets", enabled: true },
      { label: "Whitelist", href: "/football/leagues", enabled: true },
      { label: "Datenqualität", href: "/football/data-quality", enabled: true },
      { label: "Settlement", href: "/football/settlement", enabled: true },
    ],
  },
  {
    label: "Tips",
    enabled: false,
    children: [
      { label: "Empfehlungen", enabled: false },
      { label: "Ergebnisse", enabled: false },
      { label: "ROI", enabled: false },
      { label: "Marktanalyse", enabled: false },
    ],
  },
  {
    label: "Model Lab",
    enabled: false,
    children: [
      { label: "Champions", href: "/model-lab/models?status=champion", enabled: true },
      { label: "Challenger", href: "/model-lab/models?status=challenger", enabled: true },
      { label: "Shadow", href: "/model-lab/shadow", enabled: true },
      { label: "Learning", href: "/model-lab/learning", enabled: true },
      { label: "Reviews", href: "/model-lab/reviews", enabled: true },
      { label: "Versionen", href: "/model-lab/models", enabled: true },
      { label: "Run History", href: "/model-lab/learning-runs", enabled: true },
    ],
  },
  {
    label: "Users",
    enabled: false,
    children: [
      { label: "Geräte", href: "/users/devices", enabled: true },
      { label: "Premiumstatus", enabled: false },
      { label: "Sessions", enabled: false },
      { label: "Sperren", enabled: false },
      { label: "Supportbezug", enabled: false },
    ],
  },
  {
    label: "Support",
    enabled: false,
    children: [
      { label: "Tickets", href: "/support/tickets", enabled: true },
      { label: "Bugs", href: "/support/tickets?category=bug", enabled: true },
      { label: "Premiumfälle", href: "/support/tickets?category=premium", enabled: true },
      { label: "Nutzerfragen", href: "/support/tickets?category=frage", enabled: true },
    ],
  },
  {
    label: "Communication",
    enabled: false,
    children: [
      { label: "E-Mail", enabled: false },
      { label: "Push", enabled: false },
      { label: "Systemmeldungen", enabled: false },
    ],
  },
  {
    label: "Content",
    enabled: false,
    children: [
      { label: "News", enabled: false },
      { label: "Hilfe/FAQ", enabled: false },
    ],
  },
  {
    label: "Advertising",
    enabled: false,
    children: [
      { label: "Kampagnen", enabled: false },
      { label: "Werbeflächen", enabled: false },
      { label: "Assets", enabled: false },
      { label: "Statistiken", enabled: false },
    ],
  },
  {
    label: "Premium",
    enabled: false,
    children: [
      { label: "Google Play", enabled: false },
      { label: "Entitlements", enabled: false },
      { label: "Feature Matrix", enabled: false },
      { label: "Aktionen", enabled: false },
      { label: "Manuelle Premiumrechte", enabled: false },
    ],
  },
  {
    label: "App Control",
    enabled: false,
    children: [
      { label: "App Status", href: "/app-control/status", enabled: true },
      { label: "Module", enabled: false },
      { label: "Feature Flags", enabled: false },
      { label: "Wartungsmodus", enabled: false },
      { label: "Rollouts", enabled: false },
      { label: "Staging", enabled: false },
      { label: "Mindestversion", enabled: false },
    ],
  },
  {
    label: "Infrastructure",
    enabled: false,
    children: [
      { label: "API Usage", href: "/infrastructure/api-usage", enabled: true },
      { label: "Jobs", href: "/infrastructure/jobs", enabled: true },
      { label: "Railway", enabled: false },
      { label: "Database", enabled: false },
      { label: "Storage", enabled: false },
      { label: "Backups", enabled: false },
      { label: "System Health", enabled: false },
    ],
  },
  {
    label: "Administration",
    enabled: false,
    children: [
      { label: "Mitarbeiter", href: "/administration/employees", enabled: true },
      { label: "Rechte", enabled: false },
      { label: "Online Status", enabled: false },
      { label: "Security", enabled: false },
      { label: "Audit Log", href: "/administration/audit-log", enabled: true },
    ],
  },
  {
    label: "System Audit",
    enabled: false,
    children: [
      { label: "Monatsbericht", enabled: false },
      { label: "Historie", enabled: false },
    ],
  },
];

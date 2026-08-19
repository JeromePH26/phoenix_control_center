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
      { label: "Champions", enabled: false },
      { label: "Challenger", enabled: false },
      { label: "Shadow", enabled: false },
      { label: "Learning", enabled: false },
      { label: "Reviews", enabled: false },
      { label: "Versionen", enabled: false },
      { label: "Run History", enabled: false },
    ],
  },
  {
    label: "Users",
    enabled: false,
    children: [
      { label: "Nutzer", enabled: false },
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
      { label: "Tickets", enabled: false },
      { label: "Bugs", enabled: false },
      { label: "Premiumfälle", enabled: false },
      { label: "Nutzerfragen", enabled: false },
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
      { label: "App Status", enabled: false },
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
      { label: "API Usage", enabled: false },
      { label: "Jobs", enabled: false },
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

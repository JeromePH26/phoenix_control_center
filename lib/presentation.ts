/**
 * Human-readable labels for values that are intentionally stored as stable
 * technical keys in the API/database.  Keep these keys out of the UI.
 */
const labels: Record<string, string> = {
  completed: "Fertig",
  running: "Läuft",
  failed: "Fehlgeschlagen",
  pending: "Wartet",
  skipped: "Übersprungen",
  orphaned: "Abgebrochen – Prozess nicht mehr aktiv",
  manual: "Manuell gestartet",
  scheduled: "Automatisch nach Zeitplan",
  auditing_eligibility: "Lernfähigkeit wird geprüft",
  loading_whitelist: "Freigegebene Ligen werden geladen",
  processing_league_markets: "Ligen und Märkte werden ausgewertet",
  settling_predictions: "Vorhersagen werden abgerechnet",
  champion: "Aktives Champion-Modell",
  challenger: "Herausforderer-Modell",
  retired: "Archiviert",
  rejected: "Abgelehnt",
  global_baseline: "Globales Basismodell",
  weight_variant: "Gewichtsvariante",
  promotion: "Zum Champion befördert",
  promotion_rejected: "Beförderung abgelehnt",
  rollback: "Rollback durchgeführt",
  walk_forward: "Test an vergangenen Spielen",
  holdout: "Unabhängiger Abschlusstest",
  shadow: "Live-Vergleich zum Champion",
  monthly_review: "Monatliche Überprüfung",
  footballLeague: "Ligen",
  footballTeam: "Teams",
  footballMatch: "Spiele",
  modelVersion: "Modelle",
  learningRun: "Learning-Läufe",
  newsArticle: "Beiträge",
  employee: "Mitarbeitende",
  oneXTwo: "Ergebnis (1X2)",
  "1x2": "Ergebnis (1X2)",
  homeWin: "Heimsieg",
  draw: "Unentschieden",
  awayWin: "Auswärtssieg",
  over15: "Über 1,5 Tore",
  under15: "Unter 1,5 Tore",
  over25: "Über 2,5 Tore",
  under25: "Unter 2,5 Tore",
  over35: "Über 3,5 Tore",
  under35: "Unter 3,5 Tore",
  bttsYes: "Beide Teams treffen – Ja",
  bttsNo: "Beide Teams treffen – Nein",
  over_under_1_5: "Über/Unter 1,5 Tore",
  over_under_2_5: "Über/Unter 2,5 Tore",
  over_under_3_5: "Über/Unter 3,5 Tore",
  btts: "Beide Teams treffen",
  home_team_over_1_5: "Heimteam über 1,5 Tore",
  home_team_under_1_5: "Heimteam unter 1,5 Tore",
  away_team_over_1_5: "Auswärtsteam über 1,5 Tore",
  away_team_under_1_5: "Auswärtsteam unter 1,5 Tore",
  home_team_over_2_5: "Heimteam über 2,5 Tore",
  home_team_under_2_5: "Heimteam unter 2,5 Tore",
  away_team_over_2_5: "Auswärtsteam über 2,5 Tore",
  away_team_under_2_5: "Auswärtsteam unter 2,5 Tore",
  double_chance_1x: "Doppelte Chance 1X",
  double_chance_x2: "Doppelte Chance X2",
  draw_no_bet_home: "Draw No Bet Heim",
  draw_no_bet_away: "Draw No Bet Auswärts",
};

/** Safe fallback for a previously unknown API key. */
export function humanizeCode(value: unknown, empty = "–"): string {
  if (value === null || value === undefined || value === "") return empty;
  const key = String(value);
  if (labels[key]) return labels[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function runStatusLabel(status: unknown): string {
  return humanizeCode(status);
}

export function learningRunStepLabel(step: unknown): string {
  return humanizeCode(step, "Noch nicht gestartet");
}

export function triggerLabel(trigger: unknown): string {
  return humanizeCode(trigger);
}

export function searchTypeLabel(type: unknown): string {
  return humanizeCode(type, "Treffer");
}

export function marketLabel(market: unknown): string {
  return humanizeCode(market, "–");
}

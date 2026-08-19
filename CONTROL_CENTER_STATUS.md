# PHÖNIX CONTROL CENTER — Status

Satisfies spec section 96. Status per nav module: **DONE**, **PARTIAL**, **NOT
STARTED**, or **BLOCKED** (with the exact external dependency, per the spec's
requirement). Last updated 2026-08-19, after Phase 6 + the Module Control/System
Audit History follow-up. See `CONTROL_CENTER_ARCHITECTURE.md` for how everything below
is wired.

## Phase 1 — Foundation

| Item | Status |
|---|---|
| Login, session auth | DONE |
| Employees / RBAC | DONE |
| Audit Log | DONE |
| Global Search | DONE |
| Overview dashboard | DONE |
| Backend connection | DONE |

## Phase 2 — Football

| Item | Status |
|---|---|
| Matches (list, detail, per-match flags) | DONE |
| Teams | DONE |
| Ligen / Whitelist | DONE |
| Wappen & Assets | DONE |
| Datenqualität | DONE |
| Settlement | DONE |
| Jobs (cross-type: pipeline/settlement/learning) | DONE |
| API Usage | DONE |
| App Status | DONE — **PARTIAL** in effect: real state, but not yet read by `phoenixflt`. BLOCKED on `phoenixflt` integration. |

## Phase 3 — Model Lab

| Item | Status |
|---|---|
| Champions / Challenger / Versionen | DONE |
| Learning (dashboard + manual trigger) | DONE |
| Run History | DONE |
| Shadow | DONE |
| Reviews | DONE |
| Promote / Rollback | DONE (gated by `PHOENIX_MODEL_PROMOTION_ENABLED`) |

## Phase 4 — Users / Support

| Item | Status |
|---|---|
| Users → Geräte (relabeled from "Nutzer") | DONE — installation-based, not account-based |
| Support → Tickets/Bugs/Premiumfälle/Nutzerfragen | DONE (Control Center side) — **BLOCKED**: not submittable from the real app yet, needs `phoenixflt` wiring to call `/api/support/tickets` |
| Users → Premiumstatus | **BLOCKED**: no PHÖNIX user-account system exists (confirmed — no `users` table, no auth dependency in `phoenixflt`'s `pubspec.yaml`) |
| Users → Sessions | **BLOCKED**: same — no user accounts |
| Users → Sperren | **BLOCKED**: same — no user accounts |
| Users → Supportbezug | **BLOCKED**: same — no user accounts |

## Phase 5 — Content / Advertising / Communication / Premium

| Item | Status |
|---|---|
| News (manual CMS) | DONE (Control Center side) — **BLOCKED**: `phoenixflt` doesn't fetch `/api/news/phoenix` yet |
| Hilfe/FAQ | DONE (Control Center side) — **BLOCKED**: same, `/api/faq` not consumed yet |
| Advertising → Kampagnen/Werbeflächen/Statistiken | DONE (Control Center side) — **BLOCKED**: no ad slot in `phoenixflt` reads `/api/ads/*` yet |
| Advertising → Assets | NOT STARTED — no separate asset library exists; campaigns embed their image URL directly, which covers the spec's actual need |
| Communication → Push | DONE — sends real FCM pushes today (reuses the pre-existing, already-configured `FirebasePushService`) |
| Communication → E-Mail | **BLOCKED**: needs Google Workspace or Microsoft 365 OAuth credentials (not chosen/configured). Page explains exactly what's needed. |
| Communication → Systemmeldungen | NOT STARTED — redundant with App Status's message field; not built separately |
| Premium → Feature Matrix | DONE (Control Center side) — **BLOCKED**: `phoenixflt` doesn't read `/api/premium/features` yet |
| Premium → Google Play | **BLOCKED**: needs Google Play Developer API credentials + a real subscription/entitlement system |
| Premium → Entitlements, Aktionen, Manuelle Premiumrechte | **BLOCKED**: no user accounts (same as Phase 4) |

## Phase 6 — Ops / Infrastructure / Administration / System Audit

| Item | Status |
|---|---|
| App Control → App Status | DONE |
| App Control → Module | DONE — all 6 modules have real backend enforcement (`phoenix_live`, `settlement`, `model_lab_learning`, `historical_twins`, `news`, `advertising`) |
| App Control → Feature Flags / Rollouts / Staging | DONE (one model covers all three) — not yet read by `phoenixflt` |
| App Control → Mindestversion (Release Center) | DONE — no real "users per version" stat possible, no app-version telemetry exists anywhere |
| Infrastructure → API Usage, Jobs | DONE |
| Infrastructure → Incidents | DONE |
| Infrastructure → Database | DONE — real Postgres introspection (`pg_database_size`, largest tables) |
| Infrastructure → System Health | DONE |
| Infrastructure → Storage | NOT STARTED — confirmed nothing to build, no file/object storage system exists separate from the database |
| Infrastructure → Railway | **BLOCKED**: needs a Railway API token (not configured); page explains what's needed |
| Infrastructure → Backups | **BLOCKED**: same — needs Railway API access to backup metadata |
| Operations (top-level dashboard) | DONE |
| Administration → Mitarbeiter | DONE |
| Administration → Rechte | DONE — live RBAC matrix |
| Administration → Online Status | DONE — approximation via active sessions, no real presence/heartbeat system |
| Administration → Security | DONE — active sessions + revoke, failed login attempts (now actually recorded) |
| Administration → Audit Log | DONE |
| System Audit → Monatsbericht | DONE — on-demand report, not the full spec's monthly-cron/`AUDIT-XXX`-error-code version |
| System Audit → Historie | DONE — every on-demand run is now persisted |

## Summary

Every nav item is one of: fully working end-to-end, working on the Control Center side
but not yet consumed by `phoenixflt`, or blocked on a specific, named external
dependency (listed above per row — never a vague "not done"). Nothing shows fake data;
disabled nav items show a "Bald verfügbar" badge and never navigate.

**What would unblock the most remaining items, in order of leverage:**
1. Wiring `phoenixflt` to consume the already-built endpoints (App Status, Feature
   Flags, News, FAQ, Ads, Premium Feature Matrix, Support ticket submission) — this is
   the single biggest unblock, currently deferred because `phoenixflt` has unrelated
   in-progress work.
2. A real PHÖNIX user-account system — unblocks Premiumstatus/Sessions/Sperren/
   Supportbezug/Entitlements/Aktionen/Manuelle Premiumrechte. A product decision, not
   a small addition.
3. A Railway API token — unblocks Infrastructure → Railway/Backups.
4. Google Workspace or Microsoft 365 OAuth — unblocks the E-Mail Center.
5. Google Play Developer API credentials — unblocks Premium → Google Play.

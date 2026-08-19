# PHÖNIX CONTROL CENTER — Architecture

Internal admin web app for PHÖNIX. Built per the spec in
`C:\Users\Justin\Desktop\ANWEISUNGEN CLAUDE\anweisungen claude.txt` (101 sections).
This document satisfies spec section 95.

## Overview

```
PHÖNIX Flutter Android App (phoenixflt)
        │
        ▼
phoenix_backend (Dart/shelf, Railway)
        │
        ▼
PostgreSQL
        ▲
        │
PHÖNIX CONTROL CENTER (this repo, Next.js, Railway)
```

Two independent repos, two independent deployments:

- **`phoenix_control_center`** (this repo) — Next.js 14 App Router, TypeScript, Tailwind.
  Deployed on Railway project `stellar-achievement`, service `stellar-achievement`
  (auto-named after the project; not renamed for clarity, the Railway CLI doesn't
  expose a rename). Public URL:
  `https://stellar-achievement-production-954b.up.railway.app`. **Not** git-connected
  on Railway — deploys are manual (`railway up` from this directory, already linked).
- **`phoenix_backend`** — Dart/shelf, unchanged pre-existing repo. Deployed on Railway
  project `athletic-heart`, service `energetic-peace` (the `phoenix_backend` service in
  that same project is a **cron job**, not a duplicate web service — don't delete it).
  Public URL: `https://energetic-peace-production-b6f2.up.railway.app`. **Is**
  git-connected — every push to `main` auto-deploys.

The Control Center never talks to Postgres directly. Every read/write goes through a
Next.js Route Handler (`app/api/**/route.ts`), which calls the backend server-side. No
backend token or database credential is ever sent to the browser.

## Auth (two independent mechanisms on `phoenix_backend`)

1. **Control-Center session auth** — `admin_employees` / `admin_sessions` /
   `admin_audit_log` tables. bcrypt password hashes. Login issues an opaque session
   token, stored in an httpOnly cookie `phoenix_cc_session` on the frontend. Guarded by
   `ControlCenterAuthGuard` (`lib/src/control_center/control_center_auth_guard.dart`).
   Covers everything under `/api/admin/control-center/*`
   (`lib/src/api/control_center_routes.dart`).
2. **Legacy static admin token** — a single shared `PHOENIX_ADMIN_TOKEN` Bearer token,
   pre-dating the Control Center. Still used unchanged by `/api/admin/football/*` and
   `/api/admin/model-lab/*` (`lib/src/api/routes.dart`, `model_lab_routes.dart`) — the
   same secret the Flutter Model Lab admin screen uses. Constant-time compared via
   `_isAdmin()`.

A **break-glass recovery** endpoint exists for when nobody can log in:
`POST /api/admin/control-center/employees/<login>/reset-password`
(`{"newPassword": "..."}`, min 8 chars), gated by `PHOENIX_ADMIN_TOKEN` (not session
auth, deliberately — it must work even with zero valid sessions). Revokes all of that
employee's sessions on use.

Public, app-facing (no admin token, no session) endpoints follow one convention: an
`x-phoenix-installation-id` header (reads) or an `installationId` body field (writes),
validated as ≥16 characters. Used by `/api/push/*` (pre-existing) and `/api/support/*`
(new). Nothing in `phoenixflt` calls the new ones yet — see "What's not wired into the
app" below.

## RBAC

Six roles: `OWNER`, `ADMIN`, `TECHNICAL`, `SUPPORT`, `CONTENT`, `MARKETING`
(`lib/src/control_center/permissions.dart`). `OWNER` always has every permission,
un-overridable. Every other role has a default permission set
(`kRoleDefaultPermissions`), which an `OWNER`/`ADMIN` can override per-employee via
`permission_overrides` (a JSONB map on `admin_employees`, `true`/`false` per
permission key, checked in `hasPermissionForRole()`).

Permission keys follow `<area>.view` / `<area>.manage`: `employees`, `audit`, `search`,
`overview`, `apiUsage`, `jobs`, `appControl`, `devices`, `support`, `news`, `faq`,
`advertising`, `push` (manage only — sending a broadcast is one action), `premium`,
`featureFlags`, `release`, `incidents`, `security`, `systemHealth` (view only). Live,
authoritative list: `GET /api/admin/control-center/permissions/catalog` (any
authenticated employee can read it — it's RBAC structure, not sensitive data), surfaced
in the UI at `Administration → Rechte`.

Role-to-area mapping (each role's *actual job* in this app):

| Role | Owns |
|---|---|
| ADMIN | everything |
| TECHNICAL | ops/infra: apiUsage, jobs, appControl, devices (view), support (view), featureFlags, release, incidents, security (view), systemHealth |
| SUPPORT | devices, support (view+manage) |
| CONTENT | news, faq (view+manage) |
| MARKETING | advertising, push (view+manage) |

Every admin route checks `auth.employee!.hasPermission('<key>')` before doing
anything; unauthorized → 403. Never a frontend-only hide.

## Database tables (all in the same Postgres as the rest of PHÖNIX — additive only)

Grouped by the Dart migration method that creates them (`lib/src/database/database.dart`,
run via `PhoenixDatabase.migrate()` on every server boot, all `CREATE TABLE IF NOT EXISTS`):

- `_migrateControlCenter`: `admin_employees`, `admin_sessions`, `admin_audit_log`,
  `app_control_state` (single-row app-wide ACTIVE/MAINTENANCE/DISABLED + message).
- `_migrateSupport`: `support_tickets`, `support_ticket_messages` — keyed on
  `installation_id`, not a user id (see "No user accounts" below).
- `_migrateContent`: `phoenix_editorial_articles` (manual News CMS — deliberately
  separate from the pre-existing `news_articles`, which is the imported-publisher +
  auto-generated-match-report feed via `PhoenixEditorialComposer`, untouched),
  `phoenix_faq_articles`, `ad_campaigns` (3 fixed slots), `push_broadcasts`,
  `premium_feature_matrix`.
- `_migrateOps`: `feature_flags` (also covers Rollouts/Staging — a flag's own `stage`
  field is its staging state), `app_release_config` (single-row current/minimum
  version), `incidents`, `admin_failed_logins` (written from `POST /auth/login` on
  both failure paths).
- `_migrateModuleControl`: `module_control` — per-subsystem enable/disable, see
  "Module enforcement" below.
- `_migrateSystemAuditHistory`: `system_audit_runs` — every `/system-audit` call
  persists its result here.

Everything here is additive; no existing PHÖNIX table was altered destructively, no
data was deleted or truncated (per the spec's hard rule).

## Admin API surface

Two mount points on `phoenix_backend`, both under the shared `/api/admin/` prefix:

- `/api/admin/control-center/*` — everything this project added, session-authed. See
  `lib/src/api/control_center_routes.dart` for the full route list (60+ handlers).
- `/api/admin/football/*`, `/api/admin/model-lab/*` — pre-existing, legacy-token-authed,
  unchanged. The Control Center's Football and Model Lab UI proxy these directly
  (`lib/legacyBackend.ts` on the frontend) rather than duplicating them under
  control-center session auth — same data, same write path, no divergence risk.

Every Next.js Route Handler under `app/api/**` is a thin proxy: check the session
cookie is present (401 if not), forward to the backend with the appropriate auth, pass
the response straight through. No business logic lives in the frontend.

## Feature Flags

`feature_flags` table: `flag_key`, `label`, `enabled`, `rollout_percentage` (0-100),
`audience` (ALL/FREE/PREMIUM/BETA/CUSTOM_SEGMENT), `stage` (STAGING/PRODUCTION). One
row covers what the spec describes as three separate nav concepts (Feature Flags,
Rollouts, Staging) — a flag's `stage` field *is* its staging state, no separate
draft/publish object was needed. Admin UI: `App Control → Feature Flags` (same page
also serves the Rollouts/Staging nav leaves). Not yet read by `phoenixflt` or any
backend code path — this is server-side config storage only, ready to be consumed.

## Module enforcement (Section 40)

`module_control` table, seeded with 6 modules, **all 6 now enforced**. Each row has
`enforced_in_backend`: whether disabling it actually stops backend work, or is
(honestly) just a stored preference with no enforcement — currently always `TRUE`,
kept as a column rather than removed so a future module can be added un-enforced
without lying about it.

| Module | What disabling it does |
|---|---|
| `phoenix_live` | Stops `FootballFavoriteLiveMonitor.runOnce()` — the only continuous polling loop in the backend (5s interval, real API-Football cost) |
| `settlement` | `POST /api/admin/football/settle` and `/matches/settle` return 503 |
| `model_lab_learning` | `POST /api/admin/model-lab/learning-runs/start` returns 503 |
| `historical_twins` | `GET /api/football/historical-twins/<id>` returns 503 |
| `news` | `GET /api/news/phoenix` (the manual CMS feed only, not the pre-existing imported `/api/news`) returns an empty list |
| `advertising` | `GET /api/ads/<slot>` returns an empty campaign list for every slot |

Check `database.moduleEnabled('<key>')` before adding new enforcement points; never
mark a module `enforced_in_backend = TRUE` without an actual corresponding check
somewhere in `phoenix_backend`.

## Audit

Two separate audit logs, both append-only (no delete endpoint, no update endpoint —
`reverted`/`reverted_at` columns exist on `admin_audit_log` for future undo-tracking
but nothing currently sets them):

- `admin_audit_log` — every Control-Center admin action (`database.insertAdminAuditLog`).
  `area`/`objectType`/`objectId`/`action`/`previousValue`/`newValue`/`reason`/`comment`/`ip`.
  Viewable at `Administration → Audit Log`.
- The pre-existing, separate Model Lab audit log (`lib/src/database` model-lab audit
  methods, `/api/admin/model-lab/audit-log`) — untouched, not surfaced in the Control
  Center UI yet (only Promote/Rollback actions from the Control Center model detail
  page write to it, via the legacy Model Lab endpoints themselves).

## Learning integration

The Control Center's `Model Lab` section is a **pure frontend proxy** to the
already-complete `/api/admin/model-lab/*` backend (the same one the Flutter Model Lab
admin screen already used) — zero backend changes were needed for Phase 3. Promote/
Rollback are gated server-side by `PHOENIX_MODEL_PROMOTION_ENABLED` (default `false`),
shown as a banner in the UI when disabled, never silently hidden.

## Deployment

| | Frontend | Backend |
|---|---|---|
| Host | Railway `stellar-achievement` | Railway `athletic-heart` / `energetic-peace` |
| Deploy trigger | Manual `railway up` | Automatic on `git push` to `main` |
| Public URL | stellar-achievement-production-954b.up.railway.app | energetic-peace-production-b6f2.up.railway.app |

Frontend env vars (`railway variables` on the `stellar-achievement` service):
`PHOENIX_BACKEND_URL`, `PHOENIX_ADMIN_TOKEN` (mirrors the value already set on the
backend). Backend env vars relevant here: `PHOENIX_ADMIN_TOKEN`,
`PHOENIX_CC_BOOTSTRAP_OWNER_LOGIN/EMAIL/PASSWORD` (one-time bootstrap, removed after
first use), `FIREBASE_PROJECT_ID` / `FIREBASE_SERVICE_ACCOUNT_JSON` (real push — already
configured, reused for News/Push Center pushes), `PHOENIX_MODEL_PROMOTION_ENABLED`.

## Secrets

Never in the database, never in git, never sent to the browser. `PHOENIX_ADMIN_TOKEN`
lives only in Railway env vars on both services and in each repo's local
`.env.local` (gitignored) for development. When this project needed to set it on the
frontend service, it was piped in via shell substitution
(`railway variables --set "PHOENIX_ADMIN_TOKEN=$(grep ... .env.local)"`) so the value
never appeared in any tool output or transcript — use that pattern for any future
secret handling here.

## Emergency procedures

- **Nobody can log in**: use the break-glass password reset endpoint (see "Auth"
  above), authenticated with `PHOENIX_ADMIN_TOKEN`.
- **App needs to go into maintenance**: `App Control → App Status`, set
  `MAINTENANCE` with a reason (mandatory) and optional user-facing message. **Not yet
  read by `phoenixflt`** — this sets real backend state, but the app doesn't poll it
  yet (see below).
- **PHÖNIX Live is burning API budget**: `App Control → Module`, disable `phoenix_live`
  — this is real, verified backend enforcement, takes effect within one polling cycle
  (≤5s).
- **A specific employee's access needs to be cut immediately**: `Administration →
  Security`, revoke their session(s). Disabling the employee (`Administration →
  Mitarbeiter`) also revokes all sessions and blocks future logins.

## What's not wired into `phoenixflt` (by design, not oversight)

`phoenixflt` has an unrelated, large in-progress refactor (~60 modified files touching
the engine/theme/notifications layers) and was ruled out of scope for this project.
Everything the Control Center built that's meant to eventually be *read by the app* —
`app_control_state`, `feature_flags`, `premium_feature_matrix`, `/api/news/phoenix`,
`/api/faq`, `/api/ads/*`, `/api/support/*` submission — is real, live, additive backend
state with nothing on the other end consuming it yet. This is intentional per the
spec's rule against faking a "connected" feature: build the real
UI+DB+backend, mark clearly what's not consumed yet, don't pretend.

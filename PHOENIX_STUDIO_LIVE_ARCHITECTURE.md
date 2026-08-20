# PHÖNIX Studio (Design Lab + Campaign Studio) & Live Match/Chat — Architecture

Status: **planning document only**, no implementation yet. Written per the
current spec's explicit instruction not to rush a bad production solution for
Live Chat, and to keep Studio/Chat modular and separate from the stable
pre-match analysis pipeline. Nothing here has been built; this documents the
target shape so a future session can implement it without re-deriving the
design.

## Why this isn't built yet

Both features are genuinely large (each comparable in scope to a whole new
product surface) and neither blocks anything else currently in progress.
Building either "quickly" risks exactly what the spec warns against: a
Design Lab that can leak into production, or a Chat that's a bad first cut
locking in a bad data model. This document exists so the *next* work on
either feature starts from a plan, not a blank page.

---

## 1. PHÖNIX Studio — Design Lab

### Purpose
Let a developer/designer prototype new app views (lineup card, match detail,
tip card, etc.) without touching the shipped app, then let Control Center
staff preview, compare, and eventually approve a version for rollout — all
without an app store release for content/layout changes.

### Data model (not yet created)

```
design_slots            -- the fixed catalog of "where can a design go"
  slot_key TEXT PK        -- e.g. MATCH_LINEUP, MATCH_HEADER, MATCH_ANALYSIS,
                            HOME_BANNER, PREMIUM_PROMO, LIVE_MATCH
  label TEXT               -- German display label, staff never sees slot_key
  description TEXT

design_variants          -- one row per experimental design ("Aufstellung V2")
  id BIGSERIAL PK
  slot_key TEXT REFERENCES design_slots
  name TEXT
  status TEXT              -- DRAFT | ARCHIVED | TEST_PUBLISHED | LIVE
  spec JSONB                -- the actual layout description (see below)
  created_by_employee_id BIGINT REFERENCES admin_employees
  created_at, updated_at

design_variant_versions  -- append-only version history per variant
  id BIGSERIAL PK
  variant_id BIGINT REFERENCES design_variants
  spec JSONB
  created_by_employee_id BIGINT
  created_at

design_rollouts          -- what's actually live/testing per slot
  slot_key TEXT PK REFERENCES design_slots
  live_variant_id BIGINT REFERENCES design_variants   -- what normal users see
  test_variant_id BIGINT REFERENCES design_variants   -- what test group sees
  test_audience JSONB      -- {"employeeAccounts": true, "testUserIds": [...]}
  previous_variant_id BIGINT REFERENCES design_variants -- for one-click rollback
```

**Critical design decision still open**: what `spec JSONB` actually contains.
Two real options:
1. A declarative layout DSL (rows/columns/bindings to backend data fields)
   that the Flutter app interprets at runtime — powerful, but is itself a
   small rendering-engine project.
2. A reference to a Flutter code path built by an external coding agent
   (per the spec: "Wir verwenden ChatGPT Code / Claude Code extern"), where
   `spec` just carries metadata (name, screenshots, changelog) and the
   actual UI code ships as a normal app build gated behind the rollout flag.

Option 2 is far cheaper and matches the spec's explicit note that no
in-house design DSL/AI is required — external coding tools build the actual
experimental screen, this system only tracks *which* experiment is live for
*which* slot and to *whom*. Recommend option 2 for a first version.

### API surface (sketch)
- `GET/POST /api/admin/control-center/design/variants`
- `GET/PATCH /api/admin/control-center/design/variants/<id>` (archive/duplicate/rename)
- `POST /api/admin/control-center/design/rollouts/<slotKey>` (set test/live variant, mandatory reason, audit-logged)
- `GET /api/app/design/rollout/<slotKey>` — public, app calls this to know which variant to render for the current installation/account (test audience match server-side, never trust the client)

### Permission model
New `design.view` / `design.manage` / `design.publish` permissions, same
pattern as `premium.manualGrant` vs `premium.view` — publishing to all users
is a distinct, more sensitive permission from just creating drafts.

### Blocking work before this can start
None technical — this is buildable today. The open product decision is the
`spec` format above; recommend deciding that with the user before writing
any code, since it changes the whole feature's shape.

---

## 2. Campaign Studio

### Purpose
A small, PHÖNIX-specific visual editor for banners/popups/promos — not a
general design tool. Templates are fixed (Home Banner, Premium Banner,
Fullscreen Promo, Popup, News Banner, Match Banner); staff fills in
text/image/price/button, not free-form layout.

### Relationship to existing Phase 5 work
`ad_campaigns` (3 fixed slots: home_banner/match_detail_infeed/news_infeed)
**already exists** from Phase 5 — Campaign Studio is a richer authoring UI
on top of the same underlying delivery mechanism, not a separate pipeline.
Reuse `ad_campaigns`; extend it rather than building a parallel table.

### Data model additions (not yet created)

```
ALTER TABLE ad_campaigns ADD COLUMN template_key TEXT;      -- which fixed template
ALTER TABLE ad_campaigns ADD COLUMN design_payload JSONB;   -- text/image/price/button per template's fixed slots
ALTER TABLE ad_campaigns ADD COLUMN workflow_status TEXT;   -- DRAFT|PREVIEW|TEST|APPROVED|PUBLISHED
ALTER TABLE ad_campaigns ADD COLUMN button_action JSONB;    -- {"type": "openPremium"} | {"type": "openNews", "articleId": ...} | {"type": "openScreen", "route": "..."} | {"type": "openOffer", "offerId": ...}
```

`button_action.type` must be a fixed enum the app already knows how to
route (no arbitrary deep links from a content field — that's an injection
surface). Whitelist grows as new action types are actually needed.

### Stats (later phase, explicitly deferred in the spec)
`ad_campaign_impressions` / `ad_campaign_clicks` tables, append-only,
aggregated nightly rather than queried live — matches the spec's
"datenschutzfreundlich implementieren" note. Not needed for v1.

### Blocking work
None. Buildable on top of existing Phase 5 tables.

---

## 3. Live Match + Match Chat

This is the largest deferred item and the one the spec most explicitly says
not to rush. Below is the prepared foundation only.

### Live Clock model
The spec is explicit: **never fabricate seconds**. Concretely:
- Backend already polls live fixture state (`FootballFavoriteLiveMonitor`,
  gated by the `phoenix_live` module flag, 5s interval — this already
  exists and is real, not new).
- A live event carries whatever precision the data source actually gives
  (usually just `elapsed` minutes from API-Football, no seconds). The
  server should NOT interpolate seconds; if asked for a "clock anchor" it
  returns `{minuteAsOf: 58, serverTimeAsOf: <ISO>}` — the client may only
  extrapolate *within the same minute* using its own wall clock, and must
  discard/reset that local extrapolation the moment a fresher server value
  arrives. If a minute's start timestamp isn't known precisely, the UI must
  show `58'` (minute only), never a fabricated `58:37`.
- Stoppage time, halftime, ET, penalties: these are already distinct status
  codes in `football_matches.status` (`1H/HT/2H/ET/BT/P/...`) — the clock
  model keys off that status, not a single running timer.

### Match Chat data model (not yet created)

```
match_chat_rooms
  id BIGSERIAL PK
  match_id TEXT REFERENCES football_matches(id)
  room_key TEXT             -- 'global' | 'de' | 'en' | 'es' | 'pt' | 'fr' ...
  opens_at TIMESTAMPTZ       -- kickoff - configurable window (default 60 min)
  closes_read_write_at TIMESTAMPTZ  -- kickoff/end + configurable window (default +120 min after FT)
  UNIQUE (match_id, room_key)

match_chat_messages
  id BIGSERIAL PK
  room_id BIGINT REFERENCES match_chat_rooms
  user_id BIGINT REFERENCES users(id)   -- NEVER exposes real name/email, only username
  body TEXT
  status TEXT               -- VISIBLE | DELETED_BY_USER | DELETED_BY_MOD | SYSTEM
  system_event_type TEXT    -- NULL for user messages; GOAL|CARD|HALFTIME|... for system rows
  created_at TIMESTAMPTZ

match_chat_reports
  id BIGSERIAL PK
  message_id BIGINT REFERENCES match_chat_messages
  reported_by_user_id BIGINT REFERENCES users(id)
  reason TEXT
  created_at TIMESTAMPTZ
  resolved_by_employee_id BIGINT REFERENCES admin_employees
  resolution TEXT            -- NO_ACTION | MESSAGE_REMOVED | USER_TIMEOUT | USER_BANNED

chat_moderation_actions
  id BIGSERIAL PK
  scope TEXT                 -- MESSAGE | USER_ROOM_TIMEOUT | USER_MATCH_BAN | USER_GLOBAL_CHAT_BAN
  target_user_id BIGINT REFERENCES users(id)
  room_id BIGINT REFERENCES match_chat_rooms   -- NULL for global scope
  duration_type TEXT          -- same enum family as user_bans
  expires_at TIMESTAMPTZ
  created_by_employee_id BIGINT REFERENCES admin_employees
  reason TEXT
  created_at TIMESTAMPTZ

user_chat_blocks           -- user-level "mute this person for me"
  blocking_user_id BIGINT REFERENCES users(id)
  blocked_user_id BIGINT REFERENCES users(id)
  created_at TIMESTAMPTZ
  PRIMARY KEY (blocking_user_id, blocked_user_id)
```

Retention is deliberately not hardcoded above (`match_chat_messages` has no
auto-delete column yet) — the spec explicitly wants a *configurable*
retention policy decided before release, distinguishing public messages,
user-deleted messages (soft-delete, don't hard-delete — needed for
moderation history), moderation copies, and reports. This needs a legal/
product decision, not a technical one, before the schema is finalized.

### Realtime transport — the actual blocking decision

This is the one genuine technical prerequisite that doesn't exist yet:
**phoenix_backend has no WebSocket/realtime layer at all today.** Everything
current is request/response HTTP (`shelf`). Two realistic paths:

1. **Polling first** (recommended starting point): match chat and live
   ticker both already fit a "poll every few seconds while the chat/ticker
   screen is open" model, identical to the existing `FootballFavoriteLiveMonitor`
   pattern. `GET /api/app/matches/<id>/chat/<room>/messages?since=<id>` —
   cheap, no new infrastructure, works today. Ships a real, usable chat
   without waiting on a realtime rewrite.
2. **WebSockets later**, once usage numbers justify it — `shelf_web_socket`
   is a real, maintained package for this Dart stack; a later migration
   from polling to push is additive (same message table, new transport)
   rather than a rewrite, *if* the message model above is used from the
   start (it doesn't assume either transport).

Recommend building on (1) when this feature is actually started, keeping
(2) as the documented upgrade path — this satisfies "Architektur so bauen,
dass später WebSockets/skalierbare Realtime-Infrastruktur möglich ist"
without speculative infrastructure work now.

### Permission model
New `chatModeration.view` / `chatModeration.manage` permissions. Moderation
actions (remove message, timeout, room/match/global chat ban) are distinct
from `users.suspend` (full account ban) — a chat ban must never silently
also suspend the account, and vice versa (spec: "Eine komplette PHÖNIX
Kontosperre bleibt eine separate bewusste Adminaktion").

### Spam/abuse prerequisites
Rate limiting and flood protection need a place to live — recommend a
simple in-memory-per-instance token bucket keyed by `user_id` for a first
version (single backend instance today, per existing Railway setup), with
a note that this needs to move to a shared store (Redis or a Postgres
table) if/when the backend scales to multiple instances, since in-memory
rate limits don't coordinate across instances.

### Not started, correctly
No code for any of section 3 exists yet. This is intentional per the
spec's explicit instruction to prepare rather than rush this specific
feature.

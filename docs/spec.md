# Process Twin — technical spec (as-built)

Source of truth is the code; this file is a map of it, updated as Stage A/B land. Original planning artifacts (Process Twin Dossier, Process Twin Spec & Backlog) exist only as chat Artifacts from the 30.08.2026 session — this file replaces them as the in-repo reference so `CLAUDE.md`'s citation to `docs/spec.md` is real.

## Domain

Small service company (workshop / IT service / cleaning — the schema is neutral to which). Order types: `standard`, `urgent`, `premium`, `warranty`. Resources: specialists (type/qualification, hours per day), optional "requires equipment" flag on an order.

## Data model (`server/db/migrations/`)

| Table | Key columns | Notes |
|---|---|---|
| `specialists` | `id`, `name`, `specialist_type`, `hours_per_day` | |
| `orders` | `id`, `order_type` (CHECK), `required_specialist_type`, `estimated_hours`, `requires_equipment`, `created_at`, `deadline_at`, `status` (CHECK: queued/scheduled/in_progress/done/overdue) | |
| `assignments` | `id`, `order_id`, `specialist_id`, `planned_start`, `planned_end`, `created_by` (ai/human), `is_current` | Partial unique index enforces at most one `is_current=1` row per `order_id` |
| `explanations` | `id`, `assignment_id` (unique), `factors_json`, `summary_text`, `confidence`, `source` (llm/fallback), `created_at` | One per assignment; overriding creates a new assignment and thus a fresh explanation |
| `decision_log` | `id`, `order_id`, `action` (CHECK: ai_proposed/human_accepted/human_overridden), `previous_assignment_id`, `new_assignment_id`, `reason_text`, `created_at` | One row per decision; `schedule/run` logs `ai_proposed` for every assignment it creates |

## API surface (`server/routes/`)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/orders/generate` | `{count, referenceTime?}` |
| `GET` | `/api/orders` | `?status=&limit=&offset=` |
| `GET` | `/api/orders/:id/explanation` | Stage B — see below |
| `GET` | `/api/specialists` | |
| `POST` | `/api/schedule/run` | Persists the planner's output in one transaction, logs `ai_proposed` per assignment |
| `GET` | `/api/schedule` | Current board (joined assignments+orders+specialists) |
| `POST` | `/api/assignments/:id/accept` | Logs `human_accepted`; assignment unchanged. 404 unknown, 409 if already superseded |
| `POST` | `/api/assignments/:id/override` | `{specialistId, plannedStart, plannedEnd, reason?}` — supersedes the old assignment, creates a new `created_by: "human"` one, logs `human_overridden` with the reason |
| `GET` | `/api/decisions` | `?orderId=&limit=&offset=`, most recent first |
| `GET` | `/api/metrics` | `plannedOnTimeRate` / `avgProcessingHours` / `overrideRate` — see below |

## Scheduler (`server/services/schedulingService.js`)

Deterministic heuristic, not a learned model: earliest-deadline-first, with `TYPE_PRIORITY_BONUS_HOURS` (`urgent: 18`, `premium: 10`, `standard`/`warranty: 0`) pulling an order's effective deadline forward. Greedy assignment to whichever matching-type specialist is soonest available; each specialist's timeline is tracked so assignments never overlap. Known gap: ignores `hours_per_day` / working-hours boundaries.

## Explanations (`server/services/explanationService.js`, Stage B)

`GET /api/orders/:id/explanation`: 404 if the order doesn't exist or has no current assignment (not yet scheduled); otherwise returns a cached explanation or generates one.

Raw factors passed to the LLM (and used verbatim in the fallback) are computed only from real scheduler/DB data — deadline proximity, the order type's own priority bonus, the assigned specialist's identity/type, and this order's position in that specialist's queue. No invented fields (no "priority" or "VIP" column exists in `orders` — the earlier draft of this feature assumed one; the actual schema doesn't have it).

Model: `claude-opus-5` (the `claude-api` skill's mandatory default absent an explicit user request for a different model — cheaper models can be substituted deliberately if cost becomes a concern). Structured output via `client.messages.parse()` + a Zod schema (`ExplanationSchema`), not manual `JSON.parse()` of free text.

On any failure (no `ANTHROPIC_API_KEY`, network, schema mismatch), falls back to a deterministic template built from the same raw factors — `confidence: "low"`, `source: "fallback"` — and is **not** cached, so the next request retries the LLM rather than being stuck on a degraded answer.

## Override / accept (`server/services/decisionService.js`, Stage B)

Override does **not** enforce that the target specialist's `specialist_type` matches the order's `required_specialist_type` — that's deliberate: the scheduler enforces it because it has no other signal, but a human operator overriding may know something the scheduler doesn't (the whole point of human-in-the-loop). The frontend surfaces the mismatch as a warning (`OverridePlanModal.jsx`) rather than hiding it or blocking the action.

## Frontend (`web/src/`)

`pages/Dashboard.jsx` orchestrates: generate/schedule buttons, `components/OrderQueue.jsx` (unassigned orders), `components/ProcessBoard.jsx` (one column per specialist, cards clickable). Clicking a card opens `components/OverridePlanModal.jsx`, which embeds `components/ExplanationPanel.jsx` (fetches and renders the explanation, including the fallback notice when `source: "fallback"`) plus Accept and Override controls. See `docs/screenshots/`.

## Metrics (`server/services/metricsService.js`, Stage C)

The three metrics CLAUDE.md names ("% заказов в дедлайн, среднее время обработки, доля override") computed only from data this prototype actually tracks:

- `plannedOnTimeRate` — of currently-planned assignments, the share whose `planned_end` is still before the order's `deadline_at`. This is **prospective** ("is the current plan on track"), not "did the work actually finish on time" — there is no order-completion event anywhere in the app (no route ever sets `status: 'done'`), so a real on-time-completion rate isn't something this prototype can honestly report yet. Don't rename this to "on-time rate" without adding real completion tracking first.
- `avgProcessingHours` — mean `estimated_hours` across current assignments.
- `overrideRate` — `human_overridden` / `ai_proposed` decision counts, all-time (not just current assignments).

All three are `null` (never `0`) when their denominator is empty, so an empty dashboard reads as "no data" rather than a misleading 0%. `sampleSize` in the response carries the underlying counts.

`MetricsPanel.jsx` renders the three tiles; `HistoryTimeline.jsx` lists `GET /api/decisions` newest-first with the reason text when present. Both refresh alongside the rest of `Dashboard.jsx`'s state after every action (generate/schedule/accept/override).

## Demo / researcher-facing surfaces (Stage D)

`App.jsx` now holds a two-tab shell (no router — just component-swap state) between `pages/Dashboard.jsx` (the operational view) and `pages/ForResearchers.jsx` (static: research questions, architecture summary, limitations, contact — the same content as this file's summary, written for someone outside the project). `docs/demo-script.md` is the live walkthrough script; it doesn't add any code, just documents a sequence through the existing features.

## Not built yet

Nothing from the original Stage A–D plan. Anything past this is a new decision, not a backlog item — see `CLAUDE.md`'s research questions for where a next iteration (a real user study, actual completion tracking) would go.

- Demo script, "For Researchers" page (Stage D).

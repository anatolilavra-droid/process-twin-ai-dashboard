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
| `decision_log` | — | Not yet migrated (Stage B override work, not built yet) |

## API surface (`server/routes/`)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/orders/generate` | `{count, referenceTime?}` |
| `GET` | `/api/orders` | `?status=&limit=&offset=` |
| `GET` | `/api/orders/:id/explanation` | Stage B — see below |
| `GET` | `/api/specialists` | |
| `POST` | `/api/schedule/run` | Persists the planner's output in one transaction |
| `GET` | `/api/schedule` | Current board (joined assignments+orders+specialists) |

## Scheduler (`server/services/schedulingService.js`)

Deterministic heuristic, not a learned model: earliest-deadline-first, with `TYPE_PRIORITY_BONUS_HOURS` (`urgent: 18`, `premium: 10`, `standard`/`warranty: 0`) pulling an order's effective deadline forward. Greedy assignment to whichever matching-type specialist is soonest available; each specialist's timeline is tracked so assignments never overlap. Known gap: ignores `hours_per_day` / working-hours boundaries.

## Explanations (`server/services/explanationService.js`, Stage B)

`GET /api/orders/:id/explanation`: 404 if the order doesn't exist or has no current assignment (not yet scheduled); otherwise returns a cached explanation or generates one.

Raw factors passed to the LLM (and used verbatim in the fallback) are computed only from real scheduler/DB data — deadline proximity, the order type's own priority bonus, the assigned specialist's identity/type, and this order's position in that specialist's queue. No invented fields (no "priority" or "VIP" column exists in `orders` — the earlier draft of this feature assumed one; the actual schema doesn't have it).

Model: `claude-opus-5` (the `claude-api` skill's mandatory default absent an explicit user request for a different model — cheaper models can be substituted deliberately if cost becomes a concern). Structured output via `client.messages.parse()` + a Zod schema (`ExplanationSchema`), not manual `JSON.parse()` of free text.

On any failure (no `ANTHROPIC_API_KEY`, network, schema mismatch), falls back to a deterministic template built from the same raw factors — `confidence: "low"`, `source: "fallback"` — and is **not** cached, so the next request retries the LLM rather than being stuck on a degraded answer.

## Not built yet

- Human override / accept flow and `decision_log` (rest of Stage B).
- Metrics (% on-time, avg processing time, override rate) and history UI (Stage C).
- Demo script, "For Researchers" page (Stage D).

# Experiment design (draft, 31.08.2026)

**Status: this is a plan for an experiment, not an experiment that has run.** No participants have used this prototype yet. Everything below is either (a) something the current code can already measure, cited to the exact field/endpoint, or (b) something it explicitly cannot measure yet, marked as such. Nothing here is a finding.

This prototype (`process-twin-ai-dashboard`) is Stage 0: a working tool to run this kind of study on, not the study itself. See `README.md`'s "Known limitations" and `CLAUDE.md`'s anti-hallucination rules — this document follows the same discipline.

## 1. Research questions and hypotheses

Three, not more — each one is answerable from data the app already logs or can now export (`GET /api/decisions/export`), not from a wishlist of things that would be nice to know.

### RQ1 — Does a real AI-generated explanation change override behavior, compared to the deterministic fallback template?

`server/services/explanationService.js` has two explanation paths: a real Claude-generated one (`source: "llm"`) and a deterministic fallback template used when the LLM call fails (`source: "fallback"`, always `confidence: "low"`). Both are logged per-assignment (`explanations` table) and now exposed per-decision via the `explanationSource` column in `GET /api/decisions/export`.

**H1 (exploratory, not confidently directional):** Override rate differs between `source: "llm"` and `source: "fallback"` decisions. We don't have a strong prior on the direction — a real explanation could increase trust (more specific reasoning) or decrease it (if the LLM's phrasing reads as less certain, or if participants distrust "AI-generated text" more than a plain template) — so this is stated as a two-tailed question, not a one-directional bet.

**Measured as:** `overrideRate` computed separately for decisions where `explanationSource = "llm"` vs `"fallback"`, from the CSV/JSON export.

### RQ2 — Does the explanation's stated confidence level predict accept vs. override?

`ExplanationSchema.confidence` (`server/services/explanationService.js`) is `high`/`medium`/`low`, settable by the LLM itself (not just forced to `low` on fallback — a real LLM explanation can also self-report low confidence). This is now in the export as `explanationConfidence`.

**H2:** Decisions on assignments whose explanation confidence was `low` are overridden more often than ones with `high` confidence.

**Measured as:** override rate cross-tabulated by `explanationConfidence` in the export.

### RQ3 — Does deciding take longer for an override than an accept?

`avgDecisionLatencySeconds` (added 31.08.2026, `server/services/metricsService.js`) is the time between an order's `ai_proposed` decision and the first human decision that follows — computed purely from `decision_log.created_at` timestamps that were already being recorded, no new instrumentation. Per-decision latency is in the export as `decisionLatencySeconds`.

**H3:** Median `decisionLatencySeconds` is higher for `human_overridden` decisions than `human_accepted` ones — grounded in the UI itself: accepting is one click (`OverridePlanModal`'s "Accept this plan" button), while overriding requires opening the specialist dropdown, adjusting two datetime fields, and optionally typing a reason.

**Measured as:** `decisionLatencySeconds` grouped by `action` in the export.

## 2. Metrics: what's already collected vs. what would need new work

| Metric | Status | Source |
|---|---|---|
| `plannedOnTimeRate` | Collected | `GET /api/metrics` |
| `avgProcessingHours` | Collected | `GET /api/metrics` |
| `overrideRate` | Collected (see `docs/spec.md`'s caveat on re-override chains) | `GET /api/metrics` |
| `avgDecisionLatencySeconds` | Collected (added for this document) | `GET /api/metrics` |
| Per-decision explanation source/confidence, reason text | Collected (added for this document) | `GET /api/decisions/export` |
| **Subjective trust in the AI's explanation** | **Not measurable.** No self-report instrument exists anywhere in the app. This is a survey question, not something system logs can answer — a behavioral proxy (override rate) is not the same claim as "trust", and this document does not conflate them. | Would need a short post-decision or post-session questionnaire (e.g. a single-item trust rating, or an established scale like Jian et al.'s Trust in Automation) — not built. |
| **Cognitive load** | **Not measurable.** Nothing currently times sub-actions within a decision (e.g. how long the explanation panel was open before the operator touched a control) or asks the operator anything. | Would need either instrumented UI timing (open a specific event log of panel-open/first-interaction/submit timestamps) or a subjective instrument (e.g. NASA-TLX) after each task — not built. |
| **Which specific participant/session a decision belongs to** | **Not measurable — no field for it.** `decision_log` has no participant or session identifier at all. This is true anonymity by default (nothing to leak), but it also means the export cannot currently distinguish two people's decisions if they used the same running instance. | Workaround usable today, no code change: run one fresh database per participant (`server/data/*.sqlite` is already gitignored and disposable — `npm run migrate && npm run seed` gives a clean slate). Adding a `participant_id` column would let one shared instance serve multiple participants, but that's a schema change not made here. |

## 3. Experiment design (proposed, not run)

**Type:** within-subjects — each participant sees both explanation conditions, to control for individual differences given a small expected sample. Order counterbalanced (half the participants get condition A first, half get B first) to control for a learning/fatigue effect across the session.

**Task:** the participant runs the existing demo flow — generate synthetic orders, run the scheduler, then work through each scheduled order deciding accept or override — for a fixed batch of orders (`docs/demo-script.md` already uses ~25 orders as a workable batch size for a single sitting; reuse that unless it proves too long in a pilot).

**Conditions (IV):**
- **A — real explanation:** normal operation, `ANTHROPIC_API_KEY` set, `explanationService` calls the LLM.
- **B — fallback-only:** `ANTHROPIC_API_KEY` unset (or deliberately invalid) for that session, so every explanation is the deterministic template.

**Gap to flag honestly:** there is currently no supported way to force condition B for one specific session while leaving A available for the next one without restarting the server with a different environment variable — that's an operational step (stop server, unset `ANTHROPIC_API_KEY`, restart), not a UI toggle. Workable for a researcher running sessions one at a time, but worth knowing before scheduling back-to-back participants.

**DV:** `overrideRate` (RQ1/RQ2), `decisionLatencySeconds` (RQ3), both pulled from `GET /api/decisions/export` after each session, one export per participant/condition (see the per-participant fresh-DB workaround above).

**Sample size:** no information to state a specific number — no pilot data or effect-size estimate exists yet to run a real power calculation. A pilot-scale within-subjects HCI study of this shape is typically run with somewhere around 8–15 participants, but that's a common rule of thumb for this study *type*, not a number derived from this project's own data — treat it as a starting point to revise after a pilot, not a target to defend.

## 4. Ethics

**What this document can state from the code:** no voice or biometric data is collected (the app has no such feature — see the earlier code-review pass that confirmed this). No participant identifier is stored anywhere in the schema, so there's nothing to anonymize by default — but see the table above: this also means a researcher must track which exported rows belong to which participant themselves (e.g. one DB/export file per participant), since the app won't do it.

**What this document cannot state — no information available:**
- Whether Anatoli's specific institutional context (independent researcher preparing Fraunhofer materials) requires formal ethics-committee (IRB-equivalent) approval before running this with real participants. That depends on the actual collaborating institution's policy, which isn't in this codebase or documented anywhere in this project — **requires uncertainty / requires clarification**, not a guess.
- What informed-consent language should say. No consent flow exists in the app; this would be a document/process outside the code (a consent form participants sign or click through before the session starts), not something to fabricate here.

**One concrete risk worth flagging:** the override "reason" field (`decision_log.reason_text`) is free text a participant types during the task. If a study runs, participants should be told not to enter identifying information there, and the researcher should review exported CSVs before sharing or publishing them, since nothing currently redacts or validates that field's content.

## 5. What this document is not

Not a claim that this prototype has been validated, that these hypotheses are confirmed, or that a study is underway. It's the plan for turning the Stage 0 tool into Stage 1 (an actual pilot) — the next concrete step is running a small pilot (even N=1–2) to check the task takes a reasonable amount of time and the export data looks the way this document says it will, before recruiting for real.

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

**Participants — who, and why that's a judgment call, not a fact:** no recruitment channel, IRB relationship, or real-operator access is documented anywhere in this project, so this document can't assert who will actually participate — that's genuinely undecided. What it can say is the tradeoff, for whoever decides:
- **Students / lab colleagues** — the practical default for a first pilot. Easy to recruit, standard in HCI formative studies, and appropriate given the domain is deliberately synthetic (a neutral "workshop/IT-service/cleaning" schema, not a real company's actual operations) — nobody has domain expertise to lose here yet.
- **Real schedulers/dispatchers from a service company** — higher ecological validity for RQ1–3 (real operators, real stakes in getting the plan right), but this document has no information about access to such a group, and recruiting them makes sense *after* a pilot confirms the task itself works, not before.

Recommendation: pilot with students/colleagues (N as small as 1–2 is enough to catch a broken task or a confusing UI step), then decide whether a real-operator study is worth pursuing based on what the pilot shows — not commit to real operators up front on the strength of this document alone.

**Task:** the participant runs the existing demo flow — generate synthetic orders, run the scheduler, then work through each scheduled order deciding accept or override — for a fixed batch of orders (`docs/demo-script.md` already uses ~25 orders as a workable batch size for a single sitting; reuse that unless it proves too long in a pilot).

**Conditions (IV):**
- **A — real explanation:** normal operation, `ANTHROPIC_API_KEY` set, `explanationService` calls the LLM.
- **B — fallback-only:** `ANTHROPIC_API_KEY` unset (or deliberately invalid) for that session, so every explanation is the deterministic template.

A second, commonly-asked contrast — "top-3 factors" vs. "plain text only" — is **not buildable today without new code**. `ExplanationPanel.jsx` always renders both the `topFactors` list and `summaryText` together; there is no explanation format that shows only one. Comparing explanation *formats* (not just explanation *source*, which is what A/B above tests) would need a second rendering mode added to the component first — not proposed as part of this design, since it's new UI work, not something already sitting in the codebase like RQ1–3 are.

**Gap to flag honestly:** there is currently no supported way to force condition B for one specific session while leaving A available for the next one without restarting the server with a different environment variable — that's an operational step (stop server, unset `ANTHROPIC_API_KEY`, restart), not a UI toggle. Workable for a researcher running sessions one at a time, but worth knowing before scheduling back-to-back participants.

**DV:** `overrideRate` (RQ1/RQ2), `decisionLatencySeconds` (RQ3), both pulled from `GET /api/decisions/export` after each session, one export per participant/condition (see the per-participant fresh-DB workaround above).

**Protocol, step by step (proposed):**

1. Fresh database for this participant (`npm run migrate && npm run seed` in `server/`, or restart the deployed instance if it's the only one running that session).
2. Brief the participant on the task (what a "specialist", "order type", and "override" mean in this simulated domain — see `docs/demo-script.md` for the same walkthrough used for a live demo).
3. Set condition order per the counterbalancing assignment (A-then-B or B-then-A) for this participant number.
4. **Condition block:** click Generate orders, click Run scheduler, then work through each scheduled order on the board, accepting or overriding as the participant judges appropriate. Record: start timestamp (session start), end timestamp (last decision), and nothing else manually — the app logs everything else (`decision_log`, `explanations`) automatically as the participant works.
5. Between condition blocks (if testing both in one session): restart the server with `ANTHROPIC_API_KEY` toggled, fresh database again.
6. Repeat step 4 for the second condition.
7. After the session: pull `GET /api/decisions/export?format=csv` for this participant's database, save it under a participant number (not a name), and reset the database before the next participant.
8. No in-app step asks the participant anything directly — there is no post-task questionnaire in the app (see the "Subjective trust" and "Cognitive load" rows in the metrics table above). If a future version of this study adds one, it happens outside the app (paper form, separate survey tool) until it's actually built.

**Sample size:** no information to state a specific number — no pilot data or effect-size estimate exists yet to run a real power calculation. A pilot-scale within-subjects HCI study of this shape is typically run with somewhere around 8–15 participants, but that's a common rule of thumb for this study *type*, not a number derived from this project's own data — treat it as a starting point to revise after a pilot, not a target to defend.

## 4. Ethics

**What this document can state from the code:** no voice or biometric data is collected (the app has no such feature — see the earlier code-review pass that confirmed this). No participant identifier is stored anywhere in the schema, so there's nothing to anonymize by default — but see the table above: this also means a researcher must track which exported rows belong to which participant themselves (e.g. one DB/export file per participant), since the app won't do it.

**What this document cannot state — no information available:**
- Whether Anatoli's specific institutional context (independent researcher preparing Fraunhofer materials) requires formal ethics-committee (IRB-equivalent) approval before running this with real participants. That depends on the actual collaborating institution's policy, which isn't in this codebase or documented anywhere in this project — **requires uncertainty / requires clarification**, not a guess.
- What informed-consent language should say. No consent flow exists in the app; this would be a document/process outside the code (a consent form participants sign or click through before the session starts), not something to fabricate here.

**One concrete risk worth flagging:** the override "reason" field (`decision_log.reason_text`) is free text a participant types during the task. If a study runs, participants should be told not to enter identifying information there, and the researcher should review exported CSVs before sharing or publishing them, since nothing currently redacts or validates that field's content.

## 5. What this document is not

Not a claim that this prototype has been validated, that these hypotheses are confirmed, or that a study is underway. It's the plan for turning the Stage 0 tool into Stage 1 (an actual pilot) — the next concrete step is running a small pilot (even N=1–2) to check the task takes a reasonable amount of time and the export data looks the way this document says it will, before recruiting for real.

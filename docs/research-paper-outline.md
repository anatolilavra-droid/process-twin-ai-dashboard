# Research paper outline (draft, 31.08.2026)

**This is an outline, not a paper draft.** No experiment has run (see `docs/experiment-design.md`), so there are no results to report yet. What follows is the *shape* a paper would take once a pilot and a real study have happened — useful to show the thinking is there, not to submit anywhere as-is. Every section below says explicitly what exists today vs. what depends on work not yet done.

**On citations: none are included here, and none should be invented.** A real Related Work section needs an actual literature search by the author — this document names the *topic areas* that search should cover, not placeholder citations. Fabricating author names or paper titles here would be exactly the kind of hallucination `CLAUDE.md`'s constraints for this project exist to prevent; a "citation" that doesn't check out is worse than an empty section.

## Working title

Something like: *"Process Twin: A Research Instrument for Studying Explanation Source and Confidence on Human Override Behavior in Operational Scheduling"* — descriptive and honest about scope (one system, three narrow RQs), not a grand claim. Revise once RQ1–3's actual results (if a study runs) suggest a sharper framing.

## Abstract (skeleton, to be written after a study runs)

A real abstract needs actual results — this is the shape, with placeholders marked:

> We present Process Twin, an open-source research prototype for studying human-in-the-loop decision-making in AI-assisted operational scheduling. The system pairs a deterministic scheduling heuristic with LLM-generated, structured explanations, and logs every accept/override decision an operator makes, including decision latency and the explanation's source and stated confidence. [PLACEHOLDER: N participants, task, findings for RQ1–3 once a study runs]. We release the system, its instrumentation, and a proposed experiment design to support further research on explanation-driven trust and override behavior in operational AI.

## 1. Introduction

- **Problem:** operational decisions (scheduling, resource allocation) increasingly involve an AI proposal with a human able to accept or override it — but it's not well understood how the *presence* and *content* of an AI's explanation changes override behavior in that setting, as opposed to purely lab-based XAI evaluations disconnected from an actual operational task.
- **Motivation:** most explainable-AI (XAI) evaluation happens on classification/prediction tasks judged in isolation; fewer systems combine a working operational pipeline (real scheduling logic, not a toy classifier) with instrumented human-in-the-loop decisions where explanation source and confidence are logged automatically.
- **Contribution framing (only claim what's actually true today):** (1) an open, runnable research instrument — not a claim of novel scheduling or explanation algorithms; the scheduler is a deliberately simple deterministic heuristic, described as such throughout the codebase and this doc; (2) three concrete, currently-testable research questions with a proposed experiment design; (3) [PLACEHOLDER, pending a study] empirical findings on RQ1–3.

## 2. Related work (topic areas to search — no citations here, see note above)

Three areas an actual literature search needs to cover before this section can be written for real:

1. **Explainable AI (XAI) evaluation methodology** — particularly work that evaluates explanations by behavioral outcome (does an explanation change what a person does) rather than only by human-rated "interpretability" or fidelity-to-model metrics. Relevant sub-threads: explanation confidence/uncertainty communication, and the difference between local (per-decision) and global explanations — this system only produces local, per-assignment explanations.
2. **Human-in-the-loop / human-AI teaming in operational settings** — override/accept interfaces specifically, trust calibration (when should a human trust an AI recommendation, and when do they over- or under-trust it), and how override behavior is typically measured in the literature (this document doesn't know what the standard measure is — `overrideRate` here is this project's own choice, not verified against a field-standard metric).
3. **AI in scheduling/operations research contexts** — how prior systems that generate a schedule or plan have handled explainability, if at all; most classical scheduling literature doesn't address explanation, most XAI literature doesn't use a scheduling task, and this project's Related Work needs to establish whether that gap is real or whether prior systems already exist that this project should be positioned against.

**Explicit gap this document cannot fill:** whether this specific combination (LLM-explained deterministic scheduler + logged override behavior) has prior art. That requires an actual search, not an assumption of novelty.

## 3. System design

This section can be written now — it describes the actual system, not a plan:

- **Architecture:** Node.js/Express/SQLite backend, React/Vite/Tailwind frontend — see `docs/spec.md` for the full technical reference and the architecture diagram in `README.md`.
- **Scheduler:** deterministic earliest-deadline-first heuristic with a per-order-type priority bonus (`server/services/schedulingService.js`) — explicitly not a learned model; this is a design choice to isolate the explanation/override variables from scheduler-quality confounds, not a limitation to hide.
- **Explanation generation:** Claude (`claude-opus-5`), structured output via a Zod schema (top-3 factors + confidence + summary text), grounded only in the scheduler's own inputs (deadline proximity, order-type priority bonus, specialist queue position) — no invented factors. Falls back to a deterministic template (marked `confidence: "low"`, `source: "fallback"`) on any LLM failure, which is also what RQ1 studies as condition B.
- **Human-in-the-loop logging:** every AI proposal, human acceptance, and human override is logged (`decision_log`) with timestamps, enabling the decision-latency metric without any additional instrumentation.
- **Data export:** `GET /api/decisions/export` (CSV/JSON) — built specifically to support the kind of offline analysis a paper's results section would need (see `docs/spec.md`).

## 4. Research questions & hypotheses

Reproduced from `docs/experiment-design.md` (kept in sync there, not duplicated in full here — see that document for the exact measurement definitions):

- **RQ1:** Does a real AI-generated explanation change override behavior, vs. the deterministic fallback? (H1: exploratory, no directional claim)
- **RQ2:** Does explanation confidence predict accept vs. override? (H2: lower confidence → more overrides)
- **RQ3:** Does deciding take longer for an override than an accept? (H3: yes, overriding requires more UI steps)

## 5. Experiment design (planned)

Summary — full protocol, participant reasoning, and the named operational gap (no in-app toggle for the fallback-only condition) are in `docs/experiment-design.md`, not repeated here:

- Within-subjects, counterbalanced, two explanation conditions (real LLM vs. fallback-only).
- Proposed pilot: students/colleagues first, real-operator recruitment only after a pilot validates the task.
- Dependent variables pulled from `GET /api/decisions/export`: override rate, decision latency, cross-tabulated by explanation source/confidence.
- No subjective instrument (trust, cognitive load) is built into the app yet — flagged, not glossed over, in both this document and `docs/experiment-design.md`.

## 6. Expected contributions (conditional on a study actually running)

- If RQ1–3 are tested: an empirical result on whether explanation source/confidence measurably changes override behavior and decision speed in an operational (not purely classification) task — a contribution *conditional on the study happening*, not claimed yet.
- Independent of results: the system itself, released as a research instrument — the scheduler, explanation pipeline, logging, and export tooling — for other researchers studying the same question without building the harness from scratch.
- A worked example of instrumenting an operational human-in-the-loop system for behavioral (not just self-report) measurement of explanation effects — decision latency and override rate computed purely from existing operational timestamps, no added UI friction to collect them.

## 7. Future work

- The two gaps named in `docs/experiment-design.md`'s metrics table: a subjective trust/confidence instrument, and cognitive-load measurement — both need new instrumentation (a questionnaire, or UI-interaction timing) not built yet.
- Per-participant/session tracking (`participant_id`) to run a real between-subjects or multi-participant shared-instance study instead of the current one-database-per-participant workaround.
- The second explanation-format contrast named in `docs/experiment-design.md` (top-3-factors vs. text-only) — would need a second rendering mode in `ExplanationPanel.jsx`, not built.
- Actual completion tracking (`status: "done"` is never set anywhere in the app today) — would let `plannedOnTimeRate` become a real on-time-completion metric instead of the prospective "is the current plan on track" measure it is now (see `README.md`'s "Known limitations").
- If a study runs and results are promising: the literature search flagged in Related Work, done for real, to position this work correctly rather than assume novelty.

# Demo script (~3–5 minutes)

Live walkthrough script. All steps use the real app — nothing here is staged or mocked (except the LLM call, which degrades to a labeled fallback if `ANTHROPIC_API_KEY` isn't set — see step 0).

The ~25 orders / 5-day horizon is a judgment call for what fills the board without taking too long to click through, not a validated finding — adjust the count if it doesn't fit your screen or your audience's patience.

## Step 0 — before the audience arrives

```bash
# Backend
cd server
rm -rf data && npm run migrate && npm run seed
# Put a real key in .env if you want live LLM explanations instead of the
# fallback template — see "AI explanations" in the README for what changes.
npm start

# Frontend, separate terminal
cd web
npm run dev
```

Open `http://localhost:5173`. Confirm the queue is empty and the board shows three free specialists — that's the state the script below assumes.

## Step 1 (0:00–0:30) — what this is

Say: "This is Process Twin — a research prototype for a small service company's order intake and scheduling. An AI proposes a plan, explains why, and a human can review or override it. Everything you'll see is live against a real backend — synthetic data, real logic."

## Step 2 (0:30–1:30) — generate and schedule

- Click **Generate orders** (creates 10 — click twice for a fuller board of ~20, or point out `count` is configurable via the API if asked).
- Click **Run scheduler**.
- Board fills across the three specialist columns; queue empties; the metrics tiles at the top go from `—` to real numbers.

Say: "The scheduler is a deterministic heuristic — earliest deadline first, with urgent and premium orders getting a priority bonus. It's not a learned model, and we say that everywhere in this project, including to the AI agent that writes the explanations you're about to see."

## Step 3 (1:30–2:30) — explain a decision

- Click any assignment card.
- Point at the **Why this assignment** panel: top factors, plain-language summary, confidence.
- If no `ANTHROPIC_API_KEY` is set, the amber fallback notice will be visible — say so directly: "This is the fallback path — the explanation service is unreachable right now, so this text is a template built from the same real inputs, not written by the LLM. The point is it degrades honestly instead of crashing."

## Step 4 (2:30–3:30) — override

- In the same modal, open the **Override** section.
- Pick a specialist of a **different type** than the one shown — the "Heads up" warning appears.
- Say: "The system doesn't block this. The scheduler enforces specialist type because it has no other signal, but a human overriding might know something it doesn't — that's the point of human-in-the-loop. We just make sure the mismatch is visible, not hidden."
- Fill in a one-line reason, click **Override plan**.
- Point at the **Decision history** panel at the bottom: the new `Overridden` entry with the quoted reason, under the earlier `AI proposed` entry for the same order.
- Point at the **Override rate** tile: it just moved.

## Step 5 (3:30–4:00) — For Researchers tab

- Switch to the **For Researchers** tab.
- Say: "This is the same four research questions from the project's CLAUDE.md, with an honest note on what's actually measurable today versus what still needs a real user study — we haven't run one yet, so there are no invented findings here."

## Step 6 (4:00–4:30) — wrap-up

Say: "Everything you saw — the scheduler, the explanations, the override flow, the metrics — is in one repository, fully tested, with the known limitations written down rather than glossed over: no completion tracking yet, so the on-time metric is prospective; no working-hours modeling; single-tenant, no auth. That transparency is deliberate — it's part of what we'd want a research collaboration to help push further."

## If something goes wrong live

- **Board doesn't fill after scheduling**: check the backend terminal for errors; confirm `npm run seed` ran (no specialists = nothing to assign to).
- **Explanation panel stuck on "Asking the explanation agent…"**: the backend is likely unreachable — check `VITE_API_BASE_URL` in `web/.env` matches where `server` is actually running.
- **Want a bigger board without re-clicking Generate**: `curl -X POST http://localhost:3001/api/orders/generate -H "Content-Type: application/json" -d '{"count": 25}'` from a second terminal, then click **Run scheduler** in the UI.

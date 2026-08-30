# Deployment: GitHub Pages (frontend) + Render (backend)

Everything code/config-side is already in the repo (`render.yaml`, `.github/workflows/deploy-pages.yml`, `web/vite.config.js`'s Pages-aware `base`). What's left needs manual clicks in the GitHub and Render UIs — an API token isn't enough to flip repo visibility, toggle Pages on, or create a hosting account, so this is a checklist, not something that runs itself.

**Order matters**: backend first, then the frontend build (it needs the backend's URL baked in).

## 1. Make the repository public

GitHub Pages on a private repo requires GitHub Pro or higher. This repo is currently private.

`github.com/anatolilavra-droid/process-twin-ai-dashboard` → **Settings** → scroll to **Danger Zone** → **Change visibility** → **Make public** → confirm by typing the repo name.

This makes the full commit history public, not just the current code — same as when this came up earlier in the project.

## 2. Deploy the backend on Render

1. Sign in to [render.com](https://render.com) (free account, GitHub login works).
2. **New** → **Blueprint** → connect this repository. Render reads `render.yaml` from the repo root automatically and proposes a `process-twin-server` web service on the free plan.
3. It'll prompt for `ANTHROPIC_API_KEY` (marked `sync: false` in the blueprint, so Render asks rather than storing a default) — paste your key, or leave it blank to run on the fallback-only explanation path (see README → "AI explanations").
4. Deploy. First build takes a few minutes (npm install, then `migrate && seed && start` per `render.yaml`).
5. Once live, copy the service URL Render shows you — looks like `https://process-twin-server-XXXX.onrender.com` (the suffix is assigned by Render, not something you pick).

**Known limitation, by design, documented here rather than hidden:** the free plan has no persistent disk. After ~15 minutes idle, the service spins down; the next request wakes it into a *fresh* filesystem — any orders/decisions generated in the previous session are gone, and the first request after a wake takes ~30–50s while Render cold-starts the instance. `migrate`/`seed` re-run automatically on every start specifically so the app comes back up in a valid (if empty) state instead of erroring on a missing schema. This isn't unique to this project — it's the standard free-tier tradeoff of Render/Railway/Fly.io-style ephemeral hosting.

## 3. Point the frontend build at that backend

`github.com/anatolilavra-droid/process-twin-ai-dashboard` → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**:

- Name: `VITE_API_BASE_URL`
- Value: the Render URL from step 2 (no trailing slash)

This is a *variable*, not a secret — it ends up baked into a public client-side JS bundle either way, so there's nothing to hide.

## 4. Turn on GitHub Pages

**Settings** → **Pages** → under "Build and deployment", set **Source** to **GitHub Actions** (not "Deploy from a branch" — the workflow in this repo handles the build itself).

## 5. Run the deploy workflow

Pushing to `main` under `web/` triggers `.github/workflows/deploy-pages.yml` automatically. To fire it manually instead (e.g. right after step 3/4, without a new commit): **Actions** tab → **Deploy frontend to GitHub Pages** → **Run workflow**.

## 6. Open it

`https://anatolilavra-droid.github.io/process-twin-ai-dashboard/`

First load hits an empty backend (or a cold-starting one, per the step 2 caveat) — click **Generate orders** then **Run scheduler** to populate it, same as any fresh local run.

# Deployment guide

Production stack for an internal Amfico tool:

| Piece | Where | Cost |
|---|---|---|
| `amfitech` (Angular SPA, end-user) | Cloudflare Pages | free |
| `amfitech-back-office` (Angular SPA, admin) | Cloudflare Pages | free |
| `amfitech-api` (NestJS) | Render Web Service | free (sleeps after 15 min idle) |
| Postgres + Auth | Supabase | free |

Total: **€0/month** for the volumes an internal tool reaches.

---

## One-time prerequisites

1. **Push the repo to GitHub** (already done).
2. **Rotate the Supabase service-role key** (Settings → API → Reset service_role secret). The old value is in your local `.env` and possibly in old commit history / chat transcripts. Update `apps/amfitech-api/.env` with the new value locally, but do **not** commit it.
3. **Back up your `ENCRYPTION_KEY`** to a password manager. If you lose it, every stored AdminPulse API key is unrecoverable.
4. Have these values handy (from `apps/amfitech-api/.env`):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (already in `environment.prod.ts`, public)
   - `SUPABASE_SERVICE_ROLE_KEY` (the freshly rotated one)
   - `ENCRYPTION_KEY`

---

## Step 1 — Deploy the NestJS backend on Render

The repo ships a `render.yaml` Blueprint. Render reads it and pre-fills
build/start/health/env-keys; the only things you do by hand are
pasting the secret values.

1. Sign in at https://render.com with the GitHub account that owns the repo.
2. **New +** → **Blueprint** → connect repository → pick `amfico-aarotech`.
3. Render parses `render.yaml` and shows the service it will create
   (`amfitech-api` in `frankfurt`, Node 22, free plan,
   health check `/api/health`).
4. Render prompts for the three secrets marked `sync: false`:
   - `SUPABASE_SERVICE_ROLE_KEY` — rotated value from `.env`
   - `ENCRYPTION_KEY` — 64-char hex from `.env` (password-manager backup)
   - `FRONTEND_ORIGINS` — leave blank for now, fill in Step 4 once
     Cloudflare Pages URLs exist
5. **Apply**. Wait for the first build (~3–5 min). Swagger UI is
   intentionally disabled in production; the OpenAPI spec lives
   locally via `nx serve amfitech-api` → `/api/docs`.
6. Visit `https://<your-service>.onrender.com/api/health` — you should
   see `{ "ok": true, "uptimeSeconds": …, "timestamp": "…" }`.
7. **Copy the service URL**. If it's not `https://amfitech-api.onrender.com`,
   update `apiBaseUrl` in both `environment.prod.ts` files, commit +
   push.

---

## Step 2 — Deploy `amfitech` on Cloudflare Pages

1. Sign in at https://dash.cloudflare.com.
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** → select `amfico-aarotech`.
3. Configure:
   - **Project name**: `amfitech`
   - **Production branch**: `main`
   - **Build command**:
     ```
     npm install --legacy-peer-deps --include=dev && npx nx build amfitech --configuration=production
     ```
   - **Build output directory**: `dist/apps/amfitech/browser`
   - **Root directory**: leave blank (workspace root)
   - **Environment variables**:
     - `SKIP_DEPENDENCY_INSTALL` = `1` — Cloudflare's auto-install
       runs strict `npm ci`, which trips on platform-specific Nx
       native binaries that the lockfile lists only for the OS where
       it was last generated. Skipping the auto-install lets the
       build command's `npm install` resolve the right binary for
       Cloudflare's Linux builders.
4. **Save and Deploy**. First build is ~3–4 min.
5. Visit the assigned URL (e.g. `https://amfitech.pages.dev`) and confirm the login page loads. *Don't try to log in yet — backend CORS still needs the URL.*

---

## Step 3 — Deploy `amfitech-back-office` on Cloudflare Pages

Same flow, just swap names:

- **Project name**: `amfitech-back-office`
- **Build command**: `npm install --legacy-peer-deps --include=dev && npx nx build amfitech-back-office --configuration=production`
- **Build output directory**: `dist/apps/amfitech-back-office/browser`
- **Environment variables**: `SKIP_DEPENDENCY_INSTALL` = `1` (same reason as `amfitech`)

Build, copy the resulting URL.

---

## Step 4 — Wire CORS on the backend

1. Render dashboard → `amfitech-api` → **Environment**.
2. Set `FRONTEND_ORIGINS` to a comma-separated list of both Pages URLs, e.g.:
   ```
   https://amfitech.pages.dev,https://amfitech-back-office.pages.dev
   ```
   If you've also added custom domains later (e.g. `amfitech.amfico.be`), include them here too.
3. **Save Changes** — Render restarts the service automatically (~30 s).

---

## Step 5 — Bootstrap the admin user's API key

1. Browse to `https://amfitech-back-office.pages.dev`, log in with `aaron@aarotech.be` + the password you set in Supabase.
2. Click **API-sleutel** on your own user, paste your AdminPulse API key, set a label, save.
3. Browse to `https://amfitech.pages.dev`, log in with the same credentials → registrations page should load.

---

## Auto-deploys after this

- Push to `main` → Render rebuilds the backend AND Cloudflare Pages rebuilds both frontends in parallel
- Both providers send build status notifications via email / GitHub PR checks
- Render free-tier builds are limited to ~750 hours/mo total uptime (the service sleep counts against this only when running)
- Cloudflare Pages free tier: 500 builds/month, unlimited bandwidth

---

## Custom domains (optional)

When you're ready to drop the `.pages.dev` / `.onrender.com` URLs:

1. **Backend**: Render → service → **Custom Domains** → add e.g. `api.adminpulse.amfico.be`. Render gives you a CNAME target; add it to your DNS.
2. **Frontends**: Cloudflare Pages → project → **Custom domains** → add e.g. `amfitech.amfico.be` / `back-office.amfico.be`. If the domain is already on Cloudflare DNS, one click; otherwise add the provided CNAME.
3. Update `apiBaseUrl` in both `environment.prod.ts` files to the new backend domain, commit + push.
4. Update `FRONTEND_ORIGINS` on Render to include the new frontend domains.

---

## Cold-start caveat (Render free tier)

The free Web Service plan sleeps after 15 min of no traffic. The next request takes ~30 s to wake up — annoying for a "first thing in the morning" user.

Mitigations:
- Live with it (recommended for an internal tool)
- Upgrade to Render's **Starter** plan ($7/mo) — no sleep
- Switch to Fly.io (~$5 credit covers small apps) — slightly more setup
- Add a cron-pinger (e.g. cron-job.org) that hits `/api/health` every 10 minutes — keeps the service warm. Free, but burns into Render's monthly hour quota.

---

## Rolling back

- Render: dashboard → **Deploys** → click a previous deploy → **Rollback**
- Cloudflare Pages: dashboard → project → **Deployments** → **Rollback to this deployment** on any older successful build
- Database: Supabase has Point-in-Time Recovery on paid plans only; for free-tier, periodic SQL dumps are your safety net. The schema is captured in `apps/amfitech-api/supabase/schema.sql` already.

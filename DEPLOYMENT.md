# Deployment

This document describes how RaceTimeTracker is deployed to production and preview.

## Overview

- **Domain:** `tikoflano.work` (purchased and managed in Cloudflare, free plan)
- **Hosting:** Vercel (free plan)
- **Client app:** Deployed from the `client/` directory
- **Backend:** SpacetimeDB cloud (separate from Vercel; see SpacetimeDB section below)

### Authentication

During deployment, you may be prompted to log in to Vercel and/or SpacetimeDB. If needed, run:

```bash
vercel login      # for Vercel deployments
spacetime login   # for SpacetimeDB publishes
```

### Local vs cloud token

Running `spacetime login` for cloud auth overwrites `~/.config/spacetime/cli.toml`. The local dev token (used for `spacetime publish`, `spacetime call`, etc. against the local server) is replaced by the cloud token.

- **Before cloud deploy:** When you run `npm start`, the local token is printed in the dev output. Copy it and save it somewhere safe (e.g. password manager, `client/.env.local`).
- **Restore local token:** Run `spacetime login --token <your-saved-token>` with the token you saved.
- **Alternative (reset):** Run `npm run reset` to clear local data and log out. Then run `npm start` again to get a fresh local setup (no token restore needed, but you lose local DB data).

### Quick links

- [SpacetimeDB Dashboard](https://spacetimedb.com/@tikoflano)
- [Cloudflare Dashboard](https://dash.cloudflare.com/dac8f7940563787b180848e463bc6efe/domains/overview)
- [Vercel Dashboard](https://vercel.com/alvaro-flanos-projects/racetimetracker-client)

---

## Domain and DNS (Cloudflare)

The base domain `tikoflano.work` is registered and managed in Cloudflare. All DNS records for the project live in the Cloudflare zone for this domain.

### Custom domains on Vercel

Two subdomains are linked to the Vercel project:

| Domain                                   | Environment |
| ---------------------------------------- | ----------- |
| `racetimetracker.tikoflano.work`         | Production  |
| `racetimetracker-staging.tikoflano.work` | Preview     |

### DNS configuration

For each domain, a **CNAME** record was added in the Cloudflare DNS zone:

- **Name:** The subdomain (e.g. `racetimetracker` or `racetimetracker-staging`)
- **Target:** The CNAME value provided by Vercel (in Vercel → Project → Settings → Domains)
- **Proxy status:** **DNS only** (grey cloud) — the proxy option must be **disabled** for Vercel to validate and serve the domain correctly

---

## Vercel

### Project

- **Project name:** `racetimetracker-client`
- **Plan:** Free
- **Root directory:** Not set — deploy from `client/` so the project root is the Vite app (setting Root Directory to `client` would cause Vercel to look for `client/client` when deploying from `client/`)
- **Build command:** Default (Vite)
- **Output directory:** `dist` (Vite default)

### Deploying via CLI

Deployments build locally and upload pre-built artifacts (no Git push required):

```bash
npm run deploy:preview   # From repo root: SpacetimeDB + client (preview)
npm run deploy:prod      # From repo root: SpacetimeDB + client (production)
```

Or from the `client/` directory:

```bash
cd client
npm run deploy:preview   # Build locally + vercel deploy --prebuilt
npm run deploy:prod      # Build locally + vercel deploy --prod --prebuilt
```

This uses `vercel deploy --prebuilt` to upload the locally built `.vercel/output` (from `vite-plugin-vercel`), so you can deploy local changes without committing and pushing.

### Domains

The domains `racetimetracker.tikoflano.work` and `racetimetracker-staging.tikoflano.work` were added in:

**Vercel Dashboard → Project → Settings → Domains**

Vercel provides the CNAME target for each domain; that value is used in the Cloudflare DNS records above.

### SPA routing (fix 404 on direct URL access)

Direct visits to client-side routes (e.g. `/championships`) return 404 unless Vercel is told to serve `index.html` for all paths. The project uses **`vite-plugin-vercel`**, which emits the Build Output API v3 with SPA fallback routes in `client/vite.config.ts`.

**Requirements for rewrites to work:**

1. **Root Directory must be `client`**  
   **Vercel Dashboard → Project → Settings → General → Root Directory**  
   Set to `client`. The plugin creates `.vercel/output` inside the project root; if Root Directory is not set, Vercel looks at the repo root and won't find it.

2. **Output Directory**  
   Do **not** override the Output Directory in project settings. The plugin outputs to `.vercel/output`; Vercel uses this automatically. If "Output Directory" is set to `dist`, change it to empty or remove it so Vercel uses the Build Output API.

3. **Redeploy** after any config changes.

### Environment variables

Build-time variables (`VITE_*`) are set in Vercel per environment (Production and Preview). See [Environment-specific configuration](#environment-specific-configuration) below.

---

## Preview access control (Vercel Firewall)

A Vercel Firewall rule named **"Invite Only"** restricts access to the preview domain:

- **Applies to:** `racetimetracker-staging.tikoflano.work`
- **Condition:** Requests must include a header `X-tikoflano-work-invite` with a secret value
- **Effect:** Requests without the header are blocked (403)

There is also a firewall rule that maintains an **IP allowlist** (IPs or CIDRs). Requests from allowlisted IPs bypass the other rules and can access preview without the header. To get your public IP for allowlisting, visit [ifconfig.me](https://ifconfig.me) or run `curl ifconfig.me`.

### Accessing preview

To visit preview, add the required header to your requests. The easiest way is with the **ModHeader** browser extension:

1. Install [ModHeader](https://modheader.com/) (Chrome/Firefox)
2. Add a request header:
   - **Name:** `X-tikoflano-work-invite`
   - **Value:** _(the secret value — obtain from the project maintainer)_
3. Enable the extension and navigate to `https://racetimetracker-staging.tikoflano.work`

---

## Google OAuth credentials

Separate OAuth 2.0 client credentials exist in Google Cloud Console for each environment:

| OAuth client name                | Intended use                                                             |
| -------------------------------- | ------------------------------------------------------------------------ |
| `RaceTimeTracker-WebApp-Prod`    | Production (`racetimetracker.tikoflano.work`)                            |
| `RaceTimeTracker-WebApp-Staging` | Preview (`racetimetracker-staging.tikoflano.work`)                       |
| `RaceTimeTracker-WebApp-Dev`     | Local development (`localhost`) and `racetimetracker-dev.tikoflano.work` |

Authorized JavaScript origins and redirect URIs are already configured in [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=racetimetracker-488420) for each client. See [DEVELOPMENT.md](./DEVELOPMENT.md) for more on the dev domain setup.

---

## SpacetimeDB

The backend runs on SpacetimeDB cloud, not on Vercel. The client connects over WebSocket to:

- **Production:** `maincloud.spacetimedb.com` → database `racetimetracker-prod`
- **Preview:** `maincloud.spacetimedb.com` → database `racetimetracker-preview`

Publishing the SpacetimeDB module to each database is done via:

```bash
npm run deploy:preview  # SpacetimeDB + client (preview) — deploys local changes
npm run deploy:prod     # SpacetimeDB + client (production)
```

No branch checks — preview deploys whatever you have locally; Vercel Git deployments use whatever is committed. Config files: `spacetime.preview.json`, `spacetime.prod.json` in the repo root.

### TODO: Handling SpacetimeDB publish conflicts

When `spacetime publish` fails due to schema incompatibility, SpacetimeDB is rejecting changes that cannot be automatically migrated. See [Automatic Migrations](https://spacetimedb.com/docs/databases/automatic-migrations) for the full rules.

**Forbidden changes** (publish fails): adding Unique/Primary Key constraints, adding columns in the middle of a table, adding columns without defaults, removing/modifying columns, removing tables.

**Options to resolve:**

1. **Preview / dev only:** Use `spacetime publish --delete-data <database>` to reset the database. ⚠️ Permanently deletes all data.
2. **Breaking changes (prod):** Use `spacetime publish --break-clients <database>` to force the publish. Existing clients that haven’t been updated will break until they are redeployed.
3. **Production-safe schema changes:** Use the [Incremental Migrations](https://spacetimedb.com/docs/how-to/incremental-migrations) pattern: add new tables/columns, migrate data gradually, then remove old schema once clients are updated.

**Best practice:** Test schema changes on preview (`racetimetracker-preview`) before publishing to production (`racetimetracker-prod`). Document any breaking changes and coordinate client redeploys (Vercel) with SpacetimeDB publishes.

---

## Environment-specific configuration

The client uses these build-time variables (see `client/src/main.tsx`):

| Variable                | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `VITE_STDB_ENV`         | `cloud` for deployed; `local` for dev                                   |
| `VITE_STDB_CLOUD_HOST`  | SpacetimeDB host (default: `maincloud.spacetimedb.com`)                 |
| `VITE_STDB_DATABASE`    | Database name (`racetimetracker-prod`, `racetimetracker-preview`, etc.) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for the environment                              |

For Vercel deployments, these are set as environment variables in the Vercel project (Settings → Environment Variables), with different values for Production and Preview.

For **local preview builds** (`npm run build:preview`), create `client/.env.preview` from `client/.env.preview.example` with the same values as Vercel's Preview environment.

---

## Summary

| Component       | Production                               | Preview                                               |
| --------------- | ---------------------------------------- | ----------------------------------------------------- |
| **URL**         | `https://racetimetracker.tikoflano.work` | `https://racetimetracker-staging.tikoflano.work`      |
| **Vercel**      | Same project, production branch          | Same project, preview branch                          |
| **SpacetimeDB** | `racetimetracker-prod`                   | `racetimetracker-preview`                             |
| **OAuth**       | RaceTimeTracker-WebApp-Prod              | RaceTimeTracker-WebApp-Staging                        |
| **Access**      | Public                                   | Requires `X-tikoflano-work-invite` header (ModHeader) |

# Deployment

This document describes how RaceTimeTracker is deployed to production and staging.

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

### Quick links

- [SpacetimeDB Dashboard](https://spacetimedb.com/@tikoflano)
- [Cloudflare Dashboard](https://dash.cloudflare.com/dac8f7940563787b180848e463bc6efe/domains/overview)
- [Vercel Dashboard](https://vercel.com/alvaro-flanos-projects/racetimetracker-client)

---

## Domain and DNS (Cloudflare)

The base domain `tikoflano.work` is registered and managed in Cloudflare. All DNS records for the project live in the Cloudflare zone for this domain.

### Custom domains on Vercel

Two subdomains are linked to the Vercel project:

| Domain | Environment |
|--------|-------------|
| `racetimetracker.tikoflano.work` | Production |
| `racetimetracker-staging.tikoflano.work` | Staging |

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

From the `client/` directory:

```bash
cd client
npm run deploy:preview   # Preview (staging env vars)
npm run deploy:prod      # Production
```

### Domains

The domains `racetimetracker.tikoflano.work` and `racetimetracker-staging.tikoflano.work` were added in:

**Vercel Dashboard → Project → Settings → Domains**

Vercel provides the CNAME target for each domain; that value is used in the Cloudflare DNS records above.

### Environment variables

Build-time variables (`VITE_*`) are set in Vercel per environment (Production and Preview/staging). See [Environment-specific configuration](#environment-specific-configuration) below.

---

## Staging access control (Vercel Firewall)

A Vercel Firewall rule named **"Invite Only"** restricts access to the staging domain:

- **Applies to:** `racetimetracker-staging.tikoflano.work`
- **Condition:** Requests must include a header `X-tikoflano-work-invite` with a secret value
- **Effect:** Requests without the header are blocked (403)

### Accessing staging

To visit staging, add the required header to your requests. The easiest way is with the **ModHeader** browser extension:

1. Install [ModHeader](https://modheader.com/) (Chrome/Firefox)
2. Add a request header:
   - **Name:** `X-tikoflano-work-invite`
   - **Value:** *(the secret value — obtain from the project maintainer)*
3. Enable the extension and navigate to `https://racetimetracker-staging.tikoflano.work`

---

## Google OAuth credentials

Separate OAuth 2.0 client credentials exist in Google Cloud Console for each environment:

| OAuth client name | Intended use |
|-------------------|--------------|
| `RaceTimeTracker-WebApp-Prod` | Production (`racetimetracker.tikoflano.work`) |
| `RaceTimeTracker-WebApp-Staging` | Staging (`racetimetracker-staging.tikoflano.work`) |
| `RaceTimeTracker-WebApp-Dev` | Local development (`localhost`) and `racetimetracker-dev.tikoflano.work` |

Authorized JavaScript origins and redirect URIs are already configured in [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=racetimetracker-488420) for each client. See [DEVELOPMENT.md](./DEVELOPMENT.md) for more on the dev domain setup.

---

## SpacetimeDB

The backend runs on SpacetimeDB cloud, not on Vercel. The client connects over WebSocket to:

- **Production:** `maincloud.spacetimedb.com` → database `racetimetracker-prod`
- **Staging:** `maincloud.spacetimedb.com` → database `racetimetracker-staging`

Publishing the SpacetimeDB module to each database is done via:

```bash
npm run deploy          # deploys based on current branch (main → prod, preview → staging)
npm run deploy:staging  # publishes to racetimetracker-staging (requires preview branch)
npm run deploy:prod     # publishes to racetimetracker-prod (requires main branch)
```

**Branch requirements:** `deploy` routes to prod when on `main`, to staging when on `preview`. `deploy:staging` and `deploy:prod` enforce these branches and exit with an error if run on the wrong one. Config files: `spacetime.staging.json`, `spacetime.prod.json` in the repo root.

### TODO: Handling SpacetimeDB publish conflicts

When `spacetime publish` fails due to schema incompatibility, SpacetimeDB is rejecting changes that cannot be automatically migrated. See [Automatic Migrations](https://spacetimedb.com/docs/databases/automatic-migrations) for the full rules.

**Forbidden changes** (publish fails): adding Unique/Primary Key constraints, adding columns in the middle of a table, adding columns without defaults, removing/modifying columns, removing tables.

**Options to resolve:**

1. **Staging / dev only:** Use `spacetime publish --delete-data <database>` to reset the database. ⚠️ Permanently deletes all data.
2. **Breaking changes (prod):** Use `spacetime publish --break-clients <database>` to force the publish. Existing clients that haven’t been updated will break until they are redeployed.
3. **Production-safe schema changes:** Use the [Incremental Migrations](https://spacetimedb.com/docs/how-to/incremental-migrations) pattern: add new tables/columns, migrate data gradually, then remove old schema once clients are updated.

**Best practice:** Test schema changes on staging (`racetimetracker-staging`) before publishing to production (`racetimetracker-prod`). Document any breaking changes and coordinate client redeploys (Vercel) with SpacetimeDB publishes.

---

## Environment-specific configuration

The client uses these build-time variables (see `client/src/main.tsx`):

| Variable | Purpose |
|----------|---------|
| `VITE_STDB_ENV` | `cloud` for deployed; `local` for dev |
| `VITE_STDB_CLOUD_HOST` | SpacetimeDB host (default: `maincloud.spacetimedb.com`) |
| `VITE_STDB_DATABASE` | Database name (`racetimetracker-prod`, `racetimetracker-staging`, etc.) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for the environment |

For Vercel deployments, these are set as environment variables in the Vercel project (Settings → Environment Variables), with different values for Production and Preview (staging branch).

---

## Summary

| Component | Production | Staging |
|-----------|------------|---------|
| **URL** | `https://racetimetracker.tikoflano.work` | `https://racetimetracker-staging.tikoflano.work` |
| **Vercel** | Same project, production branch | Same project, preview/staging branch |
| **SpacetimeDB** | `racetimetracker-prod` | `racetimetracker-staging` |
| **OAuth** | RaceTimeTracker-WebApp-Prod | RaceTimeTracker-WebApp-Staging |
| **Access** | Public | Requires `X-tikoflano-work-invite` header (ModHeader) |

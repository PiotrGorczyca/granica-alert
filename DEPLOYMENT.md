# Deployment Guide - Granica Alert

## Quick Start (Dokploy / Nixpacks)

### 1. Environment Variables

⚠️ **CRITICAL**: `VITE_CONVEX_URL` must be set as a **BUILD environment variable** in Dokploy.

SvelteKit/Vite bakes environment variables into the bundle at **build time**, not runtime.

Set in your hosting platform as **build** environment variables:

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

Runtime environment variables (optional):

```env
PORT=3000
HOST=0.0.0.0
```

### 2. Node.js Version

This project requires **Node.js 20 or 22**. The repo includes `nixpacks.toml` that pins Node.js 22:

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "bun"]
```

If using a different platform, ensure Node.js ≥20 via `package.json`:

```json
"engines": {
  "node": ">=20"
}
```

### 3. Build & Start Commands

Dokploy/Nixpacks auto-detects via `nixpacks.toml`:

- **Install**: `npm ci`
- **Build**: `npm run build`
- **Start**: `npm start` (runs `node build/index.js`)

### 4. Convex Production Deployment

Before deploying the app, deploy Convex functions:

```bash
# Deploy to production (first time)
npx convex deploy --prod

# This will output your CONVEX_URL (e.g., https://cvx-granica-alert.demopg.page)
# Add it to your hosting platform as VITE_CONVEX_URL (build environment variable!)
```

## Deployment Checklist

- [ ] Deploy Convex functions: `npx convex deploy --prod`
- [ ] Copy production `VITE_CONVEX_URL` from Convex output
- [ ] **Set `VITE_CONVEX_URL` as BUILD environment variable in Dokploy** (critical!)
- [ ] Verify Node.js 20+ in hosting platform (nixpacks.toml pins nodejs_22)
- [ ] Set `PORT` (optional runtime env, default: 3000)
- [ ] Set `HOST` (optional runtime env, default: 0.0.0.0)
- [ ] Deploy SvelteKit app (build + start)
- [ ] Verify RCB poller cron is running (check Convex dashboard)
- [ ] Test API endpoints:
  - `https://your-domain.com/v1/status`
  - `https://your-domain.com/v1/events`
- [ ] Verify home page loads with Polish UI
- [ ] Check disclaimer is visible

## Manual Deployment Steps

### Step 1: Deploy Convex

```bash
# Login to Convex (if not already)
npx convex login

# Deploy functions to production
npx convex deploy --prod

# Output will show:
# Deployment URL: https://xxxxx.convex.cloud
```

Copy the deployment URL.

### Step 2: Configure Environment

⚠️ **Important**: For Dokploy/Vite builds, `VITE_CONVEX_URL` must be set as a **build environment variable**, not just runtime.

**Dokploy**: Add to "Build Environment Variables" section in app settings.

**Local .env.production** (for local testing):

```env
VITE_CONVEX_URL=https://xxxxx.convex.cloud
```

**Why build-time?** SvelteKit/Vite bundles `import.meta.env.VITE_*` variables into the JavaScript at build time. Runtime environment variables won't work for client-side code.

### Step 3: Build SvelteKit

```bash
npm run build
```

This creates `build/index.js` and dependencies.

### Step 4: Start Production Server

```bash
npm start
```

Or directly:

```bash
node build/index.js
```

Server runs on port 3000 by default (configurable via `PORT` env var).

## Verify Deployment

### 1. Check Convex Functions

Visit Convex dashboard: https://dashboard.convex.dev

- [ ] Schema deployed (events, rcb_komunikaty, source_status tables)
- [ ] Cron job running (every 5 minutes)
- [ ] No deployment errors in logs

### 2. Test API Endpoints

```bash
# Status endpoint
curl https://your-domain.com/v1/status

# Events endpoint
curl https://your-domain.com/v1/events?limit=10
```

### 3. Test Web UI

- [ ] Home page loads: `https://your-domain.com`
- [ ] Situation strip shows status
- [ ] Events feed displays (may be empty initially)
- [ ] Disclaimer banner visible (yellow warning)
- [ ] Footer links work (/sources, /map, /settings)

## Troubleshooting

### "Node.js 18.x has reached End-Of-Life and has been removed"

**Problem**: Nixpacks is trying to use deprecated Node.js 18.

**Solution**: Ensure `nixpacks.toml` exists in repo root (it does):

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "bun"]
```

If the error persists:

1. Verify `nixpacks.toml` is committed and pushed
2. Check Dokploy/hosting platform detects the file
3. Manually force Node.js 22 in platform settings if available
4. Verify `package.json` has `"engines": {"node": ">=20"}`

### "VITE_CONVEX_URL is undefined" or blank page

**Problem**: Environment variable not available at build time.

**Solution**: Set `VITE_CONVEX_URL` as a **BUILD environment variable** in Dokploy:

1. Go to app settings → Build Environment Variables (not Runtime Environment)
2. Add: `VITE_CONVEX_URL=https://your-deployment.convex.cloud`
3. Rebuild the application

Vite/SvelteKit bundles these variables at build time, not runtime.

### "Cannot find module '../convex/_generated/api'" or UNRESOLVED_IMPORT

**Problem**: Build cannot find Convex generated types.

**Solution**: This should not happen - `convex/_generated/` is committed to the repo. If it occurs:

1. Verify `convex/_generated/` exists and contains `api.js`, `api.d.ts`, `server.js`, `server.d.ts`
2. Check `.gitignore` does NOT have `convex/_generated/` (it should be committed)
3. If files are missing, run locally:
   ```bash
   npx convex dev
   git add convex/_generated/
   git commit -m "chore: Add Convex generated files"
   git push
   ```

The generated files are checked into version control specifically to allow production builds without Convex authentication.

### "No start command could be found"

Ensure `package.json` has:

```json
{
	"scripts": {
		"start": "node build/index.js"
	}
}
```

### "Convex deployment failed: Could not resolve 'crypto'"

Fixed in commit 2384a06. Ensure you have the latest code that uses Web Crypto API instead of Node's crypto module.

### Empty events feed

- Check Convex dashboard for cron job logs
- Manually trigger poller: `npx convex run rcbPoller:pollRcb --prod`
- Check RCB fixture fallback is working (should create 1 sample event)

### 404 on API routes

- Verify SvelteKit build completed successfully
- Check `build/server/` directory exists
- Ensure adapter-node is configured in `svelte.config.js`

## Production Monitoring

### Convex Dashboard

Monitor at: https://dashboard.convex.dev

- **Functions**: Check RCB poller execution logs
- **Data**: View events, komunikaty tables
- **Cron Jobs**: Verify "poll rcb komunikaty" runs every 5 minutes
- **Logs**: Check for scraping errors or failures

### Application Logs

Monitor your hosting platform logs for:

- SvelteKit server startup
- API endpoint requests
- Any runtime errors

### Health Check

Add to monitoring:

- Endpoint: `GET /v1/status`
- Expected: 200 OK with JSON payload
- Alert if: status code != 200 or response time > 5s

## Scaling Considerations

### Current Setup (MVP)

- **Convex**: Auto-scales, no config needed
- **SvelteKit**: Single Node.js process
- **RCB Polling**: Every 5 minutes (low load)

### For Higher Traffic

1. **Horizontal Scaling**: Run multiple SvelteKit instances behind load balancer
2. **Convex**: Already handles scale automatically
3. **CDN**: Add Cloudflare or similar for static assets
4. **Caching**: Consider Redis for `/v1/status` and `/v1/events` (optional)

## Rollback Plan

If deployment fails:

1. **Convex**: Previous deployment remains active
2. **SvelteKit**: Use your hosting platform's rollback feature
3. **Emergency**: Set `VITE_CONVEX_URL` back to dev deployment temporarily

## Security Notes

- **VITE_CONVEX_URL**: Public (embedded in client bundle)
- **No auth required**: All endpoints are public read-only
- **RCB scraping**: Respects robots.txt, uses polite User-Agent
- **CORS**: SvelteKit allows all origins (public API)

## Next Steps After Deployment

1. Monitor RCB poller for 1 hour
2. Verify events are being ingested
3. Test disclaimer visibility
4. Share with test users in eastern Poland
5. Monitor for scraping failures (gov.pl structure changes)

---

**Last Updated**: 2026-09-15  
**Deployment Tested**: Convex + adapter-node + Dokploy/Nixpacks compatible

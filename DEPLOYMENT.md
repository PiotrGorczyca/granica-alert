# Deployment Guide - Granica Alert

## Quick Start (Dokploy / Nixpacks)

### 1. Environment Variables

Set in your hosting platform:

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
PORT=3000
HOST=0.0.0.0
```

### 2. Build & Start Commands

Dokploy/Nixpacks should auto-detect:

- **Build**: `npm install && npm run build`
- **Start**: `npm start` (runs `node build/index.js`)

### 3. Convex Production Deployment

Before deploying the app, deploy Convex functions:

```bash
# Deploy to production (first time)
npx convex deploy --prod

# This will output your CONVEX_URL
# Add it to your hosting platform as VITE_CONVEX_URL
```

## Deployment Checklist

- [ ] Deploy Convex functions: `npx convex deploy --prod`
- [ ] Copy production `VITE_CONVEX_URL` from Convex output
- [ ] Set `VITE_CONVEX_URL` in hosting platform environment variables
- [ ] Set `PORT` (optional, default: 3000)
- [ ] Set `HOST` (optional, default: 0.0.0.0)
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

Create `.env.production` or set in hosting dashboard:

```env
VITE_CONVEX_URL=https://xxxxx.convex.cloud
```

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

### "Cannot find module '../convex/_generated/api'"

This is expected during `npm run check` before deploying Convex. The types are generated when you run `npx convex dev` or `npx convex deploy`.

**Solution**: Deploy Convex first with `npx convex deploy --prod`

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

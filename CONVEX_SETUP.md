# Convex Setup Instructions

## Important: Generated Files Committed

This project commits `convex/_generated/` to the repository for production builds. This allows builds to succeed without requiring Convex authentication during CI/CD or Dokploy deployments.

If you modify the Convex schema or functions, you must regenerate and commit the updated files (see "Daily Development" below).

## First-Time Setup

Before running the application, you must initialize Convex to connect to a deployment.

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Initialize Convex

Run the Convex dev server once to set up your project:

```bash
npx convex dev
```

This will:

1. Prompt you to log in or create a Convex account
2. Create a new Convex project (or let you select an existing one)
3. Generate `.env.local` with your `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL`
4. Regenerate TypeScript client code in `convex/_generated/` (already committed but will be refreshed)
5. Deploy your schema and functions
6. Start the cron job for RCB polling

**Important**: Keep this terminal running - Convex needs to watch for changes.

**Note**: The `convex/_generated/` directory is committed to the repo, so you can build the app without running `npx convex dev` first. However, you need it to actually deploy Convex functions and get a working backend.

### Step 3: Start SvelteKit

In a new terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Daily Development

Once initialized, you need two terminals running:

**Terminal 1 - Convex:**

```bash
npx convex dev
```

**Terminal 2 - SvelteKit:**

```bash
npm run dev
```

## When Schema or Functions Change

If you modify `convex/schema.ts` or add/remove/modify Convex functions:

1. Convex dev will automatically regenerate `convex/_generated/`
2. **Commit the changes** to `convex/_generated/`:
   ```bash
   git add convex/_generated/
   git commit -m "chore: Update Convex generated files"
   ```

This ensures production builds have the latest types.

## Manual Polling

To manually trigger the RCB poller:

```bash
npx convex run rcbPoller:pollRcb
```

## Viewing Data

Open the Convex dashboard to view stored events and source status:

```bash
npx convex dashboard
```

Or visit: https://dashboard.convex.dev

## Production Deployment

1. Deploy Convex functions:

```bash
npx convex deploy --prod
```

2. Set production env var `VITE_CONVEX_URL` in your hosting platform

3. Build and deploy SvelteKit:

```bash
npm run build
```

## Troubleshooting

### "Cannot find module '../convex/_generated/api'"

You need to run `npx convex dev` first to generate the API types.

### Cron job not running

Check the Convex dashboard logs. The cron is set to run every 5 minutes.

### Empty events

Wait 5 minutes for the first cron run, or manually trigger:

```bash
npx convex run rcbPoller:pollRcb
```

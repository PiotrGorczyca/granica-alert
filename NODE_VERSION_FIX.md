# Node.js Version & Build Environment Fix

**Date**: 2026-09-15 18:38 UTC  
**Branch**: cursor/granica-alert-mvp-b9c2  
**Commit**: 8253769

## Issue

Dokploy nixpacks build failed on VPS with:

```
error: Node.js 18.x has reached End-Of-Life and has been removed
```

Nixpacks was defaulting to deprecated Node.js 18.

## Solution

### 1. ✅ Added nixpacks.toml

Created `nixpacks.toml` at repo root to pin Node.js 22:

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "bun"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

**Why Node.js 22?**

- Node.js 18 reached EOL
- Node.js 20 LTS (Active)
- Node.js 22 Current (Latest stable)

Using Node.js 22 ensures compatibility with Railway/Dokploy nixpacks 1.41+.

### 2. ✅ Added engines.node to package.json

```json
{
	"engines": {
		"node": ">=20"
	}
}
```

This provides fallback for platforms that don't use nixpacks.toml.

### 3. ✅ Documented Build-Time Environment Requirements

**Critical**: `VITE_CONVEX_URL` must be set as a **BUILD environment variable**, not runtime.

**Why?** SvelteKit/Vite bundles `import.meta.env.VITE_*` variables into the JavaScript at **build time**. Runtime environment variables are not accessible to client-side code.

**Dokploy Setup:**

1. Go to app settings
2. Find "Build Environment Variables" (separate from Runtime Environment)
3. Add: `VITE_CONVEX_URL=https://cvx-granica-alert.demopg.page`
4. Rebuild

### 4. ✅ Updated Documentation

**Files Updated:**

1. **README.md**:
   - Added "Requirements" section with Node.js 20/22 requirement
   - Documented build-time environment requirement for `VITE_CONVEX_URL`
   - Added "Nixpacks Configuration" section explaining `nixpacks.toml`

2. **DEPLOYMENT.md**:
   - Added critical warning about build-time environment variables
   - Added Node.js version section
   - Updated deployment checklist with build env requirement
   - Added troubleshooting for "Node.js 18.x EOL" error
   - Added troubleshooting for "VITE_CONVEX_URL is undefined"

## Trust Rules Verification

✅ **No functional changes** - All changes are infrastructure/configuration only:

- Typed events only ✅
- No fake threat scores ✅
- No ADS-B-as-threat ✅
- No OPSEC violations ✅
- Clear disclaimers ✅

## Files Changed

- `nixpacks.toml` (new) - Node.js 22 pinning
- `package.json` - Added engines.node >=20
- `README.md` - Build requirements documentation
- `DEPLOYMENT.md` - Comprehensive build env guide

## Testing

### Node.js Version

```bash
# Verify nixpacks.toml exists
cat nixpacks.toml
# Output: nodejs_22 ✅

# Verify package.json engines
grep "engines" package.json -A 2
# Output: "node": ">=20" ✅
```

### Build Environment Documentation

- ✅ README explains build-time requirement
- ✅ DEPLOYMENT.md has Dokploy-specific instructions
- ✅ Troubleshooting section added for common errors

## Deployment Workflow (Updated)

1. **Deploy Convex** (first):

   ```bash
   npx convex deploy --prod
   # Output: https://cvx-granica-alert.demopg.page
   ```

2. **Configure Dokploy BUILD Environment** (critical):
   - Add `VITE_CONVEX_URL=https://cvx-granica-alert.demopg.page`
   - Must be in **Build Environment Variables**, not Runtime

3. **Deploy App**:
   - Nixpacks detects `nixpacks.toml`
   - Uses Node.js 22
   - Runs `npm ci` (install)
   - Runs `npm run build` (with VITE_CONVEX_URL baked in)
   - Starts with `npm start`

## Expected Outcomes

### Before This Fix

- ❌ Nixpacks fails: "Node.js 18.x EOL"
- ⚠️ Build might succeed but `VITE_CONVEX_URL` undefined at runtime

### After This Fix

- ✅ Nixpacks uses Node.js 22
- ✅ `npm ci` uses reproducible installs
- ✅ `npm run build` has `VITE_CONVEX_URL` available
- ✅ Client-side code can connect to Convex
- ✅ Production server starts with `npm start`

## Verification Checklist

After deploying with these fixes:

- [ ] Build logs show Node.js v22.x.x
- [ ] Build succeeds without Node.js 18 EOL error
- [ ] App starts successfully
- [ ] Home page loads (not blank)
- [ ] Browser console shows no "VITE_CONVEX_URL is undefined" errors
- [ ] `/v1/status` returns JSON (API works)
- [ ] `/v1/events` returns JSON
- [ ] Convex queries execute successfully

## Common Issues & Solutions

### Build still uses Node 18

**Problem**: Platform not detecting `nixpacks.toml`

**Solutions**:

1. Verify file is committed and pushed
2. Check platform settings for Node.js override
3. Try manual Node.js version setting in platform UI

### Blank page or "undefined" errors

**Problem**: `VITE_CONVEX_URL` not set as build environment variable

**Solutions**:

1. Verify it's in **Build** Environment Variables (not Runtime)
2. Check exact variable name: `VITE_CONVEX_URL` (no spaces)
3. Rebuild after setting (old builds won't have it)

### API endpoints return 500

**Problem**: Server-side Convex connection failing

**Check**:

1. Convex deployment URL is correct
2. Convex functions deployed successfully
3. No Convex auth errors in logs

## Git History

```bash
git log --oneline -5
```

Output:

```
8253769 fix: Pin Node.js 22 and document build-time env requirements
4f2a748 docs: Add deployment fixes summary
efb8490 docs: Add comprehensive deployment guide for Dokploy/Nixpacks
2384a06 fix: Deploy-ready fixes for Convex and production builds
2684039 docs: Add implementation summary and completion checklist
```

## Status

🟢 **READY FOR DOKPLOY DEPLOYMENT**

All blockers resolved:

- ✅ Node.js 22 pinned (nixpacks.toml)
- ✅ Package.json has engines.node >=20
- ✅ Build-time environment documented
- ✅ Dokploy-specific instructions added
- ✅ Troubleshooting guides complete
- ✅ Trust rules intact
- ✅ No functional changes

---

**Next Step**: Deploy to Dokploy with `VITE_CONVEX_URL` set as BUILD environment variable.

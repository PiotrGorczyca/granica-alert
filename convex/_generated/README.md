# Convex Generated Files

This directory contains TypeScript type definitions and runtime utilities generated from the Convex schema.

## Why These Files Are Committed

Unlike typical Convex development workflows, we commit `convex/_generated/` to the repository for production builds. This allows:

1. **Build without deployment**: Production builds (Dokploy, CI/CD) can build without authenticating to a Convex deployment
2. **Type safety in development**: TypeScript can type-check without running `npx convex dev`
3. **Reproducible builds**: Generated types are version-controlled

## Files

- `api.js` / `api.d.ts` - Function references for client-side usage
- `server.js` / `server.d.ts` - Server-side function builders (query, mutation, action)
- `dataModel.d.ts` - Data model type definitions

## Regenerating

When you modify `convex/schema.ts` or add/remove Convex functions:

1. Run `npx convex dev` (starts dev server and watches for changes)
2. Or run `npx convex codegen` (one-time regeneration)
3. Commit the updated `_generated/` files

The generated files are automatically updated by Convex when the schema or functions change.

## Production Deployment

When deploying to production:

1. These generated files allow the SvelteKit build to succeed
2. Deploy Convex functions separately with `npx convex deploy --prod`
3. Set `VITE_CONVEX_URL` to your production Convex deployment

The generated files here are used only for build-time type checking and client-side API references. The actual Convex backend logic runs on Convex's infrastructure after `npx convex deploy`.

# Granica Alert

**Świadomość sytuacyjna wschodniej Polski** - civic air awareness tool for eastern Poland.

A SvelteKit + Convex application that aggregates official air situation alerts (RCB, DORSZ) and provides calm, sourced context for residents of eastern Poland.

## ⚠️ Important Disclaimer

**Granica Alert is NOT an official government product.** It is an independent tool that aggregates publicly available official communications. Always verify information with official sources (RCB, DORSZ, MON). This system does not detect threats - it displays official communications and their context.

## Trust Rules (Non-negotiable)

- ✅ Typed events only (rcb_air, rcb_other, dorsz_ops, etc.)
- ❌ No fake threat scores
- ❌ No ADS-B-as-threat detection
- ❌ No OPSEC-violating live sightings
- ✅ Clear disclaimer: not official government product

## Stack

- **Frontend**: SvelteKit + TailwindCSS
- **Backend/DB**: Convex (reactive database + serverless functions)
- **Scheduled polling**: Convex cron jobs
- **Map** (future): MapLibre GL

## Setup

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

1. Clone and install dependencies:

```bash
npm install
```

2. Set up Convex:

```bash
# Initialize Convex project (first time only)
npx convex dev --once

# This will:
# - Create a new Convex project or link to existing
# - Generate .env.local with CONVEX_DEPLOYMENT and VITE_CONVEX_URL
# - Generate Convex client code in convex/_generated/
```

3. Start development servers:

```bash
# Terminal 1: Convex dev server (watches convex/ functions)
npx convex dev

# Terminal 2: SvelteKit dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### First Run

On first run with `npx convex dev`, Convex will:

- Deploy your schema and functions
- Start the RCB poller cron (runs every 5 minutes)
- Begin ingesting RCB komunikaty

You can manually trigger the poller in the Convex dashboard or via CLI:

```bash
npx convex run rcbPoller:pollRcb
```

## Project Structure

```
/workspace
├── convex/
│   ├── schema.ts          # Event data model
│   ├── rcbPoller.ts       # RCB scraper action
│   ├── mutations.ts       # DB write operations
│   ├── queries.ts         # DB read operations
│   ├── crons.ts           # Scheduled jobs
│   └── _generated/        # Auto-generated Convex client
├── src/
│   ├── lib/
│   │   └── convex.ts      # Convex client setup
│   └── routes/
│       ├── +page.svelte   # Polish home UI
│       ├── +page.ts       # Data loader
│       ├── v1/
│       │   ├── status/    # GET /v1/status
│       │   └── events/    # GET /v1/events
│       ├── sources/       # Sources & trust page
│       ├── map/           # Map (stub)
│       └── settings/      # Settings (stub)
└── convex.json
```

## API Endpoints

### GET /v1/status

Current situation strip payload:

```json
{
	"as_of": "2026-09-15T16:00:00Z",
	"rcb_air_active": true,
	"headline": "RCB: Russian air attack on Ukraine; Polish aviation operating",
	"polish_airspace_violation": "no",
	"primary_source_url": "https://www.gov.pl/web/rcb/...",
	"sources_freshness": {
		"rcb": "2026-09-15T15:58:00Z"
	}
}
```

### GET /v1/events?limit=20&type=rcb_air&since=2026-09-15T00:00:00Z

Events feed with optional filters:

- `limit`: Number of events (default 20)
- `type`: Filter by event type (rcb_air, rcb_other, etc.)
- `since`: ISO date for minimum published_at

Returns array of event objects.

## Event Types

| Type              | Meaning                                      |
| ----------------- | -------------------------------------------- |
| `rcb_air`         | Official RCB air-related alert               |
| `rcb_other`       | Other RCB (exercise, flood, etc.)            |
| `dorsz_ops`       | DORSZ: aviation operating                    |
| `dorsz_violation` | DORSZ: airspace violation confirmed/denied   |
| `ua_raid_west`    | Ukrainian air-raid active in western oblasts |
| `notam_zone`      | Published restricted airspace                |
| `incident`        | Confirmed spillover / recovery               |
| `news`            | Media report, unverified                     |
| `osint`           | Third-party analysis                         |

## Data Sources

### Currently Implemented

- **RCB komunikaty** (gov.pl) - Polled every 5 minutes via Convex cron
  - Parses public komunikaty list page
  - Classifies rcb_air vs rcb_other based on keywords
  - Stores with source URL and confidence: official
  - Falls back to fixture if parsing fails

### Planned (Not in MVP)

- alerts.in.ua - Western Ukraine raid status
- News RSS - TVN24, PAP (classified as confidence: single_outlet)
- DORSZ social - Manual curation or X API

## Development

```bash
# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run check

# Run E2E tests
npm run test:e2e
```

## Deployment

### Production Build

Build the SvelteKit application for production:

```bash
npm run build
```

This creates a production-ready Node.js server in the `build/` directory using `@sveltejs/adapter-node`.

### Running in Production

Start the production server:

```bash
npm start
```

Or directly:

```bash
node build/index.js
```

The server will listen on:

- **Port**: `PORT` environment variable (default: 3000)
- **Host**: `HOST` environment variable (default: 0.0.0.0)

### Production Environment Variables

Set these in your hosting platform (Vercel, Cloudflare, Dokploy, etc.):

- `VITE_CONVEX_URL` - Your production Convex deployment URL (required)
- `PORT` - Server port (optional, default: 3000)
- `HOST` - Server host (optional, default: 0.0.0.0)

### Convex Production Deployment

Deploy Convex functions to production:

```bash
npx convex deploy --prod
```

This outputs your production `VITE_CONVEX_URL` - add it to your hosting platform's environment variables.

### Testing Production Build Locally

```bash
npm run build
npm start
```

Then visit `http://localhost:3000`

## Roadmap

### Phase 1.5 (Post-MVP)

- alerts.in.ua integration for Western Ukraine raid correlation
- DORSZ social monitoring
- News RSS ingestion
- Web push notifications

### Phase 2

- MapLibre integration with EP R134 zone
- Static incident pins (Tarnawa, etc.)
- Optional OpenSky civil traffic layer
- Multi-language support (EN)
- PWA manifest for mobile install

## License

MIT (or as appropriate for civic tool)

## Contributing

Issues and PRs welcome. Remember the trust rules:

- No threat scoring inventions
- No OPSEC-violating real-time tracking
- Always link to official sources
- Conservative classification (when in doubt, mark confidence lower)

---

**Spec reference**: See `uploads/MVP-SPEC.md` for full requirements and trust guidelines.

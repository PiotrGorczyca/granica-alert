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

2. Set up environment variables (optional):

Create a `.env.local` file in the project root:

```bash
# Optional: alerts.in.ua API token for western Ukraine raid correlation
# Request token at https://alerts.in.ua/
# If not set, app will run but UA correlator data will show as unavailable
ALERTS_IN_UA_TOKEN=your_token_here
```

3. Set up Convex:

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

- **alerts.in.ua** - Western Ukraine raid correlation - Polled every 25 seconds via Convex cron
  - Tracks western oblasts: Volyn, Lviv, Rivne, Zakarpattia (configurable)
  - Emits `ua_raid_west` event only on edge detection (inactive → active transition)
  - Respects soft rate limit (~2.4 req/min)
  - Requires `ALERTS_IN_UA_TOKEN` environment variable
  - If token not set, app runs gracefully with null freshness for alerts_in_ua
  - **Never** displayed as "Poland under attack" - secondary correlator only

- **News RSS** - Keyword-filtered Polish media - Polled every 10 minutes via Convex cron
  - Sources: TVN24, RMF24, Defence24, Polsat News, Gazeta.pl, Radio Rzeszów
  - Keyword filter: eastern border / air / RCB / DORSZ / drone / military aviation terms
  - Stored as `type: news`, `confidence: single_outlet`
  - **Never** auto-upgrades to official or changes Home status strip
  - UI displays clear "Wiadomość medialna" badge with "Nieoficjalne — sprawdź źródło" warning
  - Deduplicates by URL/guid per source
  - Polite User-Agent; resilient parsing; skips failed feeds without crashing
  - Full-text **not** republished (copyright + calm design) — summary + source link only

### Planned (Not in MVP)

- DORSZ social - Manual curation or X API
- Google Alerts RSS for long-tail news
- Admin paste for official DORSZ/MON posts

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

### Requirements

- **Node.js**: 20 or 22 (specified in `nixpacks.toml` and `package.json`)
- **Convex**: Production deployment must be completed first
- **Build Environment**: `VITE_CONVEX_URL` must be available at build time

### Production Build

⚠️ **Critical**: Set `VITE_CONVEX_URL` as a **build environment variable** before building.

SvelteKit/Vite bakes `import.meta.env.VITE_*` variables into the bundle at build time.

```bash
# Set build environment
export VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Build
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

**Build-time** (required during `npm run build`):

- `VITE_CONVEX_URL` - Your production Convex deployment URL (required, must be set as build env)

**Runtime** (optional, set when starting server):

- `PORT` - Server port (optional, default: 3000)
- `HOST` - Server host (optional, default: 0.0.0.0)
- `ALERTS_IN_UA_TOKEN` - Token for alerts.in.ua API (optional, enables western Ukraine raid correlation)

**Note on ALERTS_IN_UA_TOKEN**: If not set, the application will run normally but the western Ukraine correlator will show as unavailable. Request a token at [https://alerts.in.ua/](https://alerts.in.ua/) to enable this feature.

**Dokploy/Nixpacks**: Add `VITE_CONVEX_URL` to "Build Environment Variables" in app settings, not just runtime environment.

### Convex Production Deployment

Deploy Convex functions to production:

```bash
npx convex deploy --prod
```

This outputs your production `VITE_CONVEX_URL` - add it to your hosting platform's **build environment variables**.

### Nixpacks Configuration

The repo includes `nixpacks.toml` for Dokploy/Railway deployments:

- **Node.js**: Pinned to version 22
- **Package manager**: npm with `npm ci` for reproducible installs
- **Build**: `npm run build`
- **Start**: `npm start`

If Node.js 18.x error occurs, ensure your platform uses the `nixpacks.toml` configuration or manually set Node.js ≥20.

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

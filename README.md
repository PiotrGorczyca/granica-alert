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
- **Map**: MapLibre GL with bundled administrative boundaries

## What the map shows

The map shades only the areas an official communication actually names. RCB
states the scope of an alert in its own text ("Alert RCB został wysłany do
odbiorców na terenie woj. podkarpackiego i lubelskiego"), and that sentence is
what drives the shading. An alert whose scope cannot be read shades nothing
rather than shading a guess, and a powiat-scoped alert shades that powiat rather
than its whole voivodeship.

Western Ukrainian oblasts under air-raid alarm are drawn separately, with a
whole-oblast alarm distinguished from a partial one. An alarm across the border
is context, not a threat to Polish territory, and is labelled as such.

Nothing on the map is a position, a track, or a sighting.

### Data sources and attribution

| Layer                           | Source                                                                                                    | Licence                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| Base map tiles                  | OpenStreetMap                                                                                             | ODbL                    |
| Voivodeship / powiat boundaries | GUGiK Państwowy Rejestr Granic, via [ppatrzyk/polska-geojson](https://github.com/ppatrzyk/polska-geojson) | public data             |
| Ukrainian oblast boundaries     | [geoBoundaries](https://www.geoboundaries.org/) gbOpen UKR ADM1 (OSM-derived)                             | ODbL                    |
| RCB komunikaty                  | [gov.pl/web/rcb/komunikaty](https://www.gov.pl/web/rcb/komunikaty)                                        | official communications |
| Ukrainian air-raid alarms       | [alerts.in.ua](https://alerts.in.ua/) API (token required)                                                | per their terms         |

Regenerate the bundled boundary data with `npm run gen:data`.

### What the app will and will not claim

RCB publishes a date but no time of day, and no end time. It announces a
stand-down by editing the same komunikat, and does not do so for every alert. So
the status is one of four states, and only one of them is an all-clear:

| State             | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| `active`          | Issued recently and RCB has not called it off              |
| `cancelled`       | RCB published a stand-down — the only all-clear we assert  |
| `no_confirmation` | Past our display window with no stand-down: we do not know |
| `none`            | Nothing recent enough to show                              |

Two guards keep this from drifting into false confidence:

- A komunikat is timestamped with the moment we saw it **only** if we were
  polling continuously when it appeared. After a gap — a first run, an outage — a
  komunikat could have been published hours earlier, so it keeps date precision
  and can never be reported as in force. Without this, a catch-up poll would
  light up the map for a threat that was already over.
- If the RCB poller is failing or has fallen behind, the app says it has no data
  rather than reporting quiet. Silence from a broken scraper is not an all-clear.

Both rules are covered by tests in `tests/airState.test.ts` and
`tests/sourceHealth.test.ts`.

### Polling etiquette

RCB is polled every 5 minutes, but a poll is cheap. The listing is revalidated
with `If-None-Match`, so an unchanged listing costs one empty 304, and stored
komunikaty are re-read on a tapering schedule (`convex/lib/refreshSchedule.ts`):
every poll while a komunikat is under 2h old — the window in which RCB appends
the line naming which voivodeships an alert went to — then every 30 minutes, then
only if we still have no area for it, then not at all past 48 hours. Those
re-reads are conditional too.

This matters: without the taper the poller re-read every komunikat in the window
on every poll, roughly 2,600 requests a day to gov.pl for content that had not
changed. Steady state is now a few hundred, nearly all of them empty 304s.

alerts.in.ua is polled every 30s against a documented ceiling of 30 requests per
10 minutes (1 per 20s), leaving headroom for a retry.

### Configuration

Set on the **Convex deployment**, not in `.env.local` — the pollers run inside
Convex and never see Vite's environment:

```bash
npx convex env set ALERTS_IN_UA_TOKEN <token>
npx convex env set BOT_CONTACT_EMAIL kontakt@piotrgorczyca.com
```

`BOT_CONTACT_EMAIL` goes into the User-Agent sent to gov.pl, alerts.in.ua and
every news feed polled, so those sites can reach the operator instead of simply
blocking the bot. Use a real, monitored address — if it is unset the User-Agent
says so rather than naming one that bounces.

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

- Restricted-zone (EP R) polygons, once sourced from the PANSA AIP rather than drawn by hand
- Border crossing operating status from Straż Graniczna
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

# alerts.in.ua Western-Oblast Correlator - Implementation Notes

## Overview

This document provides implementation details for the alerts.in.ua western-oblast correlator feature added to Granica Alert.

## Architecture

### Edge Detection State Machine

The correlator uses a simple but effective state machine:

```
┌─────────────┐
│  Inactive   │ (active_oblasts = [])
│  (no raids) │
└──────┬──────┘
       │
       │ UA raid starts in any western oblast
       │ (Volyn, Lviv, Rivne, or Zakarpattia)
       ▼
┌─────────────┐
│   Active    │ (active_oblasts = ["lviv", ...])
│ (ua_raid_west│
│  event emitted)
└──────┬──────┘
       │
       │ All western oblasts clear
       │ (no event emitted)
       ▼
┌─────────────┐
│  Inactive   │
└─────────────┘
```

**Key insight**: Events are emitted **only** on the inactive → active edge, not on every poll. This prevents event spam and ensures the event feed remains meaningful.

## Data Flow

```
┌──────────────────┐
│ alerts.in.ua API │
│ (25s polling)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ alertsInUaPoller.ts      │
│ - Fetch active alerts    │
│ - Parse western oblasts  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ updateUaRaidState        │
│ (mutation)               │
│ - Compare with previous  │
│ - Detect edge            │
└────────┬─────────────────┘
         │
         ├─► ua_raid_state table (updated always)
         │
         └─► events table (only on edge: inactive → active)
                │
                ▼
         ┌──────────────────┐
         │ getStatus query  │
         │ - ua_west_raid_active
         │ - ua_oblasts[]
         └──────┬───────────┘
                │
                ▼
         ┌──────────────────┐
         │ Polish Home UI   │
         │ (secondary strip)│
         └──────────────────┘
```

## API Response Handling

The poller is designed to handle multiple possible API response formats from alerts.in.ua:

### Format 1: Object with oblast keys

```json
{
  "lviv": { "active": true },
  "volyn": { "alert": true },
  "rivne": false,
  "zakarpattia": null
}
```

### Format 2: Array of alert objects

```json
[
  { "oblast": "Lviv", "type": "air_raid" },
  { "region": "Volyn", "status": "active" }
]
```

### Format 3: Boolean values

```json
{
  "lviv": true,
  "volyn": false
}
```

The parser uses type guards to safely handle all formats without runtime errors.

## Configuration

### Environment Variables

- `ALERTS_IN_UA_TOKEN`: API token for alerts.in.ua (optional)
  - If set: Polls API and provides real data
  - If not set: Skips polling gracefully, shows null freshness

### Configurable Oblast List

Currently hardcoded in `alertsInUaPoller.ts`:

```typescript
const westernOblasts = ['volyn', 'lviv', 'rivne', 'zakarpattia'];
```

To add more oblasts, simply extend this array.

### Rate Limiting

- Poll interval: 25 seconds (~2.4 req/min)
- Well below typical API rate limits of 3-5 req/min
- Convex cron handles scheduling automatically

## UI/UX Guidelines

### Placement

The UA correlator appears **below** the main RCB situation strip, styled as a secondary indicator:

1. **Primary**: RCB air alert strip (large, prominent)
2. **Secondary**: UA western raid correlator (small, calm)
3. **Tertiary**: Event feed

### Wording

**Correct** (calm, informative):
- "Aktywne alarmy (lviv, volyn)"
- "Brak aktywnych alarmów"

**NEVER use** (panic-inducing):
- "Atak na Polskę"
- "Poland under attack"
- "Zagrożenie dla Polski"

The UA correlator provides **context** for Polish air activity, not a direct threat indicator.

## Trust Rules Compliance

| Rule | Implementation | Verification |
|------|----------------|--------------|
| Edge-only events | `ua_raid_state` tracks previous state | ✅ Code review |
| Western oblasts config | 4 oblasts hardcoded | ✅ Code review |
| Rate limit ~20-30s | 25s Convex cron | ✅ Code review |
| Never "Poland attack" | UI wording reviewed | ✅ Code review |
| Never primary strip | Secondary placement | ✅ Code review |
| Strip priority correct | RCB/DORSZ take precedence | ✅ Code review |
| Graceful token handling | Try-catch + skip on missing | ✅ Code review |
| Status endpoint wired | `getStatus` returns UA fields | ✅ Code review |
| Confidence: official | Events marked `confidence: 'official'` | ✅ Code review |

## Testing Scenarios

### Without Token (Production-ready)

1. App starts without `ALERTS_IN_UA_TOKEN`
2. Poller logs "ALERTS_IN_UA_TOKEN not set - skipping"
3. `sources_freshness.alerts_in_ua` is `null`
4. UI shows "token nie skonfigurowany"
5. ✅ No crashes, no errors

### With Token (Full functionality)

1. Set `ALERTS_IN_UA_TOKEN` environment variable
2. Wait for first poll (up to 25s)
3. Check Convex logs for "Polling alerts.in.ua..."
4. Verify `sources_freshness.alerts_in_ua` updates
5. Verify UI shows current raid status

### Edge Detection

1. Start with no active raids
2. Raid starts in Lviv
3. ✅ Event created with type `ua_raid_west`
4. Raid continues (multiple polls)
5. ✅ No additional events created
6. Raid ends
7. ✅ No event created on inactive transition

## Monitoring

### Health Check

```bash
curl http://localhost:5173/api/v1/status
```

Look for:
- `ua_west_raid_active`: true/false
- `ua_oblasts`: ["lviv", ...]
- `sources_freshness.alerts_in_ua`: ISO timestamp or null

### Convex Dashboard

In Convex dashboard, monitor:
- `ua_raid_state` table: Current active oblasts
- `events` table: Filter by `type = "ua_raid_west"`
- `source_status` table: `source_name = "alerts_in_ua"`

### Logs

Look for:
- "Polling alerts.in.ua for western oblasts..."
- "Active western oblasts: lviv, volyn"
- "UA raid edge detected! Active oblasts: lviv"

## Future Enhancements (Out of Scope for MVP)

1. **Configurable oblasts**: Move to environment variable or database
2. **Historical tracking**: Store raid duration and frequency stats
3. **Notification triggers**: Alert on edge detection (with user opt-in)
4. **Map visualization**: Show active oblasts on MapLibre layer
5. **Correlation scoring**: Smart heuristics for Polish air activity prediction

## Maintenance

### API Changes

If alerts.in.ua changes their API:

1. Update response parsing in `parseActiveWesternOblasts()`
2. Add new format handling with type guards
3. Test with sample responses
4. Update this documentation

### Rate Limit Issues

If rate limiting occurs:

1. Increase poll interval in `convex/crons.ts`
2. Current: 25s → Suggested: 30s or 60s
3. Update README.md documentation

### New Oblasts

To add new western oblasts:

1. Update `westernOblasts` array in `alertsInUaPoller.ts`
2. Add transliteration variations if needed
3. Update README.md and this document

## Questions & Answers

**Q: Why not emit events on inactive transitions?**
A: Inactive transitions (raid ends) are less actionable. The event feed should focus on new developments.

**Q: Why 25 seconds instead of 30?**
A: 25s = 2.4 req/min gives headroom below 3 req/min limit while staying responsive.

**Q: Why not real-time WebSocket?**
A: alerts.in.ua may not offer WebSocket. Polling is simple, reliable, and sufficient for MVP.

**Q: Can users configure which oblasts to track?**
A: Not in MVP. All 4 western oblasts are tracked by default. Future enhancement.

**Q: What if the API is down?**
A: Poller marks status as 'error' but app continues. UI shows last known freshness timestamp.

## Related Files

- `convex/alertsInUaPoller.ts` - Poller implementation
- `convex/mutations.ts` - `updateUaRaidState` mutation
- `convex/queries.ts` - `getStatus` query updates
- `convex/schema.ts` - `ua_raid_state` table definition
- `convex/crons.ts` - 25s polling schedule
- `src/routes/+page.svelte` - UI implementation
- `README.md` - User-facing documentation

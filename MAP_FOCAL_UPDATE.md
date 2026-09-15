# Map-Focal Architecture Update

**Date:** 2026-09-15  
**PR:** [#4](https://github.com/PiotrGorczyca/granica-alert/pull/4)  
**Branch:** `cursor/desktop-nav-interactive-map-696d`

## Product Guidance Applied

**Source:** Interim product/UX guidance from Researcher

> **Product:** Map is focal, still calm. Not Osiris.
>
> **Recommended IA:** Home (or default tab) = **full-bleed MapLibre** with a **compact floating status strip** (Spokojnie / Alert RCB) overlaid top; bottom nav fixed and working on desktop (don't use mobile-only fixed nav that breaks ≥md). Feed can be a bottom sheet / side panel on desktop, not the whole page.
>
> **Layers (MVP only):** (1) EP R134 polygon (2) Event pins from Convex (3) Static context pins (Dorohusk, etc.). Toggle chips, max ~3. No ADS-B default.
>
> **Popups:** type · time · plain title · violation · Źródło link. No scores/arcs.
>
> **Desktop nav fix:** ensure bottom nav works OR switch to side/top nav ≥768px so map controls aren't covered; hit-targets and `pb-` safe area.
>
> **Aesthetic:** modern MapLibre (soft light or muted dark basemap), sage/amber from calm palette, generous map height (70–100vh minus chrome).

---

## What Changed from Original Implementation

### Original Design (Commit 6b2be98)

**Home Page:** Feed-first view with status strip, correlator, event cards
- Full-width content layout
- Map was a separate `/map` route (stub → interactive)
- Feed dominated the home experience
- Map preview card linked to `/map`

**Navigation:**
- Dom (home) / Mapa (map) / Źródła / Ustawienia

### Map-Focal Design (Commit 177aa8f)

**Home Page:** Map-first view with floating overlays
- Full-bleed MapLibre canvas (calc(100vh - 4rem))
- Compact status strip (top-left overlay)
- Layer toggle chips (top-right overlay)
- Feed accessible via sliding panel (on-demand)

**Navigation:**
- **Mapa (home)** / Lista (feed) / Źródła / Ustawienia

---

## Architecture Comparison

### Before (Feed-First)

```
┌─────────────────────────────────────────┐
│ Header: Granica Alert                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ STATUS STRIP (hero)             │   │ ← Large status section
│  │ ○ Spokojnie / Alert RCB         │   │
│  │ Ostatnia aktualizacja 15:28     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ UA Zachód: Brak alarmów         │   │ ← Correlator strip
│  └─────────────────────────────────┘   │
│                                         │
│  [Teraz (aktywne)]                      │
│  ┌─────────────────────────────────┐   │
│  │ RCB powietrzny · aktywny        │   │
│  │ 2h temu · Naruszenie: nie       │   │ ← Event cards
│  └─────────────────────────────────┘   │
│                                         │
│  [Ostatnie (zakończone)]                │
│  ┌─────────────────────────────────┐   │
│  │ RCB powietrzny · zakończony     │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│  (more event cards...)                  │
│                                         │
│  [Map Preview Card] → /map              │ ← Link to map
│  [Disclaimer]                           │
├─────────────────────────────────────────┤
│ Dom | Mapa | Źródła | Ustawienia      │ ← Bottom nav
└─────────────────────────────────────────┘
```

**Focus:** Event feed with map as secondary feature

### After (Map-Focal)

```
┌─────────────────────────────────────────┐
│ [Status:          [Layer  ┐            │
│  Spokojnie]        Toggles]│            │ ← Compact overlays
│                            │            │
│         Full-Bleed         │            │
│      MapLibre Canvas       │            │
│    (OSM + 3 layer types)   │            │
│                            │            │
│    • Event pins (amber)    │            │
│    • EP R134 (amber poly)  │            │ ← Map dominates
│    • Border points (blue)  │            │
│                            │            │
│                 [Wydarzenia: 5] ←┐     │ ← Feed toggle
│                                  │     │
│ ┌─────────────────────────────── │ ── ┐│
│ │ FEED PANEL (sliding)           │    ││ ← On-demand panel
│ │ Teraz (aktywne) + Ostatnie     │    ││   (desktop: side)
│ │ [Close X]                      │    ││   (mobile: bottom)
│ └──────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ Mapa | Lista | Źródła | Ustawienia    │ ← Bottom nav (z-50)
└─────────────────────────────────────────┘
```

**Focus:** Interactive map with feed as accessory

---

## New Components

### 1. CompactStatusStrip.svelte

**Purpose:** Minimal status overlay for map view

**Location:** Top-left overlay on home

**Features:**
- Compact card (~max-w-md)
- Status indicator dot (green/amber)
- Heading: "Spokojnie" / "Alert RCB aktywny"
- Subtext: "Brak aktywnego alertu" / "Lotnictwo RP operuje"
- Violation badge (when applicable)
- UA correlator one-liner (if data available)
- Timestamp + RCB link
- Backdrop blur for legibility over map

**Design:**
- Border-left accent (4px, calm/attention color)
- Surface/95 background with blur
- Responsive: full-width on mobile, max-w-md on desktop

### 2. MapLayerToggles.svelte

**Purpose:** Toggle visibility of map layers

**Location:** Top-right overlay on home

**Features:**
- Compact toggle chip UI
- Max 3 toggles (per guidance):
  1. 🟨 EP R134 (restricted zone)
  2. 📍 Punkty (border crossings + context)
  3. ⚡ Wydarzenia (event pins from Convex)
- Collapsible to icon-only
- Checkboxes with emoji + label

**Reactivity:**
- Svelte 5 `$bindable` for two-way binding
- Parent passes `activeLayers` object
- Child updates on toggle
- Map watches `activeLayers` with `$effect`

### 3. EventFeedPanel.svelte

**Purpose:** Sliding panel with event feed

**Location:** Triggered by "Wydarzenia" button

**Features:**
- Header: "Wydarzenia" + close button
- Scrollable content:
  - "Teraz (aktywne)" section (amber border cards)
  - "Ostatnie" section (neutral cards)
- Footer: link to "/sources"
- Event cards:
  - Type badge + relative time
  - Title
  - Violation status (if applicable)
  - Źródło link

**Layout:**
- **Desktop:** 384px side panel from right
- **Mobile:** 60vh bottom sheet from bottom
- Border-left (desktop) or border-top (mobile)
- Shadow-2xl for elevation

---

## Map Enhancements

### Event Pins (New)

**Source:** `eventsToGeoJSON(events)` helper function

**Mapping:**
```javascript
events
  .filter(e => e.type !== 'notam_zone')  // No pins for zone-only events
  .map(event => ({
    type: 'Feature',
    properties: {
      title: event.title,
      type: event.type,
      published_at: event.published_at,
      source_url: event.source_url,
      source_name: event.source_name,
      polish_airspace_violation: event.polish_airspace_violation
    },
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]  // Currently randomized; TODO: geocode
    }
  }))
```

**Styling:**
```javascript
'circle-color': [
  'match',
  ['get', 'type'],
  'rcb_air', '#B86A1C',        // Amber
  'dorsz_violation', '#A9483D', // Coral
  'incident', '#A9483D',        // Coral
  '#3A5F7A'                     // Info blue (default)
]
```

**Popups (Per Guidance):**
```
┌────────────────────────────┐
│ RCB powietrzny · 2h temu   │ ← type · time
│ Lotnictwo RP operuje       │ ← plain title
│ Naruszenie RP: Nie         │ ← violation (if applicable)
│ Źródło ↗                   │ ← link
└────────────────────────────┘
```

**NO:**
- Threat scores
- Risk percentages
- Missile arcs
- ADS-B real-time tracks

### Layer Visibility Toggles

**Implementation:** Svelte 5 `$effect` for reactivity

```javascript
$effect(() => {
  if (map && map.isStyleLoaded()) {
    // EP R134
    if (map.getLayer('ep-r134-fill')) {
      map.setLayoutProperty('ep-r134-fill', 'visibility', 
        activeLayers.epR134 ? 'visible' : 'none');
      map.setLayoutProperty('ep-r134-outline', 'visibility', 
        activeLayers.epR134 ? 'visible' : 'none');
    }
    // Border points
    if (map.getLayer('border-points')) {
      map.setLayoutProperty('border-points', 'visibility', 
        activeLayers.borderPoints ? 'visible' : 'none');
      map.setLayoutProperty('border-points-labels', 'visibility', 
        activeLayers.borderPoints ? 'visible' : 'none');
    }
    // Event pins
    if (map.getLayer('event-pins')) {
      map.setLayoutProperty('event-pins', 'visibility', 
        activeLayers.events ? 'visible' : 'none');
    }
  }
});
```

**Benefits:**
- Reactive to `activeLayers` prop changes
- No manual event listeners
- Idiomatic Svelte 5

### Dynamic Event Updates

**Implementation:** Another `$effect` watches `events` prop

```javascript
$effect(() => {
  if (map && map.isStyleLoaded() && map.getSource('event-pins')) {
    const source = map.getSource('event-pins');
    source.setData(eventsToGeoJSON(events));
  }
});
```

**Behavior:**
- When parent component receives new events from Convex
- Map automatically updates event pins
- No page reload required

---

## Information Architecture

### Route Map

| Route | View | Purpose |
|-------|------|---------|
| `/` | **Map-focal** | Primary experience: full-bleed map + overlays |
| `/feed` | **List-focused** | Full event list (old home page) |
| `/map` | Legacy | Kept for backwards compat; home is primary map |
| `/sources` | Trust page | Disclaimer, sources, what we don't do |
| `/settings` | Settings | Language, region, notifications (future) |

### Bottom Navigation Update

**Before:**
```
Dom (🏠) | Mapa (🗺️) | Źródła (📄) | Ustawienia (⚙️)
```

**After:**
```
Mapa (🗺️) | Lista (☰) | Źródła (📄) | Ustawienia (⚙️)
```

**Rationale:**
- "Dom" ambiguous when home IS the map
- "Mapa" clearer label for map-focal experience
- "Lista" indicates list/feed view
- Icon updated: home → map, map → list

---

## Responsive Behavior

### Desktop (≥768px)

**Status Overlay:**
- Position: `absolute left-4 top-4 md:left-6 md:max-w-md`
- Max-width: 448px (prevents stretching)
- Clear of map controls

**Layer Toggles:**
- Position: `absolute right-4 top-4 md:right-6`
- Compact card, collapses to icon

**Feed Toggle Button:**
- Position: `absolute right-4 md:right-6 md:top-24`
- Visible badge count
- Text label: "Wydarzenia"

**Feed Panel (when open):**
- Position: `absolute inset-y-0 right-0 w-96`
- Slides in from right (384px)
- Border-left, rounded-l-2xl
- Full height, scrollable

### Mobile (<768px)

**Status Overlay:**
- Position: `absolute left-4 right-4 top-4`
- Full-width with margins
- Responsive padding

**Layer Toggles:**
- Position: `absolute right-4 top-4`
- Icon-only (collapsed by default)

**Feed Toggle Button:**
- Position: `absolute bottom-6 right-4`
- Above bottom nav (safe area)
- Icon + count badge (no text)

**Feed Panel (when open):**
- Position: `absolute inset-x-0 bottom-0 max-h-[60vh]`
- Slides up from bottom
- Border-top, rounded-t-2xl
- 60vh max, scrollable

---

## Data Flow

### Layout Loader (`+layout.ts`)

```javascript
export const load: LayoutLoad = async () => {
  const [status, events] = await Promise.all([
    convex.query(api.queries.getStatus, {}),
    convex.query(api.queries.getEvents, { limit: 20 })
  ]);
  return { status, events };
};
```

**Shared by all pages:**
- Home (map view)
- Feed (list view)
- Map (legacy)
- Sources, Settings

### Home Page (`+page.svelte`)

```javascript
export const load: PageLoad = async ({ parent }) => {
  const parentData = await parent();
  return {
    status: parentData.status || null,
    events: parentData.events || []
  };
};
```

**Props passed to components:**
- `InteractiveMap`: events, activeLayers
- `CompactStatusStrip`: status
- `EventFeedPanel`: events, status

---

## Design Compliance

### Calm Palette (Maintained)

| Element | Color | Hex | Opacity |
|---------|-------|-----|---------|
| Status idle | Calm green | #2F6F5E | 100% |
| Status active | Attention amber | #B86A1C | 100% |
| EP R134 fill | Attention amber | #B86A1C | 20% |
| EP R134 outline | Attention amber | #B86A1C | 100% |
| Event pin (RCB) | Attention amber | #B86A1C | 100% |
| Event pin (violation) | Critical coral | #A9483D | 100% |
| Event pin (other) | Info blue | #3A5F7A | 100% |
| Border pins | Info blue | #3A5F7A | 100% |
| Context pins | Muted gray | #5C6675 | 100% |

**Never used:**
- Blood red (#FF0000)
- Panic orange (#FF6600)
- War-room black (#000000)

### Modern MapLibre Aesthetic

**Basemap:** OSM soft light
- Not satellite (too busy)
- Not dark mode (calm = light by default)
- Good Poland/Eastern Europe coverage

**Map Height:** `calc(100vh - 4rem)`
- 100vh: full viewport
- -4rem: bottom nav clearance
- Result: ~90-95vh on most devices

**Overlays:**
- Floating cards with shadows
- Backdrop blur for legibility
- Rounded corners (lg: 0.5rem)
- Pointer-events pattern:
  - Container: `pointer-events-none` (lets map clicks through)
  - Cards: `pointer-events-auto` (restores interactivity)

---

## Known Limitations & Future Work

### 1. Event Pin Coordinates

**Current:** Randomized within eastern Poland bounding box

```javascript
coordinates: [
  23.7 + Math.random() * 0.6,  // lng: 23.7-24.3
  50.8 + Math.random() * 0.8   // lat: 50.8-51.6
]
```

**TODO:**
- Geocode RCB komunikaty (parse location mentions)
- Use DORSZ coordinates when available
- Manual curate historical incidents (Tarnawa, etc.)
- Add `coordinates` field to Convex schema

### 2. Layer Toggle Persistence

**Current:** Toggles reset on page reload

**TODO:**
- Store `activeLayers` in localStorage
- Restore on mount
- User preference per session

### 3. Feed Panel State

**Current:** Panel closes on navigation

**TODO:**
- Persist `showFeed` state across routes?
- Or: keep closed on nav (current behavior is fine)

### 4. Mobile Portrait vs Landscape

**Current:** Bottom sheet same height both orientations

**TODO:**
- Reduce max-h in landscape (40vh vs 60vh)
- Or: use side panel in landscape (treat like desktop)

### 5. ADS-B Layer

**Status:** Deferred per ToS concerns

**TODO:**
- Negotiate OpenSky API usage terms
- Implement as optional toggle (off by default)
- Clear disclaimer: "Civil traffic ≠ threat"
- Rate-limit polling

---

## Testing Checklist

### Map-Focal Home

- [ ] Map renders full-bleed on `/`
- [ ] Status strip visible top-left
- [ ] Layer toggles visible top-right
- [ ] All 3 layer types toggle correctly
- [ ] Event pins appear (if events loaded)
- [ ] Click event pin → popup with type/time/title/violation/link
- [ ] Click EP R134 → popup with zone info
- [ ] Click border pin → popup with crossing info

### Event Feed Panel

- [ ] Click "Wydarzenia" button → panel opens
- [ ] Desktop: slides in from right (384px)
- [ ] Mobile: slides up from bottom (60vh)
- [ ] "Teraz (aktywne)" section shows active events
- [ ] "Ostatnie" section shows recent events
- [ ] Close button works
- [ ] Scrolling works
- [ ] Footer link to "/sources" works

### Navigation

- [ ] Bottom nav: "Mapa" navigates to `/`
- [ ] Bottom nav: "Lista" navigates to `/feed`
- [ ] Bottom nav: "Źródła" navigates to `/sources`
- [ ] Bottom nav: "Ustawienia" navigates to `/settings`
- [ ] Active state highlights correct tab
- [ ] Nav stays above all content (z-50)

### Responsive

- [ ] Desktop: status max-w-md, feed side panel
- [ ] Mobile: status full-width, feed bottom sheet
- [ ] Landscape mobile: check layout
- [ ] Tablet: check breakpoints

---

## Files Changed

### New Files
```
src/lib/components/CompactStatusStrip.svelte
src/lib/components/EventFeedPanel.svelte
src/lib/components/MapLayerToggles.svelte
src/routes/feed/+page.svelte
src/routes/feed/+page.ts
MAP_FOCAL_UPDATE.md
```

### Modified Files
```
src/routes/+page.svelte (feed-first → map-focal)
src/lib/components/InteractiveMap.svelte (event pins, layer toggles)
src/lib/components/BottomNav.svelte (nav labels/icons)
src/routes/+layout.ts (load events for all pages)
```

### Legacy/Reference
```
src/routes/+page.svelte.old (original feed-first home)
src/routes/map/+page.svelte.redirect (placeholder)
```

---

## Acceptance Criteria

From interim product guidance:

✅ **Home = full-bleed MapLibre** — implemented  
✅ **Compact floating status strip** — CompactStatusStrip component  
✅ **Bottom nav fixed and working on desktop** — z-50 fix from original PR  
✅ **Feed as bottom sheet / side panel** — EventFeedPanel component  
✅ **Layers: (1) EP R134 (2) Event pins (3) Context pins** — all implemented  
✅ **Toggle chips, max ~3** — MapLayerToggles with 3 toggles  
✅ **No ADS-B default** — deferred  
✅ **Popups: type · time · title · violation · Źródło** — implemented  
✅ **Modern MapLibre (soft light basemap)** — OSM tiles  
✅ **Sage/amber from calm palette** — color tokens maintained  
✅ **Generous map height (70–100vh minus chrome)** — calc(100vh - 4rem)  

---

**Implementation complete. Map is now the focal point while preserving calm civilian aesthetic.**

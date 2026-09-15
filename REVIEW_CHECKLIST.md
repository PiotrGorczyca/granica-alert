# Review Checklist: Desktop Nav Fix + Interactive Map

**PR:** [#4](https://github.com/PiotrGorczyca/granica-alert/pull/4)  
**Branch:** `cursor/desktop-nav-interactive-map-696d`

---

## 📋 Pre-Merge Checklist

### Code Quality

- [x] TypeScript type check passes (`npm run check`)
- [ ] Build succeeds with VITE_CONVEX_URL set
- [x] No new linter warnings introduced
- [x] Components follow Svelte 5 patterns ($props, $state, $derived)

### Desktop Navigation Fix

#### Visual Inspection
- [ ] Bottom nav visible on desktop (1920×1080)
- [ ] Bottom nav visible on laptop (1366×768)
- [ ] All 4 nav items have adequate spacing
- [ ] Touch targets feel clickable (no accidental misses)

#### Functional Testing
- [ ] Click "Dom" → navigate to home
- [ ] Click "Mapa" → navigate to map
- [ ] Click "Źródła" → navigate to sources
- [ ] Click "Ustawienia" → navigate to settings
- [ ] Active state highlights correct tab
- [ ] Hover state shows on non-active tabs

#### Stacking Context
- [ ] Nav stays above page content (no overlaps)
- [ ] Nav doesn't cover important content on any page
- [ ] Footer doesn't overlap nav
- [ ] Bottom padding (pb-16) prevents feed from hiding behind nav

### Interactive Map

#### Map Rendering
- [ ] OSM tiles load correctly
- [ ] Map centered on eastern Poland (~23.5°E, 51°N)
- [ ] Initial zoom level appropriate (7)
- [ ] Navigation controls (zoom +/-) work
- [ ] Scale bar visible in bottom-left
- [ ] Map attribution shows "© OpenStreetMap contributors"

#### EP R134 Zone
- [ ] Amber polygon visible
- [ ] Dashed border (2px, amber)
- [ ] Fill opacity looks calm (not alarming)
- [ ] Click zone → popup appears with name + description
- [ ] Popup shows: "EP R134" + validity dates

#### Border Crossing Pins
- [ ] Dorohusk–Yahodyn pin visible (blue)
- [ ] Korytnica pin visible (blue)
- [ ] Medyka–Szeginie pin visible (blue)
- [ ] Hrebenne pin visible (blue)
- [ ] Terespol–Brześć pin visible (blue)
- [ ] All pins have labels
- [ ] Click any pin → popup with name + description
- [ ] Hover pin → cursor changes to pointer

#### Context Pins
- [ ] Korytarz Suwalski pin visible (gray)
- [ ] Obwód Kaliningrad pin visible (gray)
- [ ] Labels readable at default zoom
- [ ] Click → popups work

#### Interactions
- [ ] Pan map (drag) works smoothly
- [ ] Zoom with scroll wheel works
- [ ] Double-click zoom works
- [ ] Pinch zoom on mobile/trackpad works
- [ ] Popups close when clicking elsewhere
- [ ] Multiple popups don't stack awkwardly

### Status Overlay (Top-Left)

#### Layout
- [ ] Card positioned top-left with margin
- [ ] Card doesn't overlap map controls
- [ ] Card readable against map background
- [ ] Shadow/border makes it clearly a card

#### Content
- [ ] Shows "Spokojnie" when idle (or "Alert RCB aktywny" when active)
- [ ] Color-coded dot matches state (green/amber)
- [ ] Left border accent correct color
- [ ] Polish airspace violation status shows when applicable
- [ ] UA correlator line present (if data available)
- [ ] Timestamp shows "Aktualizacja: DD.MM HH:MM"
- [ ] "RCB ↗" link works → opens gov.pl

#### Responsive
- [ ] Compact on small screens (doesn't dominate viewport)
- [ ] Readable on mobile portrait
- [ ] Readable on mobile landscape

### Map Legend (Top-Right)

#### Layout
- [ ] Card positioned top-right with margin
- [ ] Doesn't overlap nav controls
- [ ] Max-width appropriate (doesn't stretch too wide)

#### Functionality
- [ ] Default state: expanded
- [ ] Click header → collapses
- [ ] Click again → expands
- [ ] Chevron icon rotates on toggle
- [ ] Animation smooth

#### Content
- [ ] EP R134 symbol matches map (amber dashed)
- [ ] Border crossing symbol matches pins (blue dot)
- [ ] Context symbol matches pins (gray dot)
- [ ] "Czego NIE pokazuje mapa" section clear
- [ ] Lists: drones, missiles, secrets, flights
- [ ] Disclaimer at bottom readable

### Info Card (Bottom)

#### Layout
- [ ] Card visible at bottom center or bottom-left
- [ ] Doesn't overlap bottom nav
- [ ] On mobile: not too tall (doesn't cover map)
- [ ] Desktop: appropriate width (not full-width)

#### Content
- [ ] Heading: "O mapie"
- [ ] Description explains map purpose
- [ ] Text readable (not too small)

### Home Page Map Preview

#### Layout
- [ ] Card appears above disclaimer section
- [ ] Full-width within max-w-4xl container
- [ ] Border: 2px info blue
- [ ] Background: info-bg (soft blue)

#### Content
- [ ] Map icon on left
- [ ] Heading: "Zobacz mapę interaktywną"
- [ ] Subtext: "Strefa EP R134, przejścia graniczne..."
- [ ] Chevron right on right

#### Interactions
- [ ] Hover → border changes to calm, shadow increases
- [ ] Click anywhere on card → navigate to /map
- [ ] Cursor: pointer

### Mobile Testing

#### Navigation
- [ ] Bottom nav visible on mobile (iOS Safari)
- [ ] Bottom nav visible on mobile (Android Chrome)
- [ ] Touch targets adequate (no accidental misses)
- [ ] Active state clear

#### Map Page Mobile
- [ ] Map full-screen below header
- [ ] Status overlay readable (doesn't cover too much)
- [ ] Legend accessible (not cut off)
- [ ] Info card doesn't hide map completely
- [ ] Pinch zoom works
- [ ] Pan works with touch

#### Portrait vs Landscape
- [ ] Map usable in portrait
- [ ] Map usable in landscape
- [ ] Overlays reposition appropriately
- [ ] Bottom nav still accessible

### Desktop Testing

#### Browsers
- [ ] Chrome: all features work
- [ ] Firefox: all features work
- [ ] Safari: all features work
- [ ] Edge: all features work

#### Viewports
- [ ] 1920×1080 (full HD): layout appropriate
- [ ] 1366×768 (laptop): no awkward breaks
- [ ] 2560×1440 (2K): max-width prevents stretching
- [ ] 3840×2160 (4K): map + overlays scale well

### Accessibility

#### Keyboard Navigation
- [ ] Tab through bottom nav items
- [ ] Enter/Space activates nav links
- [ ] Legend toggle keyboard-accessible
- [ ] Map controls keyboard-accessible

#### Screen Reader
- [ ] Nav labels announced correctly
- [ ] Map has appropriate aria-label
- [ ] Status overlay content readable
- [ ] Legend content structure logical

#### Color Contrast
- [ ] Status text meets WCAG AA (4.5:1)
- [ ] Legend text readable
- [ ] Nav labels readable
- [ ] Popups readable against map

### Performance

#### Load Time
- [ ] Map tiles load within 2-3 seconds on good connection
- [ ] No blocking/freezing during tile load
- [ ] Overlays render immediately (not after tiles)

#### Interaction Smoothness
- [ ] Pan/zoom feels responsive
- [ ] No lag when clicking pins
- [ ] Popups appear instantly
- [ ] Legend toggle smooth

#### Bundle Size
- [ ] Check maplibre-gl added size (expected ~500kb)
- [ ] No duplicate dependencies
- [ ] CSS properly tree-shaken

### Design Compliance

#### Calm Palette
- [ ] EP R134: amber (#B86A1C), not red
- [ ] Status: green (#2F6F5E) idle, amber (#B86A1C) active
- [ ] Border crossings: info blue (#3A5F7A)
- [ ] Context: muted gray (#5C6675)
- [ ] NO blood-red anywhere

#### Calm Aesthetic
- [ ] No strobing/flashing
- [ ] No war-room clutter
- [ ] Status glanceable, not dominating
- [ ] Map feels modern but calm

#### Trust/Transparency
- [ ] Legend disclaimer visible
- [ ] "What is NOT shown" section clear
- [ ] No fake confidence (threat scores)
- [ ] Links to official sources work

### Edge Cases

#### Data States
- [ ] Map works when status is null
- [ ] Map works when UA correlator unavailable
- [ ] Popups handle missing descriptions gracefully
- [ ] Status overlay handles missing timestamps

#### Network Issues
- [ ] Map shows loading state when tiles slow
- [ ] Tiles retry on failure
- [ ] Status overlay shows stale data with warning

#### Unusual Inputs
- [ ] Very long EP R134 description doesn't break popup
- [ ] Unicode in place names renders correctly
- [ ] Special characters in status don't break layout

---

## 🚫 Blockers (Must Fix Before Merge)

- [ ] Desktop nav still not clickable → investigate z-index further
- [ ] Map tiles not loading → check CORS/CSP
- [ ] EP R134 polygon not visible → verify GeoJSON syntax
- [ ] Popups don't open → check event handlers
- [ ] Mobile completely broken → responsive issues

---

## ⚠️ Nice-to-Haves (Can Defer)

- [ ] EP R134 coordinates from official NOTAM (currently approximate)
- [ ] Event pins from Convex API (future PR)
- [ ] Voivodeship boundaries (optional)
- [ ] ADS-B layer (deferred per ToS)

---

## 📝 Review Notes

**Reviewer Name:** _____________  
**Date:** _____________

### What Works Well


### Issues Found


### Suggestions


---

## ✅ Final Sign-Off

- [ ] All critical items checked
- [ ] No major bugs found
- [ ] Design matches brief
- [ ] Calm aesthetic maintained
- [ ] Ready to merge

**Approved by:** _____________  
**Date:** _____________

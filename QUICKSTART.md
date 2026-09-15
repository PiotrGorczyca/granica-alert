# Quick Start: Testing the Interactive Map PR

**PR:** [#4 - Fix desktop nav and implement interactive map](https://github.com/PiotrGorczyca/granica-alert/pull/4)  
**Branch:** `cursor/desktop-nav-interactive-map-696d`

---

## 🚀 Local Development Setup (5 minutes)

### 1. Clone and Switch Branch

```bash
git clone https://github.com/PiotrGorczyca/granica-alert
cd granica-alert
git checkout cursor/desktop-nav-interactive-map-696d
```

### 2. Install Dependencies

```bash
npm install
```

**What's new:**
- `maplibre-gl` — map rendering library (~500kb)

### 3. Set Up Convex (Required for Status Data)

Create `.env.local`:

```bash
cat > .env.local << EOF
VITE_CONVEX_URL=https://your-deployment.convex.cloud
EOF
```

**Don't have Convex setup?** The map will still work, but status overlay will show loading/error state.

### 4. Run Dev Server

```bash
npm run dev
```

Visit: http://localhost:5173

---

## 🧪 What to Test

### Desktop Navigation Bug Fix

1. **Open in desktop browser** (viewport ≥1024px)
2. **Click bottom nav items:**
   - Dom → should navigate to home
   - Mapa → should navigate to map
   - Źródła → should navigate to sources
   - Ustawienia → should navigate to settings
3. **Check active state:** Current page should have green text
4. **Hover:** Non-active items should darken on hover

**Expected:** All clicks work reliably. No need to scroll to find nav.

---

### Interactive Map

#### Quick Visual Check (30 seconds)

1. Click **"Mapa"** in bottom nav
2. **See:**
   - Map tiles load (OpenStreetMap)
   - Amber polygon in center-ish area (EP R134)
   - Blue/gray pins scattered around
   - Status card (top-left): "Spokojnie" or "Alert RCB aktywny"
   - Legend card (top-right): Collapsible
   - Info card (bottom)

#### Detailed Testing (5 minutes)

**EP R134 Restricted Zone:**
```
1. Pan map to center-right area
2. Look for amber dashed outline polygon
3. Click inside polygon
4. Popup should appear: "EP R134" + description
5. Click X or elsewhere to close popup
```

**Border Crossing Pins:**
```
1. Zoom in or pan to find blue pins
2. Pins should have labels (e.g., "Dorohusk–Yahodyn")
3. Click a blue pin
4. Popup: crossing name + description
5. Try clicking multiple pins
```

**Context Pins:**
```
1. Look for gray pins (Korytarz Suwalski, Kaliningrad)
2. Click gray pin
3. Popup: context name + description
```

**Status Overlay (top-left):**
```
1. Check card shows current RCB status
2. If Convex connected: "Spokojnie" or "Alert RCB aktywny"
3. Green/amber dot next to status
4. "Aktualizacja" timestamp
5. "RCB ↗" link clickable
```

**Legend (top-right):**
```
1. Click "Legenda mapy" header
2. Legend should collapse
3. Click again → expands
4. Read "Czego NIE pokazuje mapa" section
5. Verify disclaimer present
```

**Map Controls:**
```
1. Use zoom +/- buttons (top-right)
2. Drag map to pan
3. Scroll wheel to zoom
4. Double-click to zoom in
```

---

### Mobile Testing (Optional)

#### Responsive DevTools (Chrome)

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 14 Pro" or similar
4. Test:
   - Bottom nav still visible
   - Map fills viewport
   - Overlays don't cover too much
   - Touch/click interactions work

#### Real Device (Best)

1. Get local IP: `ip addr show` or `ifconfig`
2. Visit `http://<your-ip>:5173` on phone
3. Test pinch zoom, pan, tap pins

---

## ✅ Expected Behavior Summary

| Feature | Expected Behavior |
|---------|-------------------|
| **Desktop Nav** | All 4 items clickable, active state shows, z-50 keeps nav on top |
| **Map Tiles** | OSM tiles load within 2-3s, centered on eastern Poland |
| **EP R134 Zone** | Amber polygon, dashed border, clickable → popup |
| **Border Pins** | Blue pins (5), labeled, clickable → popups |
| **Context Pins** | Gray pins (2), labeled, clickable → popups |
| **Status Overlay** | Shows RCB state, green/amber indicator, timestamp |
| **Legend** | Collapsible, explains symbols, disclaimer present |
| **Interactions** | Pan/zoom smooth, popups instant, hover cursor changes |

---

## 🐛 Common Issues

### Map tiles not loading

**Symptoms:** Gray canvas, no map

**Fixes:**
1. Check internet connection
2. Check browser console for CORS errors
3. Disable ad blockers (may block OSM tiles)
4. Try different browser

### Status overlay shows "Loading..."

**Cause:** Convex URL not set or invalid

**Fix:**
```bash
# Check .env.local exists and has valid URL
cat .env.local
# Should show: VITE_CONVEX_URL=https://...
```

### Bottom nav still not clickable

**Cause:** CSS build issue or z-index conflict

**Fixes:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check DevTools Elements tab: nav should have `z-index: 50`
4. Inspect for overlapping elements

### Popups don't open

**Cause:** JavaScript error or event handler issue

**Fixes:**
1. Check browser console for errors
2. Verify MapLibre GL loaded: `window.maplibregl` should exist
3. Try clicking different pins/zones
4. Zoom in closer and retry

### Legend doesn't collapse

**Cause:** Svelte reactivity issue

**Fix:**
1. Hard refresh
2. Check console for errors
3. Try in different browser

---

## 📊 Performance Benchmarks

**Expected Load Times (good connection):**
- Initial page load: < 2s
- Map tiles appear: < 3s
- First interaction ready: < 4s

**Bundle Size Changes:**
- Before: ~180kb (gzipped)
- After: ~680kb (gzipped) — mostly MapLibre GL
- **Acceptable** for modern web app with interactive map

---

## 🎨 Design Verification

### Calm Palette Check

Open map page and verify colors:

| Element | Expected Color | Hex | Pass? |
|---------|---------------|-----|-------|
| EP R134 fill | Soft amber | #B86A1C @ 20% opacity | [ ] |
| EP R134 border | Amber | #B86A1C | [ ] |
| Border pins | Info blue | #3A5F7A | [ ] |
| Context pins | Muted gray | #5C6675 | [ ] |
| Status (idle) | Calm green | #2F6F5E | [ ] |
| Status (active) | Attention amber | #B86A1C | [ ] |

**No blood-red anywhere** (critical for calm aesthetic).

### Layout Check

- [ ] Map is full-bleed (fills viewport)
- [ ] Overlays are cards (shadow, rounded, floating)
- [ ] Status overlay doesn't dominate (compact)
- [ ] Legend collapsible (not always open eating space)
- [ ] Bottom nav accessible (z-50, above everything)

---

## 📸 Screenshot Checklist

For PR review, capture:

1. **Desktop map view** (1920×1080)
   - Full map with EP R134 visible
   - Status overlay + legend visible
   - Bottom nav in frame

2. **Map with popup** (desktop)
   - Click border pin
   - Screenshot with popup open

3. **Mobile map view** (375×667)
   - Full map
   - Overlays positioned correctly

4. **Home page map preview card** (desktop)
   - Show new "Zobacz mapę interaktywną" card
   - Highlight hover state if possible

5. **Legend expanded** (desktop)
   - Show full legend content
   - Highlight "Czego NIE pokazuje mapa" section

---

## 🔍 Code Review Quick Hits

### Key Files to Review

```
src/lib/components/InteractiveMap.svelte    # MapLibre integration
src/lib/components/MapLegend.svelte         # Collapsible legend
src/lib/components/StatusOverlay.svelte     # Compact status
src/lib/components/BottomNav.svelte         # z-50 fix
src/lib/data/ep-r134.json                   # Zone GeoJSON
src/lib/data/border-points.json             # Pins GeoJSON
src/routes/map/+page.svelte                 # Map layout
src/routes/+page.svelte                     # Map preview card
```

### What to Look For

**Good:**
- [x] TypeScript strict mode compliant
- [x] Svelte 5 patterns ($props, $state, $derived)
- [x] No magic numbers (colors defined in CSS vars)
- [x] Proper error handling (map load, popup clicks)
- [x] Accessibility (keyboard nav, ARIA labels)

**Watch Out For:**
- [ ] Hardcoded API keys (should be none)
- [ ] Memory leaks (map cleanup in onDestroy)
- [ ] Excessive re-renders (memoize event handlers)
- [ ] Large inline data (GeoJSON should be external)

---

## ⚡ Quick Test Script (30 seconds)

```bash
# From granica-alert directory
git checkout cursor/desktop-nav-interactive-map-696d
npm install
echo "VITE_CONVEX_URL=mock" > .env.local  # Optional if no Convex
npm run dev

# Open browser to http://localhost:5173
# Click "Mapa" → verify map loads
# Click EP R134 polygon → verify popup
# Click bottom nav items → verify navigation
# Close browser
# CTRL+C to stop dev server
```

**Pass if:** Map loads, popups work, nav works. ✅

---

## 📚 Documentation

- **Full implementation:** [MAP_IMPLEMENTATION.md](./MAP_IMPLEMENTATION.md)
- **High-level summary:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Review checklist:** [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md)
- **Product brief:** See uploaded `UX-BRIEF-CALM-PWA_20b8.md`
- **MVP spec:** See uploaded `MVP-SPEC_d93d.md`

---

## 🤝 Feedback

**Found a bug?** Comment on [PR #4](https://github.com/PiotrGorczyca/granica-alert/pull/4)

**Have questions?** Check [MAP_IMPLEMENTATION.md](./MAP_IMPLEMENTATION.md) first.

**Ready to merge?** See [REVIEW_CHECKLIST.md](./REVIEW_CHECKLIST.md) for sign-off.

---

**Happy testing! 🗺️**

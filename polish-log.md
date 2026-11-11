# Polish Loop Log — Design Exploration (`huashu-design` Gate)

**Target:** `d:\hackathon\hack-a-venture\design-demos\{thumbs,dir-1,dir-2,dir-3}.html`  
**Verification Method:** Headless Chromium CDP (`1440x900` desktop + emulated `390x844` mobile), DOM/console error collection, interactive tab/role-switch click verification, and direct visual inspection of all rendered PNG screenshots.

---

## Round 1 — Visual Defects Found on Initial Screenshots (`1440x900`)

1. **`thumbs.html` (Thumb 3 — Modular Role Console):**
   - Left rail width (`118px`) caused `"API NĐ 346/NHNN"` to wrap awkwardly onto two lines.
2. **`dir-1.html` (Swiss Civic War Room):**
   - `.legend` (`top: 12px; left: 12px`) and `.hover-readout` (`top: 12px; right: 12px`) floated over `.map-stage`, partially overlapping the northwestern and northeastern province polygons.
   - Right-column `.tabs` labels wrapped onto two lines (`"Hộ vay 1-Chạm (App/SMS)"`, `"Open API NĐ 346 & NHNN"`).
   - `.commune-strip` right-side loan counter (`"140 khoản vay"`) lacked `white-space: nowrap`, risking multi-line break on tight viewports.
   - Fixed `.topbar` height (`52px`) without wrapping lacked mobile (`390px`) adaptability.
3. **`dir-2.html` (Modular Role Console):**
   - `.layout` left rail (`236px`) wrapped items `"2. Giãn nợ 1-Chạm & Ngoại lệ"` and `"4. Open API Bảo hiểm & NHNN"` onto 2–3 lines with misaligned right badges (`TT 29`, `NĐ 346`).
   - `.map2` lacked an inline color legend explaining red/amber/blue/grey states.
4. **`dir-3.html` (Cartographic Night Desk):**
   - Absolute-positioned `.hud-top` (`top: 16px`) and `.hud-bottom` (`bottom: 16px`) overlapped upper/lower map borders.
   - Map lacked a color legend on the canvas.

---

## Round 2 — Fixes Applied & Re-Verification (`generate_design_demos.py` + `verify_demos.py`)

### Code Fixes Implemented
- **`thumbs.html`:** Widened Thumb 3 sidebar column from `118px` to `132px`, added `white-space: nowrap`, and shortened nav labels concisely.
- **`dir-1.html`:**
  - Replaced floating map overlays with a non-overlapping structured `.map-hud-bar` (`grid-template-columns: 1.25fr 1fr`) docked cleanly above `.map-svg-wrap` (`viewBox="-12 -10 784 520"`).
  - Shortened tab labels (`Hộ vay 1-Chạm`, `UBND Xã`, `Ca ngoại lệ`, `Open API NĐ 346`) with `white-space: nowrap; flex: 1;`.
  - Added `white-space: nowrap; flex-shrink: 0;` to the commune strip loan count.
  - Added `min-width: 0` on `.workspace > *`, `.map-col`, `.ops-col` and responsive stacking rules under `@media (max-width: 768px)`.
- **`dir-2.html`:**
  - Widened `.layout` left rail to `276px`, added `gap: 8px` and concise nav labels (`1. Kích hoạt xã & Bản đồ`, `2. Giãn nợ & Ngoại lệ`, `3. Xác nhận UBND Xã`, `4. Open API & NHNN`) with `white-space: nowrap; flex-shrink: 0;` badges so zero truncation ellipsis occurs on desktop.
  - Added an inline 4-state legend strip directly above `<svg id="map2" viewBox="-12 -10 784 520">`.
  - Added `min-width: 0` on Grid children and single-column KPI stacking under `@media (max-width: 760px)`.
- **`dir-3.html`:**
  - Refactored `.canvas-wrap` to `grid-template-rows: auto 1fr auto` so `.hud-top` and `.hud-bottom` dock above and below `.map3-stage` with zero polygon clipping.
  - Added `.hud-legend` anchored in the bottom-right corner over open Gulf of Tonkin water space.

### Verified Telemetry (`verify_demos.py` Latest Run)
| File | Desktop `1440×900` | Mobile `390×844` | JS Console / Runtime Errors | Interactive Tab/Nav Smoke Test | SVG Polygons Rendered |
|---|---|---|---|---|---|
| `thumbs.html` | `innerW: 1440`, `scrollW: 1440`, `scrollH: 900` | N/A (board) | `0` | N/A | `4.344` |
| `dir-1.html` | `innerW: 1440`, `scrollW: 1440`, `scrollH: 900` | `innerW: 390`, `scrollW: 390` | `0` | 4 tabs switched cleanly | `2.895` |
| `dir-2.html` | `innerW: 1440`, `scrollW: 1440`, `scrollH: 900` | `innerW: 390`, `scrollW: 390` | `0` | 4 role views switched cleanly | `2.895` |
| `dir-3.html` | `innerW: 1440`, `scrollW: 1440`, `scrollH: 900` | `innerW: 390`, `scrollW: 390` | `0` | 4 drawer tabs switched cleanly | `2.895` |

Visual re-inspection of `thumbs.png`, `dir-1.png`, `dir-2.png`, `dir-3.png`, `dir-1_mobile.png`, `dir-2_mobile.png`, and `dir-3_mobile.png` confirms zero text overlap, zero truncation in desktop nav rails, zero polygon occlusion, and zero horizontal overflow (`scrollW === innerW`).

---

## Round 3 — Production Vite + React + Leaflet Implementation (`Direction 3 Approved`)

### Refinements Applied Per User Feedback
- **Timeline Dock (`TimelineDock.tsx`):** Replaced cramped inline footer bar with a prominent `10-day` storm milestone strip (`05/09` – `14/09`) featuring clickable day chips (`Đổ bộ`, `Mưa R1`, `Đỉnh B5`, `UNOSAT`), stepped prev/play/next group, larger monospace date readout (`20px`), and clear storm event caption below the action row.
- **Minimal Architectural Controls (`YagiMap.tsx`, `OperationalDrawer.tsx`):** Replaced high-contrast brown/amber boxes and solid royal-blue CTAs with a unified hairline segmented bar (`6px` status indicator dots), muted ghost buttons, and crisp high-contrast matte `#E2E6ED` / `#EAE8E1` primary actions.

### Browser Issues Caught & Fixed in Production Verification
1. Removed third-party CartoDB tile layer after desktop screenshot revealed `API KEY REQUIRED` tile watermarks; replaced with clean self-contained cartographic lat/lon graticule grid on `#11151B` matte canvas (100% offline-ready).
2. Fixed initial Leaflet viewport zoom so startup displays all 12 northern provinces (`fitBounds`), triggering smooth `flyToBounds` only when switching communes via Search, Showcase pills, or `W3` Exception Queue.
3. Switched Leaflet container from `h-full w-full` inside `min-h-[360px]` to `absolute inset-0` so mobile (`390×844`) resolves exact Canvas pixel height cleanly.

### Verified Telemetry (`npm run build` + `verify_prod_app.py`)
- `tsc --noEmit && vite build`: exited `0` (`dist/assets/index-*.css` `35.98 kB`, `dist/assets/index-*.js` `345.04 kB`).
- Desktop (`1440×900`): `innerW === scrollW === 1440`, `hasCanvas: 1`, `runtime_errors: 0`, all 5 drawer tabs (`1-Chạm`, `UBND Xã`, `Ngoại lệ (W3)`, `Trạm R2 (B5)`, `API & NHNN`), verification modal, UNOSAT overlay, and 1-Tap loan count updates verified cleanly.
- Mobile (`390×844`): `innerW === scrollW === 390`, `runtime_errors: 0`, full 2,895-commune Leaflet Canvas rendered cleanly.



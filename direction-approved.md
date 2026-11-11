# Direction Approved — KỊP THỜI (ResiLend)

**Selected Direction:** **Direction 3 — Cartographic Night Desk** (`dir-3.html` baseline + refined minimal industrial UX).  
**Approval Date:** 2026-11-12  
**Production Target:** Vite + React 18 + TypeScript + Tailwind CSS + Leaflet (`L.canvas()` 2,895-commune vector layer) SPA powered 100% by static verified Typhoon Yagi datasets.

---

## Visual System & Approved Customizations

1. **Color & Surface Discipline (Matte Graphite Cartographic)**
   - Canvas background: `#11151B` (matte slate-obsidian, zero pure `#000000`, zero gradients)
   - Elevated drawers & bars: `#151A23` / `#171C24` with `1px solid #232A36` hairlines
   - Text hierarchy: `#EAE8E1` primary, `#9CA6B4` muted, `#687385` secondary labels
   - Map & risk encodings (colorblind-safe & domain calibrated):
     - `2 sources (R1 + R3)`: `#C2410C`
     - `1 source (R1 or R3)`: `#9A5B13`
     - `UNOSAT Flood >=5%`: `#0284C7`
     - `Sentinel-1 SAR Flood`: `#0D9488`
     - `Below threshold`: `#1C232E` with `#262F3D` border
     - `Selected commune highlight`: `#F8FAFC` (`2px`)
2. **Typography**
   - UI sans: `IBM Plex Sans` (`13px–14px` body, clean Vietnamese diacritics)
   - Monospace metrics & dates: `IBM Plex Mono` (`font-variant-numeric: tabular-nums`)
3. **User-Requested Refinements Over `dir-3.html`**
   - **Larger, richer Timeline Dock:** Expand bottom storm scrubber into a full ergonomic `min-height: 84px` timeline console featuring a clickable 10-day milestone strip (`05/09` – `14/09`), storm-event phase labels, larger tabular date display (`18px–20px`), play/pause stepper, and wide track rail.
   - **Minimal, high-craft Button System:** Remove chunky bright-blue buttons and high-contrast amber/brown warning boxes on layer toggles. Use a unified hairline segmented bar with subtle `6px` semantic dots for layer toggles, crisp high-contrast off-white matte `#EAE8E1` (`text-[#11151B]`) for primary CTAs, and restrained `#2B3340` ghost controls for secondary actions (`4px` radius, `32–36px` balanced height).

---

## Locked Architectural Guardrails (`agent.md` & `spec.md`)
- Use exact verified data: 2,895 communes across 12 northern provinces (`R1=1,169`, `R3 R50=2,622`, `R3 R64=1,879`, `UNOSAT=718 flooded / 2,540 classifiable`), 11 B5 river stations (`10 > BĐ3`, `Ha Noi < BĐ3`, no station-to-commune `GID_3` crosswalk fabricated).
- Keep simulated bank loan volume (`290M VND avg / loan`, `1/725 break-even`, `5% NĐ 86 provision`) clearly labeled as simulated portfolio assumptions.
- Preserve regulatory basis: **Thông tư 29/2025/TT-NHNN** (10-day window + borrower consent), **QĐ 18/2021/QĐ-TTg Đ.44**, **QĐ 05/2020/QĐ-TTg**, **Nghị định 346/2026**, **Thông tư 64/2024/TT-NHNN**, and keep manual paper branch channel visible as safety net.


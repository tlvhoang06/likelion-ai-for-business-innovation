import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Maximize2 } from 'lucide-react';
import type {
  CommunesGeoJson,
  CommuneYagiStatus,
  LayerToggles,
} from '../types/yagi';
import {
  evaluateCommuneAtDate,
  formatNum,
  formatVndBillions,
} from '../utils/yagiLogic';

interface YagiMapProps {
  geojson: CommunesGeoJson;
  communeMap: Map<string, CommuneYagiStatus>;
  selectedGid: string | null;
  dateStr: string;
  layers: LayerToggles;
  stats: {
    triggeredCount: number;
    r1Count: number;
    r3Count: number;
    triggeredLoans: number;
    triggeredDebtM: number;
    savedLoans: number;
  };
  campaignLaunched: boolean;
  borrowerConfirmed: Record<string, boolean>;
  ubndSigned: Record<string, boolean>;
  onSelectCommune: (gid: string | null) => void;
  onToggleLayer: (key: keyof LayerToggles) => void;
  onSelectWindMode: (useR64: boolean) => void;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCalloutHtml(
  c: CommuneYagiStatus,
  dateStr: string,
  layers: LayerToggles,
  confirmed: boolean,
  signedUbnd: boolean
): string {
  const ev = evaluateCommuneAtDate(c, dateStr, layers);
  let statusText = 'Chưa chạm ngưỡng';
  if (ev.count === 2) {
    statusText = '2 nguồn R1+R3';
  } else if (ev.count === 1) {
    statusText = ev.r1On ? '1 nguồn R1' : '1 nguồn R3';
  } else if (ev.unosatFlood) {
    statusText = 'Ngập UNOSAT';
  } else if (ev.s1Flood) {
    statusText = 'Ngập Sentinel-1';
  }

  const unoHero =
    c.unosat_flood_pct !== null ? `${c.unosat_flood_pct.toFixed(1)}%` : 'Ngoài vùng';
  const s1Txt = c.s1_flood_pct !== null ? `${c.s1_flood_pct.toFixed(1)}%` : 'N/A';

  return `
    <div style="font-family:'IBM Plex Sans',system-ui,sans-serif;padding:10px 12px;">
      <!-- Prominent Commune Title -->
      <div style="padding-right:20px;">
        <div style="font-size:15.5px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;line-height:1.2;">
          Xã ${escHtml(c.name)}
        </div>
        <div style="margin-top:2px;font-size:11px;color:#8E97A4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escHtml(c.district)}, ${escHtml(c.province)} &middot; ${statusText}
        </div>
      </div>

      <!-- Compact 2-Metric Strip -->
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="background:rgba(255,255,255,0.035);border-radius:6px;padding:6px 8px;">
          <div style="font-size:10px;color:#7E8A9B;">Ngập UNOSAT</div>
          <div style="margin-top:1px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;color:#FFFFFF;line-height:1.2;">${unoHero}</div>
        </div>
        <div style="background:rgba(255,255,255,0.035);border-radius:6px;padding:6px 8px;">
          <div style="font-size:10px;color:#7E8A9B;">Hồ sơ ước tính</div>
          <div style="margin-top:1px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;color:#FFFFFF;line-height:1.2;">${c.sim_loans} <span style="font-size:10.5px;font-weight:400;color:#9CA6B4;">khoản</span></div>
        </div>
      </div>

      <!-- Single Quiet Metadata Summary Line -->
      <div style="margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#9CA6B4;gap:8px;white-space:nowrap;">
        <span>Mưa ${c.rain_mm}mm</span>
        <span>S1 ${s1Txt}</span>
        <span style="color:#E5E7EB;">${formatVndBillions(c.sim_debt_m_vnd)}</span>
      </div>

      ${
        confirmed || signedUbnd
          ? `<div style="margin-top:5px;display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;font-family:'IBM Plex Mono',monospace;color:#8ACBB5;">
              ${confirmed ? '<span>&#10003; Đã giữ Nhóm 1</span>' : ''}
              ${signedUbnd ? '<span>&#10003; UBND đã ký</span>' : ''}
             </div>`
          : ''
      }
    </div>
  `;
}

export function YagiMap({
  geojson,
  communeMap,
  selectedGid,
  dateStr,
  layers,
  stats,
  campaignLaunched,
  borrowerConfirmed,
  ubndSigned,
  onSelectCommune,
  onToggleLayer,
  onSelectWindMode,
}: YagiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const featureLayersRef = useRef<Map<string, L.Path>>(new Map());
  const selectionRendererRef = useRef<L.SVG | null>(null);
  const selectionGroupRef = useRef<L.LayerGroup | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const suppressPopupCloseRef = useRef<boolean>(false);
  const fullBoundsRef = useRef<L.LatLngBounds | null>(null);
  const preSelectViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const prevSelectedGidRef = useRef<string | null>(selectedGid);

  const onSelectRef = useRef(onSelectCommune);
  onSelectRef.current = onSelectCommune;

  const evalParamsRef = useRef({ communeMap, dateStr, layers, selectedGid });
  evalParamsRef.current = { communeMap, dateStr, layers, selectedGid };

  // Mount Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      preferCanvas: true,
      renderer: L.canvas({ padding: 0.4 }),
      zoomControl: true,
      attributionControl: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      minZoom: 6,
      maxZoom: 14,
    });

    // Dedicated SVG highlight pane above 2,895-polygon Canvas layer, below callout popup
    const selPane = map.createPane('selectionHighlight');
    selPane.style.zIndex = '450';
    selPane.style.pointerEvents = 'none';
    selectionRendererRef.current = L.svg({ pane: 'selectionHighlight' });
    selectionGroupRef.current = L.layerGroup().addTo(map);

    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution(
      'Ranh giới GADM v4.1 (2.895 xã) &middot; Kiểm chứng UNOSAT 3966 &amp; NCHMF B5'
    );

    // Subtle 1-degree cartographic graticule lines directly on dark matte canvas (zero external API-key watermark)
    const graticuleGroup = L.layerGroup().addTo(map);
    const gridStyle: L.PolylineOptions = {
      color: '#192230',
      weight: 0.8,
      dashArray: '3 5',
      interactive: false,
    };
    for (let lat = 19; lat <= 24; lat += 0.5) {
      L.polyline([[lat, 102], [lat, 109]], gridStyle).addTo(graticuleGroup);
    }
    for (let lng = 102; lng <= 109; lng += 0.5) {
      L.polyline([[19, lng], [24, lng]], gridStyle).addTo(graticuleGroup);
    }

    const featureMap = new Map<string, L.Path>();

    const geoLayer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        const gid = (feature?.properties as { gid_3?: string })?.gid_3 ?? '';
        const { communeMap: cmap, dateStr: d, layers: lyr, selectedGid: sel } =
          evalParamsRef.current;
        const c = cmap.get(gid);
        if (!c) {
          return {
            fillColor: '#1C232E',
            fillOpacity: 0.75,
            color: '#0E1218',
            weight: 0.45,
          };
        }
        const ev = evaluateCommuneAtDate(c, d, lyr);
        const isSel = gid === sel;
        return {
          fillColor: ev.fillColor,
          fillOpacity: ev.fillOpacity,
          color: isSel ? '#F8FAFC' : ev.strokeColor,
          weight: isSel ? 2.2 : 0.45,
        };
      },
      onEachFeature: (feature, layer) => {
        const gid = (feature?.properties as { gid_3?: string })?.gid_3 ?? '';
        const pathLayer = layer as L.Path;
        featureMap.set(gid, pathLayer);

        pathLayer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRef.current(
            evalParamsRef.current.selectedGid === gid ? null : gid
          );
        });

        pathLayer.on('mouseover', () => {
          const { communeMap: cmap, dateStr: d, layers: lyr, selectedGid: sel } =
            evalParamsRef.current;
          if (gid === sel) return;
          const c = cmap.get(gid);
          if (!c) return;
          const ev = evaluateCommuneAtDate(c, d, lyr);
          const unoText =
            c.unosat_flood_pct !== null
              ? `${c.unosat_flood_pct.toFixed(1)}% ngập`
              : 'Ngoài UNOSAT';
          pathLayer
            .bindTooltip(
              `<div style="font-family:'IBM Plex Sans',sans-serif;line-height:1.4">
                <div style="font-weight:600;color:#F8FAFC">${escHtml(c.name)}</div>
                <div style="color:#9CA6B4;font-size:11px">${escHtml(c.district)}, ${escHtml(c.province)}</div>
                <div style="margin-top:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#CBD5E1">
                  Mưa: ${c.rain_mm}mm &middot; UNOSAT: ${unoText}<br/>
                  Khớp ngày ${d.slice(8, 10)}/${d.slice(5, 7)}: ${ev.count} nguồn &middot; ${c.sim_loans} khoản
                </div>
              </div>`,
              { className: 'yagi-tooltip', sticky: true, direction: 'top', offset: [0, -8] }
            )
            .openTooltip();

          pathLayer.setStyle({ color: '#94A3B8', weight: 1.3 });
        });

        pathLayer.on('mouseout', () => {
          const { communeMap: cmap, dateStr: d, layers: lyr, selectedGid: sel } =
            evalParamsRef.current;
          const c = cmap.get(gid);
          if (!c) return;
          const ev = evaluateCommuneAtDate(c, d, lyr);
          const isSel = gid === sel;
          pathLayer.setStyle({
            color: isSel ? '#F8FAFC' : ev.strokeColor,
            weight: isSel ? 2.2 : 0.45,
          });
        });
      },
    }).addTo(map);

    const bounds = geoLayer.getBounds();
    if (bounds.isValid()) {
      fullBoundsRef.current = bounds;
      map.fitBounds(bounds, { padding: [16, 16] });
    } else {
      map.setView([21.1, 105.8], 8);
    }

    // Clicking empty water / outside Vietnam polygons cleanly returns to regional overview
    map.on('click', () => {
      if (evalParamsRef.current.selectedGid !== null) {
        onSelectRef.current(null);
      }
    });

    mapRef.current = map;
    geoLayerRef.current = geoLayer;
    featureLayersRef.current = featureMap;

    const resizeObs = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObs.observe(containerRef.current);

    return () => {
      resizeObs.disconnect();
      popupRef.current = null;
      selectionGroupRef.current?.clearLayers();
      selectionGroupRef.current = null;
      selectionRendererRef.current = null;
      map.remove();
      mapRef.current = null;
      geoLayerRef.current = null;
      featureLayersRef.current.clear();
    };
  }, [geojson]);

  // Animated game-like shimmering selection highlight overlay for the active commune
  useEffect(() => {
    const group = selectionGroupRef.current;
    const svgRenderer = selectionRendererRef.current;
    if (!group || !svgRenderer) return;

    group.clearLayers();
    if (!selectedGid) return;

    const feat = geojson.features.find((f) => f.properties.gid_3 === selectedGid);
    if (!feat) return;

    // 1. Pulsing luminous inner sheen fill + light outer halo
    L.geoJSON(feat as unknown as GeoJSON.GeoJsonObject, {
      style: {
        fillColor: '#CDECD7',
        fillOpacity: 0.24,
        color: '#8ACBB5',
        weight: 2.5,
        opacity: 0.35,
        className: 'yagi-sel-shimmer',
        interactive: false,
      },
      // @ts-expect-error Leaflet runtime GeoJSON renderer option forwarded to vector layer
      renderer: svgRenderer,
    }).addTo(group);

    // 2. Subtle hairline contour + crisp elongated gliding dashes along perimeter
    const topGeo = L.geoJSON(feat as unknown as GeoJSON.GeoJsonObject, {
      style: {
        fill: false,
        color: '#8ACBB5',
        weight: 1,
        opacity: 0.3,
        interactive: false,
      },
      // @ts-expect-error Leaflet runtime GeoJSON renderer option forwarded to vector layer
      renderer: svgRenderer,
    }).addTo(group);

    L.geoJSON(feat as unknown as GeoJSON.GeoJsonObject, {
      style: {
        fill: false,
        color: '#FFFFFF',
        weight: 2.3,
        opacity: 0.98,
        dashArray: '16 10',
        lineCap: 'butt',
        className: 'yagi-sel-march',
        interactive: false,
      },
      // @ts-expect-error Leaflet runtime GeoJSON renderer option forwarded to vector layer
      renderer: svgRenderer,
    }).addTo(group);

    // 3. Expanding radial selection burst ring centered on selected commune
    const layer = featureLayersRef.current.get(selectedGid) as unknown as L.Polygon | undefined;
    const b = layer?.getBounds?.() ?? topGeo.getBounds();
    if (b?.isValid()) {
      L.marker(b.getCenter(), {
        pane: 'selectionHighlight',
        interactive: false,
        icon: L.divIcon({
          className: '',
          html: '<div class="yagi-sel-ping-ring"></div>',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(group);
    }
  }, [geojson, selectedGid]);

  // Re-style all 2,895 polygons immediately when timeline date, toggles, or selectedGid changes
  useEffect(() => {
    const fMap = featureLayersRef.current;
    if (fMap.size === 0) return;

    let selectedLayer: L.Path | null = null;
    fMap.forEach((layer, gid) => {
      const c = communeMap.get(gid);
      if (!c) return;
      const ev = evaluateCommuneAtDate(c, dateStr, layers);
      const isSel = gid === selectedGid;
      layer.setStyle({
        fillColor: ev.fillColor,
        fillOpacity: ev.fillOpacity,
        color: isSel ? '#F8FAFC' : ev.strokeColor,
        weight: isSel ? 2.2 : 0.45,
      });
      if (isSel) selectedLayer = layer;
    });

    if (selectedLayer) {
      (selectedLayer as L.Path).bringToFront();
    }
  }, [communeMap, dateStr, layers, selectedGid]);

  // Gentle zoom-in when selecting a commune; cleanly zoom back out when cleared (Esc / outside click / X)
  useEffect(() => {
    const prevGid = prevSelectedGidRef.current;
    if (prevGid === selectedGid) {
      return;
    }
    prevSelectedGidRef.current = selectedGid;

    const map = mapRef.current;
    if (!map) return;

    if (selectedGid === null) {
      const saved = preSelectViewRef.current;
      preSelectViewRef.current = null;
      if (saved) {
        map.flyTo(saved.center, saved.zoom, { duration: 0.45 });
      } else if (fullBoundsRef.current?.isValid()) {
        map.flyToBounds(fullBoundsRef.current, { padding: [16, 16], duration: 0.45 });
      }
      return;
    }

    if (prevGid === null) {
      preSelectViewRef.current = { center: map.getCenter(), zoom: map.getZoom() };
    }

    const layer = featureLayersRef.current.get(selectedGid) as unknown as L.Polygon | undefined;
    if (!layer) return;

    const b = layer.getBounds();
    if (b && b.isValid()) {
      const baseZoom = preSelectViewRef.current?.zoom ?? map.getZoom();
      const gentleMaxZoom = Math.min(11, Math.max(9.5, baseZoom + 1.5, map.getZoom()));
      const w = containerRef.current?.clientWidth ?? 900;
      const h = containerRef.current?.clientHeight ?? 600;
      const xPad = w >= 640 ? 145 : Math.max(24, Math.floor(w * 0.14));
      const topPad = h >= 440 ? 185 : 130;
      map.flyToBounds(b, {
        maxZoom: gentleMaxZoom,
        paddingTopLeft: [xPad, topPad],
        paddingBottomRight: [xPad, 48],
        duration: 0.45,
      });
    }
  }, [selectedGid]);

  // Auto-open & synchronize pinned callout speech-bubble above selected commune
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedGid) {
      if (popupRef.current) {
        suppressPopupCloseRef.current = true;
        map.closePopup(popupRef.current);
        popupRef.current = null;
        suppressPopupCloseRef.current = false;
      }
      return;
    }

    const c = communeMap.get(selectedGid);
    const layer = featureLayersRef.current.get(selectedGid) as unknown as L.Polygon | undefined;
    if (!c) return;

    (layer as unknown as L.Path | undefined)?.closeTooltip?.();

    const anchor =
      layer && layer.getBounds?.().isValid()
        ? layer.getBounds().getCenter()
        : L.latLng(c.lat, c.lng);

    const confirmed = !!(borrowerConfirmed[c.gid_3] || campaignLaunched);
    const signedUbnd = !!ubndSigned[c.gid_3];
    const html = buildCalloutHtml(c, dateStr, layers, confirmed, signedUbnd);

    if (!popupRef.current) {
      const popup = L.popup({
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        autoPan: false,
        minWidth: 242,
        maxWidth: 274,
        offset: [0, -4],
        className: 'yagi-callout-popup',
      });
      popup.on('remove', () => {
        if (!suppressPopupCloseRef.current && evalParamsRef.current.selectedGid !== null) {
          onSelectRef.current(null);
        }
      });
      popupRef.current = popup;
    }

    popupRef.current.setLatLng(anchor).setContent(html);
    if (!popupRef.current.isOpen()) {
      popupRef.current.openOn(map);
    }
  }, [selectedGid, communeMap, dateStr, layers, campaignLaunched, borrowerConfirmed, ubndSigned]);

  const handleResetView = () => {
    preSelectViewRef.current = null;
    onSelectRef.current(null);
    if (mapRef.current && fullBoundsRef.current?.isValid()) {
      mapRef.current.flyToBounds(fullBoundsRef.current, { padding: [16, 16], duration: 0.4 });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      {/* Unobstructed Top Map Toolbar & Live Metrics Strip */}
      <div className="flex flex-col gap-2 border-b border-line bg-[#141922] px-4 py-2.5">
        {/* Stretched Full-Width Layer Trigger Controls */}
        <div
          role="group"
          aria-label="Lớp tín hiệu bản đồ"
          className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap"
        >
          <LayerPill
            active={layers.r1}
            dotColor="#EA580C"
            label="R1 Mưa Đ.44"
            count="1.169"
            className="min-w-[130px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('r1')}
          />

          {/* Clean R3 Wind Pill + Separate Matte R50/R64 Segmented Switch */}
          <div className="flex min-w-[230px] flex-[1.55] items-center gap-1.5 sm:min-w-0">
            <LayerPill
              active={layers.r3}
              dotColor={layers.useR64 ? '#BE185D' : '#7C3AED'}
              label={layers.useR64 ? 'R3 Gió R64' : 'R3 Gió R50'}
              count={layers.useR64 ? '1.879' : '2.622'}
              className="flex-1"
              onClick={() => onToggleLayer('r3')}
            />
            <div
              role="group"
              aria-label="Ngưỡng gió R3"
              className="inline-flex h-8 shrink-0 items-center rounded-[5px] border border-[#3E4A5F] bg-[#11161E] p-0.5 font-mono text-[11px]"
            >
              <button
                type="button"
                onClick={() => onSelectWindMode(false)}
                title="Ngưỡng gió bão R50 (2.622 xã)"
                className={`inline-flex h-full items-center gap-1 rounded-[3px] px-2 transition-colors ${
                  !layers.useR64
                    ? 'bg-[#263042] font-semibold text-white'
                    : 'text-[#8E97A4] hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                <span>R50</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectWindMode(true)}
                title="Ngưỡng nhạy gió mạnh hơn R64 (1.879 xã)"
                className={`inline-flex h-full items-center gap-1 rounded-[3px] px-2 transition-colors ${
                  layers.useR64
                    ? 'bg-[#263042] font-semibold text-white'
                    : 'text-[#8E97A4] hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#BE185D]" />
                <span>R64</span>
              </button>
            </div>
          </div>

          <LayerPill
            active={layers.unosat}
            dotColor="#0284C7"
            label="UNOSAT 3966"
            count="718"
            className="min-w-[130px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('unosat')}
          />
          <LayerPill
            active={layers.s1}
            dotColor="#0D9488"
            label="Sentinel-1"
            count="101"
            className="min-w-[130px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('s1')}
          />
        </div>

        {/* Bold Uniformly Highlighted Regional Telemetry Readout */}
        <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-t border-white/[0.08] pt-2 text-[12.5px] font-bold text-[#F1F5F9]">
          <div className="flex items-baseline gap-1.5">
            <span>Xã kích hoạt:</span>
            <span className="font-mono tabular-nums">
              {formatNum(stats.triggeredCount)} / 2.895
            </span>
          </div>
          <div className="hidden items-baseline gap-1.5 sm:flex">
            <span>Dư nợ vùng (giả lập):</span>
            <span className="font-mono tabular-nums">
              {formatVndBillions(stats.triggeredDebtM)}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span>Giữ Nhóm 1:</span>
            <span
              className={`font-mono tabular-nums ${
                stats.savedLoans > 0 ? 'text-[#8ACBB5]' : 'text-[#F1F5F9]'
              }`}
            >
              {formatNum(stats.savedLoans)} khoản
            </span>
          </div>
        </div>
      </div>

      {/* Unobstructed Interactive Leaflet Stage */}
      <div className="relative min-h-[360px] flex-1 bg-canvas">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Reset Bounds Utility Button + Compact Cartographic Key over Gulf of Tonkin */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-[800] flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleResetView}
            className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-white/[0.1] bg-panel/95 px-2.5 text-[11.5px] font-medium text-inkMuted transition-colors hover:bg-panelAlt hover:text-ink"
          >
            <Maximize2 className="h-3 w-3" strokeWidth={1.75} />
            <span>Toàn vùng 12 tỉnh</span>
          </button>

          <div className="pointer-events-auto rounded-[6px] border border-white/[0.08] bg-panel/95 px-3 py-2 text-[11.5px] text-inkMuted">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#DC2626]" />
              <span>2 nguồn khớp (R1 mưa + R3 gió)</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#EA580C]" />
              <span>Chỉ R1 Mưa Đ.44 (&gt;200mm)</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#7C3AED]" />
              <span>Chỉ R3 Gió R50 / R64</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#0284C7]" />
              <span>UNOSAT 3966 ngập &ge;5%</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#0D9488]" />
              <span>Sentinel-1 SAR ngập</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] border border-[#343E4F] bg-[#1C232E]" />
              <span>Chưa chạm ngưỡng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LayerPillProps {
  active: boolean;
  dotColor: string;
  label: string;
  count?: string;
  className?: string;
  onClick: () => void;
}

function LayerPill({ active, dotColor, label, count, className = '', onClick }: LayerPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={
        active
          ? {
              backgroundColor: dotColor,
              borderColor: dotColor,
            }
          : undefined
      }
      className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] border px-3 text-[12px] transition-colors ${
        active
          ? 'font-semibold text-white shadow-sm'
          : 'border-[#3E4A5F] bg-[#161C26] font-medium text-[#CBD5E1] hover:border-[#5B6B86] hover:bg-[#1E2634] hover:text-white'
      } ${className}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: active ? 'rgba(255,255,255,0.92)' : dotColor,
        }}
      />
      <span>{label}</span>
      {count && (
        <span
          className={`hidden font-mono text-[11px] xl:inline ${
            active ? 'text-white/85' : 'text-[#8E97A4]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

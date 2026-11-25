import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Maximize2 } from 'lucide-react';
import type {
  CommunesGeoJson,
  CommuneYagiStatus,
  Lang,
  LayerToggles,
} from '../types/yagi';
import {
  evaluateCommuneAtDate,
  formatNum,
  formatVndBillions,
  isPostEventReferenceReady,
  SIGNAL_COLORS,
} from '../utils/yagiLogic';

interface YagiMapProps {
  lang: Lang;
  geojson: CommunesGeoJson;
  communeMap: Map<string, CommuneYagiStatus>;
  selectedGid: string | null;
  aiHighlightedGids?: string[];
  aiFocusSignal?: { gids: string[]; seq: number } | null;
  dateStr: string;
  layers: LayerToggles;
  stats: {
    triggeredCount: number;
    r1Count: number;
    r2Count: number;
    r3Count: number;
    priorityCount: number;
    watchlistCount: number;
    triggeredLoans: number;
    triggeredDebtM: number;
    savedLoans: number;
  };
  campaignLaunched: boolean;
  borrowerConfirmed: Record<string, boolean>;
  ubndSigned: Record<string, boolean>;
  onSelectCommune: (gid: string | null) => void;
  onClearAiHighlights?: () => void;
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
  signedUbnd: boolean,
  lang: Lang
): string {
  const ev = evaluateCommuneAtDate(c, dateStr, layers);
  const activeTags = [
    ev.r1On ? 'R1' : null,
    ev.r2On ? 'R2' : null,
    ev.r3On ? 'R3' : null,
  ].filter(Boolean);
  let statusText = lang === 'en' ? 'Not triggered' : 'Chưa chạm ngưỡng';
  if (ev.count >= 2) {
    statusText =
      lang === 'en'
        ? `${ev.count} rules (${activeTags.join('+')})`
        : `${ev.count} nguồn (${activeTags.join('+')})`;
  } else if (ev.count === 1) {
    statusText =
      lang === 'en'
        ? `1 rule (${activeTags[0]})`
        : `1 nguồn (${activeTags[0]})`;
  } else if (ev.unosatFlood) {
    statusText = lang === 'en' ? 'UNOSAT flood' : 'Ngập UNOSAT';
  } else if (ev.s1Flood) {
    statusText = lang === 'en' ? 'Sentinel-1 flood' : 'Ngập Sentinel-1';
  }

  const postReady = isPostEventReferenceReady(dateStr);
  const showRetroOnPopup = postReady || layers.unosat || layers.s1;
  const unoHero = showRetroOnPopup
    ? c.unosat_flood_pct !== null
      ? `${c.unosat_flood_pct.toFixed(1)}%`
      : lang === 'en'
      ? 'Out of scan'
      : 'Ngoài vùng'
    : lang === 'en'
    ? 'Post-12/09'
    : 'Có từ 12/09';
  const s1Txt = showRetroOnPopup
    ? c.s1_flood_pct !== null
      ? `${c.s1_flood_pct.toFixed(1)}%`
      : 'N/A'
    : lang === 'en'
    ? '08–20/09'
    : '08–20/09';

  return `
    <div style="font-family:'IBM Plex Sans',system-ui,sans-serif;padding:10px 12px;">
      <!-- Prominent Commune Title -->
      <div style="padding-right:20px;">
        <div style="font-size:15.5px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;line-height:1.2;">
          ${lang === 'en' ? '' : 'Xã '}${escHtml(c.name)}
        </div>
        <div style="margin-top:2px;font-size:11px;color:#8E97A4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escHtml(c.district)}, ${escHtml(c.province)} &middot; ${statusText}
        </div>
      </div>

      <!-- Compact 2-Metric Strip -->
      <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="background:rgba(255,255,255,0.035);border-radius:6px;padding:6px 8px;">
          <div style="font-size:10px;color:#7E8A9B;">${
            lang === 'en'
              ? postReady
                ? 'UNOSAT (12/09)'
                : 'UNOSAT (Post-event)'
              : postReady
              ? 'UNOSAT (12/09)'
              : 'UNOSAT (Hậu kiểm)'
          }</div>
          <div style="margin-top:1px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;color:#FFFFFF;line-height:1.2;">${unoHero}</div>
        </div>
        <div style="background:rgba(255,255,255,0.035);border-radius:6px;padding:6px 8px;">
          <div style="font-size:10px;color:#7E8A9B;">${lang === 'en' ? 'Sim. Loans' : 'Hồ sơ giả lập'}</div>
          <div style="margin-top:1px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;color:#FFFFFF;line-height:1.2;">${c.sim_loans} <span style="font-size:10.5px;font-weight:400;color:#9CA6B4;">${lang === 'en' ? 'loans' : 'khoản'}</span></div>
        </div>
      </div>

      <!-- Single Quiet Metadata Summary Line -->
      <div style="margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#9CA6B4;gap:8px;white-space:nowrap;">
        <span>${lang === 'en' ? 'Rain' : 'Mưa'} ${c.rain_mm}mm</span>
        <span>S1 ${s1Txt}</span>
        <span style="color:#E5E7EB;">${formatVndBillions(c.sim_debt_m_vnd, lang)}</span>
      </div>

      ${
        confirmed || signedUbnd
          ? `<div style="margin-top:5px;display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;font-family:'IBM Plex Mono',monospace;color:#8ACBB5;">
              ${confirmed ? `<span>&#10003; ${lang === 'en' ? '1-Tap logged (pending)' : 'Đã ghi 1-Chạm (chờ duyệt)'}</span>` : ''}
              ${signedUbnd ? `<span>&#10003; ${lang === 'en' ? 'Proposed UBND' : 'Đề xuất UBND'}</span>` : ''}
             </div>`
          : ''
      }
    </div>
  `;
}

export function YagiMap({
  lang,
  geojson,
  communeMap,
  selectedGid,
  aiHighlightedGids = [],
  aiFocusSignal = null,
  dateStr,
  layers,
  stats,
  campaignLaunched,
  borrowerConfirmed,
  ubndSigned,
  onSelectCommune,
  onClearAiHighlights,
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
      'Ranh giới GADM v4.1 (2.895 xã) &middot; Kiểm chứng UNOSAT 3966 &amp; Khí tượng Thủy văn'
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
          const showRetroTip = isPostEventReferenceReady(d) || lyr.unosat || lyr.s1;
          const unoText = showRetroTip
            ? c.unosat_flood_pct !== null
              ? `${c.unosat_flood_pct.toFixed(1)}% ngập${isPostEventReferenceReady(d) ? '' : ' (hậu kiểm 12/09)'}`
              : 'Chưa đủ UNOSAT'
            : 'Hậu kiểm từ 12/09';
          const r2Text =
            c.r2 === 1 && c.r2_station
              ? ` &middot; R2: ${escHtml(c.r2_station)} (&ge;BĐ3)`
              : c.r2_station === 'Ha Noi'
              ? ' &middot; Hà Nội (&lt;BĐ3)'
              : '';
          pathLayer
            .bindTooltip(
              `<div style="font-family:'IBM Plex Sans',sans-serif;line-height:1.4">
                <div style="font-weight:600;color:#F8FAFC">${escHtml(c.name)}</div>
                <div style="color:#9CA6B4;font-size:11px">${escHtml(c.district)}, ${escHtml(c.province)}</div>
                <div style="margin-top:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#CBD5E1">
                  Mưa: ${c.rain_mm}mm &middot; UNOSAT: ${unoText}${r2Text}<br/>
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

  // Re-style all 2,895 polygons immediately when timeline date, toggles, AI highlights, or selectedGid changes
  useEffect(() => {
    const fMap = featureLayersRef.current;
    if (fMap.size === 0) return;

    const aiSet = new Set(aiHighlightedGids);
    const hasAiHighlights = aiSet.size > 0;
    let selectedLayer: L.Path | null = null;
    const highlightedLayers: L.Path[] = [];

    fMap.forEach((layer, gid) => {
      const c = communeMap.get(gid);
      if (!c) return;
      const ev = evaluateCommuneAtDate(c, dateStr, layers);
      const isSel = gid === selectedGid;
      const isAiHit = aiSet.has(gid);

      if (isSel) {
        layer.setStyle({
          fillColor: ev.fillColor,
          fillOpacity: ev.fillOpacity,
          color: '#F8FAFC',
          weight: 2.2,
        });
        selectedLayer = layer;
      } else if (hasAiHighlights) {
        layer.setStyle({
          fillColor: isAiHit && ev.fillColor === '#1C232E' ? '#24403B' : ev.fillColor,
          fillOpacity: isAiHit ? Math.max(0.62, ev.fillOpacity) : ev.fillOpacity * 0.34,
          color: isAiHit ? '#CDECD7' : ev.strokeColor,
          weight: isAiHit ? 1.8 : 0.35,
        });
        if (isAiHit) highlightedLayers.push(layer);
      } else {
        layer.setStyle({
          fillColor: ev.fillColor,
          fillOpacity: ev.fillOpacity,
          color: ev.strokeColor,
          weight: 0.45,
        });
      }
    });

    for (const hl of highlightedLayers) {
      hl.bringToFront();
    }
    if (selectedLayer) {
      (selectedLayer as L.Path).bringToFront();
    }
  }, [communeMap, dateStr, layers, selectedGid, aiHighlightedGids]);

  // Smoothly fit Leaflet camera around AI-filtered commune clusters when requested by Agent tools
  useEffect(() => {
    if (!aiFocusSignal || aiFocusSignal.gids.length === 0) return;
    const map = mapRef.current;
    if (!map) return;

    const combined = L.latLngBounds([]);
    for (const gid of aiFocusSignal.gids) {
      const layer = featureLayersRef.current.get(gid) as unknown as L.Polygon | undefined;
      const b = layer?.getBounds?.();
      if (b && b.isValid()) {
        combined.extend(b);
      }
    }
    if (combined.isValid()) {
      map.flyToBounds(combined, {
        maxZoom: 10.5,
        paddingTopLeft: [48, 60],
        paddingBottomRight: [48, 64],
        duration: 0.5,
      });
    }
  }, [aiFocusSignal]);

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
    const html = buildCalloutHtml(c, dateStr, layers, confirmed, signedUbnd, lang);

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
  }, [selectedGid, communeMap, dateStr, layers, campaignLaunched, borrowerConfirmed, ubndSigned, lang]);

  const handleResetView = () => {
    preSelectViewRef.current = null;
    onSelectRef.current(null);
    onClearAiHighlights?.();
    if (mapRef.current && fullBoundsRef.current?.isValid()) {
      mapRef.current.flyToBounds(fullBoundsRef.current, { padding: [16, 16], duration: 0.4 });
    }
  };

  return (
    <div data-tour="map-desk" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
      {/* Unobstructed Top Map Toolbar & Live Metrics Strip */}
      <div className="flex flex-col gap-2 border-b border-lineStrong bg-[#141922] px-4 py-2.5">
        {/* Stretched Full-Width Layer Trigger Controls */}
        <div
          role="group"
          aria-label={lang === 'en' ? 'Map signal layers' : 'Lớp tín hiệu bản đồ'}
          className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap"
        >
          <LayerPill
            active={layers.r1}
            dotColor={SIGNAL_COLORS.r1}
            label={lang === 'en' ? 'R1 Rain Art.44' : 'R1 Mưa Đ.44'}
            count={formatNum(1169, lang)}
            className="min-w-[116px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('r1')}
          />

          <LayerPill
            active={layers.r2}
            dotColor={SIGNAL_COLORS.r2}
            label={lang === 'en' ? 'R2 River AL3' : 'R2 Lũ BĐ3'}
            count={formatNum(215, lang)}
            className="min-w-[112px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('r2')}
          />

          {/* Clean R3 Wind Pill + Separate Matte R50/R64 Segmented Switch */}
          <div className="flex min-w-[230px] flex-[1.55] items-center gap-1.5 sm:min-w-0">
            <LayerPill
              active={layers.r3}
              dotColor={layers.useR64 ? SIGNAL_COLORS.r3R64 : SIGNAL_COLORS.r3R50}
              label={
                layers.useR64
                  ? lang === 'en'
                    ? 'R3 Wind R64'
                    : 'R3 Gió R64'
                  : lang === 'en'
                  ? 'R3 Wind R50'
                  : 'R3 Gió R50'
              }
              count={layers.useR64 ? formatNum(1879, lang) : formatNum(2622, lang)}
              className="flex-1"
              onClick={() => onToggleLayer('r3')}
            />
            <div
              role="group"
              aria-label={lang === 'en' ? 'R3 Wind threshold' : 'Ngưỡng gió R3'}
              className="inline-flex h-8 shrink-0 items-center rounded-[5px] border border-[#3E4A5F] bg-[#11161E] p-0.5 font-mono text-[11px]"
            >
              <button
                type="button"
                onClick={() => onSelectWindMode(false)}
                title={
                  lang === 'en'
                    ? 'Typhoon R50 wind band (2,622 communes)'
                    : 'Ngưỡng gió bão R50 (2.622 xã)'
                }
                className={`inline-flex h-full items-center gap-1 rounded-[3px] px-2 transition-colors ${
                  !layers.useR64
                    ? 'bg-[#263042] font-semibold text-white'
                    : 'text-[#8E97A4] hover:text-white'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: SIGNAL_COLORS.r3R50 }}
                />
                <span>R50</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectWindMode(true)}
                title={
                  lang === 'en'
                    ? 'Stronger R64 sensitivity threshold (1,879 communes)'
                    : 'Ngưỡng nhạy gió mạnh hơn R64 (1.879 xã)'
                }
                className={`inline-flex h-full items-center gap-1 rounded-[3px] px-2 transition-colors ${
                  layers.useR64
                    ? 'bg-[#263042] font-semibold text-white'
                    : 'text-[#8E97A4] hover:text-white'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: SIGNAL_COLORS.r3R64 }}
                />
                <span>R64</span>
              </button>
            </div>
          </div>

          <LayerPill
            active={layers.unosat}
            dotColor={SIGNAL_COLORS.unosat}
            label="UNOSAT 3966"
            count="718"
            className="min-w-[130px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('unosat')}
          />
          <LayerPill
            active={layers.s1}
            dotColor={SIGNAL_COLORS.s1}
            label="Sentinel-1"
            count="101"
            className="min-w-[130px] flex-1 sm:min-w-0"
            onClick={() => onToggleLayer('s1')}
          />
        </div>

        {/* Bold Uniformly Highlighted Regional Telemetry Readout */}
        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line pt-2 text-[11.5px] font-bold text-[#F1F5F9] xl:text-[12px]">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span>{lang === 'en' ? 'Early Flag:' : 'Cảnh báo sớm:'}</span>
            <span className="font-mono tabular-nums">
              {formatNum(stats.triggeredCount, lang)} / {formatNum(2895, lang)}
            </span>
          </div>
          <div className="hidden items-baseline gap-1.5 whitespace-nowrap md:flex">
            <span className="text-[#8ACBB5]">{lang === 'en' ? 'Priority R1|R2:' : 'Ưu tiên R1|R2:'}</span>
            <span className="font-mono tabular-nums">{formatNum(stats.priorityCount, lang)}</span>
            <span className="text-inkDim">·</span>
            <span className="text-[#ff8ca1]">{lang === 'en' ? 'Watchlist R3:' : 'Theo dõi R3:'}</span>
            <span className="font-mono tabular-nums">{formatNum(stats.watchlistCount, lang)}</span>
          </div>
          <div className="hidden items-baseline gap-1.5 whitespace-nowrap xl:flex">
            <span>{lang === 'en' ? 'Portfolio (sim):' : 'Dư nợ (giả lập):'}</span>
            <span className="font-mono tabular-nums">
              {formatVndBillions(stats.triggeredDebtM, lang)}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span>{lang === 'en' ? '1-Tap req (sim):' : 'Đề nghị 1-Chạm:'}</span>
            <span
              className={`font-mono tabular-nums ${
                stats.savedLoans > 0 ? 'text-[#8ACBB5]' : 'text-[#F1F5F9]'
              }`}
            >
              {formatNum(stats.savedLoans, lang)} {lang === 'en' ? 'loans' : 'khoản'}
            </span>
          </div>
        </div>
      </div>

      {/* Unobstructed Interactive Leaflet Stage */}
      <div className="relative min-h-[260px] flex-1 overflow-hidden bg-canvas">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Reset Bounds & Active AI Highlight Utility Strip on bottom-left */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[800] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetView}
            className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-lineStrong bg-panel/95 px-2.5 text-[11.5px] font-medium text-inkMuted transition-colors hover:border-[#8ACBB5] hover:bg-panelAlt hover:text-ink"
          >
            <Maximize2 className="h-3 w-3" strokeWidth={1.75} />
            <span>{lang === 'en' ? 'All 12 provinces' : 'Toàn vùng 12 tỉnh'}</span>
          </button>

          {aiHighlightedGids.length > 0 && (
            <button
              type="button"
              onClick={() => onClearAiHighlights?.()}
              className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[#8ACBB5]/60 bg-[#14221F]/95 px-2.5 font-mono text-[11px] font-medium text-[#CDECD7] transition-colors hover:border-[#CDECD7] hover:text-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#8ACBB5]" />
              <span>
                {lang === 'en'
                  ? `AI highlight: ${aiHighlightedGids.length}`
                  : `AI tô sáng: ${aiHighlightedGids.length} xã`}
              </span>
              <span className="ml-0.5 text-[12px] leading-none text-[#8ACBB5]">&times;</span>
            </button>
          )}
        </div>

        {/* Compact Cartographic Key over Gulf of Tonkin */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-[800] flex flex-col items-end gap-2">
          <div className="pointer-events-auto rounded-[6px] border border-lineStrong bg-panel/95 px-3 py-2 text-[11.5px] text-inkMuted">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.overlap3 }}
              />
              <span>
                {lang === 'en'
                  ? '3 rules (R1+R2+R3 · 67.4% flood)'
                  : '3 nguồn (R1+R2+R3 · 67,4% ngập)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.overlap }}
              />
              <span>
                {lang === 'en'
                  ? '2 rules matched (Priority Review)'
                  : '2 nguồn khớp (Rà soát Ưu tiên)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.r2 }}
              />
              <span>
                {lang === 'en'
                  ? 'R2 River Stage ≥AL3 (215 communes)'
                  : 'R2 Lũ sông ≥BĐ3 (215 xã)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.r1 }}
              />
              <span>
                {lang === 'en'
                  ? 'R1 Rain Art.44 (>200mm)'
                  : 'R1 Mưa Đ.44 (>200mm)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{
                  backgroundColor: layers.useR64 ? SIGNAL_COLORS.r3R64 : SIGNAL_COLORS.r3R50,
                }}
              />
              <span>
                {lang === 'en' ? 'R3 Wind Watchlist (R50/R64)' : 'Chỉ R3 Gió (Watchlist R50/R64)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.unosat }}
              />
              <span>
                {lang === 'en' ? 'UNOSAT 3966 ≥5% (12/09 post-event)' : 'UNOSAT 3966 ≥5% (hậu kiểm 12/09)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-[1px]"
                style={{ backgroundColor: SIGNAL_COLORS.s1 }}
              />
              <span>
                {lang === 'en' ? 'Sentinel-1 SAR (08–20/09)' : 'Sentinel-1 SAR (08–20/09)'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] border border-[#343E4F] bg-[#1C232E]" />
              <span>{lang === 'en' ? 'Not triggered' : 'Chưa chạm ngưỡng'}</span>
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
          ? 'font-semibold text-[#0E141B] shadow-sm'
          : 'border-[#3E4A5F] bg-[#161C26] font-medium text-[#CBD5E1] hover:border-[#5B6B86] hover:bg-[#1E2634] hover:text-white'
      } ${className}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: active ? 'rgba(14,20,27,0.72)' : dotColor,
        }}
      />
      <span>{label}</span>
      {count && (
        <span
          className={`hidden font-mono text-[11px] xl:inline ${
            active ? 'text-[#0E141B]/80' : 'text-[#8E97A4]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

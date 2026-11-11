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
}: YagiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const featureLayersRef = useRef<Map<string, L.Path>>(new Map());
  const popupRef = useRef<L.Popup | null>(null);
  const suppressPopupCloseRef = useRef<boolean>(false);
  const fullBoundsRef = useRef<L.LatLngBounds | null>(null);
  const clickedGidRef = useRef<string | null>(null);
  const needsPanCheckRef = useRef<boolean>(false);
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
      minZoom: 6,
      maxZoom: 14,
    });

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
          clickedGidRef.current = gid;
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
      map.remove();
      mapRef.current = null;
      geoLayerRef.current = null;
      featureLayersRef.current.clear();
    };
  }, [geojson]);

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

  // Smooth flyTo when selecting a commune, or fly back out to 12-province overview when cleared (null)
  useEffect(() => {
    if (prevSelectedGidRef.current === selectedGid) {
      return;
    }
    prevSelectedGidRef.current = selectedGid;

    const map = mapRef.current;
    if (!map) return;

    if (selectedGid === null) {
      clickedGidRef.current = null;
      if (fullBoundsRef.current?.isValid()) {
        map.flyToBounds(fullBoundsRef.current, { padding: [16, 16], duration: 0.45 });
      }
      return;
    }

    const layer = featureLayersRef.current.get(selectedGid) as unknown as L.Polygon | undefined;
    if (!layer) return;

    if (clickedGidRef.current === selectedGid) {
      clickedGidRef.current = null;
      needsPanCheckRef.current = true;
      return;
    }

    needsPanCheckRef.current = false;
    const b = layer.getBounds();
    if (b && b.isValid()) {
      map.flyToBounds(b, {
        maxZoom: 11,
        paddingTopLeft: [40, 175],
        paddingBottomRight: [40, 32],
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

    // For direct map clicks without flyToBounds, measure real popup DOM rect & pan cleanly inside viewport
    if (needsPanCheckRef.current) {
      needsPanCheckRef.current = false;
      window.requestAnimationFrame(() => {
        const popEl = popupRef.current?.getElement();
        const contEl = containerRef.current;
        if (!popEl || !contEl || !mapRef.current) return;
        const pRect = popEl.getBoundingClientRect();
        const cRect = contEl.getBoundingClientRect();
        const pad = 12;
        let dx = 0;
        let dy = 0;
        if (pRect.top < cRect.top + pad) {
          dy = pRect.top - (cRect.top + pad);
        } else if (pRect.bottom > cRect.bottom - pad) {
          dy = pRect.bottom - (cRect.bottom - pad);
        }
        if (pRect.left < cRect.left + pad) {
          dx = pRect.left - (cRect.left + pad);
        } else if (pRect.right > cRect.right - pad) {
          dx = pRect.right - (cRect.right - pad);
        }
        if (dx !== 0 || dy !== 0) {
          mapRef.current.panBy([dx, dy], { animate: true, duration: 0.25 });
        }
      });
    }
  }, [selectedGid, communeMap, dateStr, layers, campaignLaunched, borrowerConfirmed, ubndSigned]);

  const handleResetView = () => {
    onSelectRef.current(null);
    if (mapRef.current && fullBoundsRef.current?.isValid()) {
      mapRef.current.flyToBounds(fullBoundsRef.current, { padding: [16, 16], duration: 0.4 });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      {/* Unobstructed Top Map Toolbar & Live Metrics Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-[#141922] px-4 py-2">
        {/* Minimal Hairline Segmented Layer Controls */}
        <div
          role="group"
          aria-label="Lớp tín hiệu bản đồ"
          className="inline-flex flex-wrap items-center divide-x divide-line rounded-[4px] border border-line bg-canvas"
        >
          <LayerPill
            active={layers.r1}
            dotColor="#C2410C"
            label="R1 Mưa Đ.44"
            count="1.169"
            onClick={() => onToggleLayer('r1')}
          />
          <LayerPill
            active={layers.r3}
            dotColor="#D97706"
            label={layers.useR64 ? 'R3 Gió R64' : 'R3 Gió R50'}
            count={layers.useR64 ? '1.879' : '2.622'}
            onClick={() => onToggleLayer('r3')}
          />
          <LayerPill
            active={layers.useR64}
            dotColor="#E11D48"
            label="Nhạy R64"
            onClick={() => onToggleLayer('useR64')}
          />
          <LayerPill
            active={layers.unosat}
            dotColor="#0284C7"
            label="UNOSAT 3966"
            count="718"
            onClick={() => onToggleLayer('unosat')}
          />
          <LayerPill
            active={layers.s1}
            dotColor="#0D9488"
            label="Sentinel-1"
            count="101"
            onClick={() => onToggleLayer('s1')}
          />
        </div>

        {/* Minimal Tabular Regional Telemetry Readout */}
        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <div>
            <span className="text-inkDim">Xã kích hoạt </span>
            <span className="font-mono font-semibold text-ink tabular-nums">
              {formatNum(stats.triggeredCount)}
            </span>
            <span className="font-mono text-inkDim"> / 2.895</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-inkDim">Dư nợ vùng (giả lập) </span>
            <span className="font-mono font-semibold text-ink tabular-nums">
              {formatVndBillions(stats.triggeredDebtM)}
            </span>
          </div>
          <div>
            <span className="text-inkDim">Giữ Nhóm 1 </span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                stats.savedLoans > 0 ? 'text-ink' : 'text-inkMuted'
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
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#C2410C]" />
              <span>2 nguồn khớp (R1 mưa + R3 gió)</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-[1px] bg-[#9A5B13]" />
              <span>1 nguồn khớp (R1 hoặc R3)</span>
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
  onClick: () => void;
}

function LayerPill({ active, dotColor, label, count, onClick }: LayerPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-[#202734] text-ink'
          : 'bg-transparent text-inkDim hover:bg-[#191F29] hover:text-inkMuted'
      }`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full transition-opacity"
        style={{
          backgroundColor: active ? dotColor : '#475569',
          opacity: active ? 1 : 0.45,
        }}
      />
      <span>{label}</span>
      {count && (
        <span className="hidden font-mono text-[11px] text-inkDim xl:inline">
          {count}
        </span>
      )}
    </button>
  );
}

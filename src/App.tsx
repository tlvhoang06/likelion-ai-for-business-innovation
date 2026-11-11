import { useEffect, useMemo, useState } from 'react';
import type {
  CommunesGeoJson,
  CommuneYagiStatus,
  DrawerTab,
  LayerToggles,
  RiverStationR2,
} from './types/yagi';
import {
  evaluateCommuneAtDate,
  SHOWCASE_COMMUNES,
  TIMELINE_DAYS,
} from './utils/yagiLogic';
import { TopBar } from './components/TopBar';
import { YagiMap } from './components/YagiMap';
import { TimelineDock } from './components/TimelineDock';
import { OperationalDrawer } from './components/OperationalDrawer';
import { VerificationModal } from './components/VerificationModal';

export default function App() {
  const [communes, setCommunes] = useState<CommuneYagiStatus[]>([]);
  const [geojson, setGeojson] = useState<CommunesGeoJson | null>(null);
  const [stations, setStations] = useState<RiverStationR2[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState<number>(3); // 2024-09-08 default storm rainfall peak
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerToggles>({
    r1: true,
    r3: true,
    useR64: false,
    unosat: false,
    s1: false,
  });

  const [activeTab, setActiveTab] = useState<DrawerTab>('bank');
  const [campaignLaunched, setCampaignLaunched] = useState<boolean>(false);
  const [borrowerConfirmed, setBorrowerConfirmed] = useState<Record<string, boolean>>({});
  const [ubndSigned, setUbndSigned] = useState<Record<string, boolean>>({});
  const [exceptionsResolved, setExceptionsResolved] = useState<Record<string, boolean>>({});
  const [auditOpen, setAuditOpen] = useState<boolean>(false);

  // Load verified static datasets
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/data/communes_yagi_status.json').then((r) => {
        if (!r.ok) throw new Error('Không tải được communes_yagi_status.json');
        return r.json() as Promise<CommuneYagiStatus[]>;
      }),
      fetch('/data/communes_2895.geojson').then((r) => {
        if (!r.ok) throw new Error('Không tải được communes_2895.geojson');
        return r.json() as Promise<CommunesGeoJson>;
      }),
      fetch('/data/stations_r2.json').then((r) => {
        if (!r.ok) throw new Error('Không tải được stations_r2.json');
        return r.json() as Promise<RiverStationR2[]>;
      }),
    ])
      .then(([cData, gData, sData]) => {
        if (!active) return;
        setCommunes(cData);
        setGeojson(gData);
        setStations(sData);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Lỗi nạp dữ liệu');
      });

    return () => {
      active = false;
    };
  }, []);

  // Escape key returns to Overview mode cleanly (closes Audit modal first if open)
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (auditOpen) {
          setAuditOpen(false);
        } else {
          setSelectedGid(null);
        }
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [auditOpen]);

  // Auto-playback for timeline scrubber
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setDayIdx((prev) => {
        if (prev >= TIMELINE_DAYS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1100);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const communeMap = useMemo(() => {
    const m = new Map<string, CommuneYagiStatus>();
    for (const c of communes) m.set(c.gid_3, c);
    return m;
  }, [communes]);

  const currentDay = TIMELINE_DAYS[dayIdx] ?? TIMELINE_DAYS[0];

  const stats = useMemo(() => {
    let triggeredCount = 0;
    let r1Count = 0;
    let r3Count = 0;
    let triggeredLoans = 0;
    let triggeredDebtM = 0;
    let savedLoans = 0;

    for (const c of communes) {
      const ev = evaluateCommuneAtDate(c, currentDay.date, layers);
      if (ev.r1On) r1Count += 1;
      if (ev.r3On) r3Count += 1;
      if (ev.count > 0) {
        triggeredCount += 1;
        triggeredLoans += c.sim_loans;
        triggeredDebtM += c.sim_debt_m_vnd;
        if (borrowerConfirmed[c.gid_3] || campaignLaunched) {
          savedLoans += c.sim_loans;
        }
      }
    }

    return {
      triggeredCount,
      r1Count,
      r3Count,
      triggeredLoans,
      triggeredDebtM,
      savedLoans,
    };
  }, [communes, currentDay.date, layers, borrowerConfirmed, campaignLaunched]);

  const selectedCommune = useMemo(
    () => (selectedGid ? communeMap.get(selectedGid) ?? null : null),
    [communeMap, selectedGid]
  );

  const handleToggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
        <div className="max-w-md rounded-[4px] border border-[#5B2121] bg-panel p-5">
          <div className="text-[14px] font-semibold text-[#F87171]">
            Không thể khởi tạo dữ liệu Bão Yagi
          </div>
          <p className="mt-1.5 text-[12.5px] text-inkMuted">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!geojson || communes.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[13px] text-inkMuted">
        Đang nạp lớp bản đồ 2.895 xã GADM v4.1 và 11 trạm thủy văn B5...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-canvas text-ink lg:h-screen lg:overflow-hidden">
      <TopBar
        communes={communes}
        selectedGid={selectedGid}
        onSelectCommune={setSelectedGid}
        onOpenAudit={() => setAuditOpen(true)}
      />

      {/* Quick Showcase Anchor Strip with instant Overview reset + toggle off */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line bg-[#13171F] px-4 py-1.5 text-[11.5px]">
        <button
          type="button"
          onClick={() => setSelectedGid(null)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-medium transition-colors ${
            selectedGid === null
              ? 'border-[#4D5A70] bg-[#212834] text-ink'
              : 'border-line bg-transparent text-inkMuted hover:border-lineStrong hover:text-ink'
          }`}
        >
          <span>Toàn vùng (2.895 xã)</span>
        </button>
        <span className="h-3.5 w-[1px] shrink-0 bg-line" />
        <span className="shrink-0 text-inkDim">Điểm đối chứng:</span>
        {SHOWCASE_COMMUNES.map((s) => {
          const active = s.gid === selectedGid;
          return (
            <button
              key={s.gid}
              type="button"
              onClick={() =>
                setSelectedGid((prev) => (prev === s.gid ? null : s.gid))
              }
              title={active ? 'Bấm lại để thoát về Tổng quan' : 'Bấm để phóng tới xã'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2 py-0.5 transition-colors ${
                active
                  ? 'border-[#4D5A70] bg-[#212834] text-ink'
                  : 'border-line bg-transparent text-inkMuted hover:border-lineStrong hover:text-ink'
              }`}
            >
              <span>{s.label}</span>
              <span className="font-mono text-[10.5px] text-inkDim">{s.tag}</span>
              {active && <span className="ml-0.5 text-[11px] text-inkMuted">&times;</span>}
            </button>
          );
        })}
      </div>

      {/* Main Cartographic Desk Split */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <YagiMap
            geojson={geojson}
            communeMap={communeMap}
            selectedGid={selectedGid}
            dateStr={currentDay.date}
            layers={layers}
            stats={stats}
            campaignLaunched={campaignLaunched}
            borrowerConfirmed={borrowerConfirmed}
            ubndSigned={ubndSigned}
            onSelectCommune={setSelectedGid}
            onToggleLayer={handleToggleLayer}
          />
          <TimelineDock
            dayIdx={dayIdx}
            isPlaying={isPlaying}
            campaignLaunched={campaignLaunched}
            onChangeDay={(idx) => {
              setIsPlaying(false);
              setDayIdx(idx);
            }}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onLaunchCampaign={() => setCampaignLaunched(true)}
          />
        </section>

        <OperationalDrawer
          communes={communes}
          stations={stations}
          selectedCommune={selectedCommune}
          dateStr={currentDay.date}
          layers={layers}
          stats={stats}
          activeTab={activeTab}
          campaignLaunched={campaignLaunched}
          borrowerConfirmed={borrowerConfirmed}
          ubndSigned={ubndSigned}
          exceptionsResolved={exceptionsResolved}
          onChangeTab={setActiveTab}
          onSelectCommune={setSelectedGid}
          onJumpToFloodPeak={() => {
            setIsPlaying(false);
            setDayIdx(7); // 2024-09-12 peak UNOSAT + Dap Cau/Pha Lai
          }}
          onLaunchCampaign={() => setCampaignLaunched(true)}
          onConfirmBorrower={(gid) =>
            setBorrowerConfirmed((prev) => ({ ...prev, [gid]: true }))
          }
          onSignUbnd={(gid) =>
            setUbndSigned((prev) => ({ ...prev, [gid]: true }))
          }
          onResolveException={(gid) =>
            setExceptionsResolved((prev) => ({ ...prev, [gid]: true }))
          }
        />
      </main>

      <VerificationModal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        communes={communes}
      />
    </div>
  );
}


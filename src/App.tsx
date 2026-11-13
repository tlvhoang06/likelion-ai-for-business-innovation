import { useEffect, useMemo, useState } from 'react';
import type {
  CommunesGeoJson,
  CommuneYagiStatus,
  DrawerTab,
  Lang,
  LayerToggles,
  RiverStationR2,
} from './types/yagi';
import {
  evaluateCommuneAtDate,
  formatNum,
  SHOWCASE_COMMUNES,
  TIMELINE_DAYS,
} from './utils/yagiLogic';
import {
  buildAiAssessmentMap,
  computeWhatIfComparison,
  type AiWorkspaceAction,
} from './utils/aiRiskEngine';
import { TopBar } from './components/TopBar';
import { YagiMap } from './components/YagiMap';
import { TimelineDock } from './components/TimelineDock';
import { OperationalDrawer } from './components/OperationalDrawer';
import { VerificationModal } from './components/VerificationModal';
import { SignalGlossaryModal } from './components/SignalGlossaryModal';
import {
  DeferralConfirmModal,
  type PendingDeferralConfirm,
} from './components/DeferralConfirmModal';
import {
  SpotlightWalkthrough,
  WALKTHROUGH_STEPS,
} from './components/SpotlightWalkthrough';

const DEMO_TOUR_COMMUNE_GID = 'VNM.3.4.26_1';
const DEFAULT_LAYERS: LayerToggles = {
  r1: true,
  r2: true,
  r3: true,
  useR64: false,
  unosat: false,
  s1: false,
};

export default function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const [communes, setCommunes] = useState<CommuneYagiStatus[]>([]);
  const [geojson, setGeojson] = useState<CommunesGeoJson | null>(null);
  const [stations, setStations] = useState<RiverStationR2[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState<number>(3); // 2024-09-08 default storm rainfall peak
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerToggles>(DEFAULT_LAYERS);

  const [activeTab, setActiveTab] = useState<DrawerTab>('bank');
  const [aiThreshold, setAiThreshold] = useState<number>(55);
  const [aiHighlightedGids, setAiHighlightedGids] = useState<string[]>([]);
  const [aiFocusSignal, setAiFocusSignal] = useState<{
    gids: string[];
    seq: number;
  } | null>(null);
  const [campaignLaunched, setCampaignLaunched] = useState<boolean>(false);
  const [borrowerConfirmed, setBorrowerConfirmed] = useState<Record<string, boolean>>({});
  const [ubndSigned, setUbndSigned] = useState<Record<string, boolean>>({});
  const [exceptionsResolved, setExceptionsResolved] = useState<Record<string, boolean>>({});
  const [auditOpen, setAuditOpen] = useState<boolean>(false);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);
  const [pendingDeferral, setPendingDeferral] =
    useState<PendingDeferralConfirm | null>(null);
  // Always open guided tour on page entry so every visitor gets an immediate walkthrough; Exit (Esc) closes cleanly for the active session
  const [tourOpen, setTourOpen] = useState<boolean>(true);
  const [tourStepIdx, setTourStepIdx] = useState<number>(0);

  useEffect(() => {
    document.title =
      lang === 'en'
        ? 'KipThoi — AI Geospatial Credit Triage · Typhoon Yagi Backtest'
        : 'KipThoi — Điều phối Tín dụng AI theo Địa không gian · Backtest Bão Yagi';
  }, [lang]);

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

  // Escape key dismisses active modal first, otherwise returns to Overview mode cleanly
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (tourOpen) {
          return;
        }
        if (pendingDeferral) {
          setPendingDeferral(null);
        } else if (glossaryOpen) {
          setGlossaryOpen(false);
        } else if (auditOpen) {
          setAuditOpen(false);
        } else {
          setSelectedGid(null);
        }
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [tourOpen, pendingDeferral, glossaryOpen, auditOpen]);

  const dataReady = Boolean(geojson && communes.length > 0);

  // Synchronize interactive app state for each guided walkthrough step (toggling R1/R3 layers, clicking a province/commune, opening UBND brief & legal modal)
  useEffect(() => {
    if (!tourOpen || !dataReady) return;
    const step = WALKTHROUGH_STEPS[tourStepIdx];
    if (!step) return;

    const timers: number[] = [];

    if (step.id === 'map') {
      setAuditOpen(false);
      setPendingDeferral(null);
      setSelectedGid(null);
      setActiveTab('bank');
      setLayers({ r1: false, r2: false, r3: false, useR64: false, unosat: false, s1: false });
      timers.push(
        window.setTimeout(() => {
          setLayers((prev) => ({ ...prev, r1: true }));
        }, 400),
        window.setTimeout(() => {
          setLayers((prev) => ({ ...prev, r2: true }));
        }, 1150),
        window.setTimeout(() => {
          setLayers((prev) => ({ ...prev, r3: true }));
        }, 1900),
        window.setTimeout(() => {
          setLayers((prev) => ({ ...prev, unosat: true }));
        }, 2650),
        window.setTimeout(() => {
          setLayers((prev) => ({ ...prev, s1: true }));
        }, 3400)
      );
    } else if (step.id === 'drill') {
      setAuditOpen(false);
      setLayers(DEFAULT_LAYERS);
      setActiveTab('bank');
      setSelectedGid(DEMO_TOUR_COMMUNE_GID);
    } else if (step.id === 'timeline') {
      setAuditOpen(false);
      setSelectedGid(null);
      setLayers(DEFAULT_LAYERS);
      setActiveTab('bank');
    } else if (step.id === 'deferral') {
      setAuditOpen(false);
      setSelectedGid(null);
      setActiveTab('bank');
    } else if (step.id === 'ai') {
      setAuditOpen(false);
      setSelectedGid(null);
      setActiveTab('ai');
    } else if (step.id === 'ubnd-brief') {
      setAuditOpen(false);
      setActiveTab('ubnd');
      setSelectedGid(null);
      timers.push(
        window.setTimeout(() => {
          setSelectedGid(DEMO_TOUR_COMMUNE_GID);
        }, 1400)
      );
    } else if (step.id === 'legal') {
      setSelectedGid(null);
      setActiveTab('bank');
      setAuditOpen(true);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [tourOpen, tourStepIdx, dataReady]);

  const handleChangeTourStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(WALKTHROUGH_STEPS.length - 1, nextIdx));
    setTourStepIdx(clamped);
  };

  const handleOpenTour = () => {
    setAuditOpen(false);
    setGlossaryOpen(false);
    setPendingDeferral(null);
    setSelectedGid(null);
    setActiveTab('bank');
    setTourStepIdx(0);
    setTourOpen(true);
  };

  const handleCloseTour = () => {
    setTourOpen(false);
    setAuditOpen(false);
    setGlossaryOpen(false);
    setSelectedGid(null);
    setActiveTab('bank');
    setLayers(DEFAULT_LAYERS);
  };

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
    let r2Count = 0;
    let r3Count = 0;
    let priorityCount = 0;
    let watchlistCount = 0;
    let triggeredLoans = 0;
    let triggeredDebtM = 0;
    let savedLoans = 0;

    for (const c of communes) {
      const ev = evaluateCommuneAtDate(c, currentDay.date, layers);
      if (ev.r1On) r1Count += 1;
      if (ev.r2On) r2Count += 1;
      if (ev.r3On) r3Count += 1;
      if (ev.r1On || ev.r2On) priorityCount += 1;
      else if (ev.r3On) watchlistCount += 1;
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
      r2Count,
      r3Count,
      priorityCount,
      watchlistCount,
      triggeredLoans,
      triggeredDebtM,
      savedLoans,
    };
  }, [communes, currentDay.date, layers, borrowerConfirmed, campaignLaunched]);

  const selectedCommune = useMemo(
    () => (selectedGid ? communeMap.get(selectedGid) ?? null : null),
    [communeMap, selectedGid]
  );

  const assessments = useMemo(() => buildAiAssessmentMap(communes), [communes]);

  const whatIf = useMemo(
    () => computeWhatIfComparison(communes, assessments, aiThreshold),
    [communes, assessments, aiThreshold]
  );

  const handleToggleLayer = (key: keyof LayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectWindMode = (useR64: boolean) => {
    setLayers((prev) => ({
      ...prev,
      r3: true,
      useR64,
    }));
  };

  const handleRequestRegionalDeferral = () => {
    if (!campaignLaunched) {
      setPendingDeferral({ scope: 'regional' });
    }
  };

  const handleRequestCommuneDeferral = (gid: string) => {
    const target = communeMap.get(gid);
    if (!target || borrowerConfirmed[gid] || campaignLaunched) return;
    setPendingDeferral({ scope: 'commune', commune: target });
  };

  const handleConfirmPendingDeferral = () => {
    if (!pendingDeferral) return;
    if (pendingDeferral.scope === 'regional') {
      setCampaignLaunched(true);
    } else {
      const gid = pendingDeferral.commune.gid_3;
      setBorrowerConfirmed((prev) => ({ ...prev, [gid]: true }));
    }
    setPendingDeferral(null);
  };

  const handleApplyAiAction = (action: AiWorkspaceAction) => {
    if (action.dateStr) {
      const idx = TIMELINE_DAYS.findIndex((d) => d.date === action.dateStr);
      if (idx >= 0) {
        setIsPlaying(false);
        setDayIdx(idx);
      }
    }
    if (action.layers) {
      setLayers((prev) => ({ ...prev, ...action.layers }));
    }
    if (typeof action.threshold === 'number') {
      setAiThreshold(Math.max(45, Math.min(85, Math.round(action.threshold))));
    }
    if (action.highlightGids !== undefined) {
      setAiHighlightedGids(action.highlightGids);
    }
    if (action.selectGid !== undefined) {
      setSelectedGid(action.selectGid);
    }
    if (action.focusGids && action.focusGids.length > 0 && !action.selectGid) {
      setAiFocusSignal((prev) => ({
        gids: action.focusGids!,
        seq: (prev?.seq ?? 0) + 1,
      }));
    }
    if (action.switchTab) {
      setActiveTab(action.switchTab);
    }
  };

  const isEn = lang === 'en';

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
        <div className="max-w-md rounded-[4px] border border-[#5B2121] bg-panel p-5">
          <div className="text-[14px] font-semibold text-[#F87171]">
            {isEn
              ? 'Unable to initialize Typhoon Yagi datasets'
              : 'Không thể khởi tạo dữ liệu Bão Yagi'}
          </div>
          <p className="mt-1.5 text-[12.5px] text-inkMuted">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!geojson || communes.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[13px] text-inkMuted">
        {isEn
          ? 'Loading 2,895 GADM v4.1 communes and 11 B5 hydrological gauges...'
          : 'Đang nạp lớp bản đồ 2.895 xã GADM v4.1 và 11 trạm thủy văn B5...'}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-canvas text-ink lg:h-screen lg:overflow-hidden">
      <TopBar
        lang={lang}
        communes={communes}
        selectedGid={selectedGid}
        auditOpen={auditOpen}
        glossaryOpen={glossaryOpen}
        tourOpen={tourOpen}
        onChangeLang={setLang}
        onSelectCommune={setSelectedGid}
        onOpenAudit={() => {
          setGlossaryOpen(false);
          setAuditOpen(true);
        }}
        onOpenGlossary={() => {
          setAuditOpen(false);
          setGlossaryOpen(true);
        }}
        onOpenTour={handleOpenTour}
      />

      {/* Quick Showcase Anchor Strip with instant Overview reset + toggle off */}
      <div
        data-tour="showcase-bar"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-lineStrong bg-[#13171F] px-4 py-1.5 text-[11.5px]"
      >
        <button
          type="button"
          onClick={() => {
            setSelectedGid(null);
            setAiHighlightedGids([]);
          }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border px-2.5 py-0.5 font-medium transition-colors ${
            selectedGid === null
              ? 'border-[#8ACBB5] bg-[#8ACBB5] font-semibold text-[#0E1F1A] shadow-sm'
              : 'border-line bg-transparent text-inkMuted hover:border-[#8ACBB5]/60 hover:text-ink'
          }`}
        >
          <span>
            {isEn
              ? `All 12 Provinces (${formatNum(communes.length, lang)})`
              : `Toàn vùng (${formatNum(communes.length, lang)} xã)`}
          </span>
        </button>
        <span className="h-3.5 w-[1px] shrink-0 bg-line" />
        <span className="shrink-0 text-inkDim">
          {isEn ? 'Benchmarks:' : 'Điểm đối chứng:'}
        </span>
        {SHOWCASE_COMMUNES.map((s) => {
          const active = s.gid === selectedGid;
          return (
            <button
              key={s.gid}
              type="button"
              onClick={() =>
                setSelectedGid((prev) => (prev === s.gid ? null : s.gid))
              }
              title={
                active
                  ? isEn
                    ? 'Click again to return to Regional Overview'
                    : 'Bấm lại để thoát về Tổng quan'
                  : isEn
                  ? 'Click to fly map to commune'
                  : 'Bấm để phóng tới xã'
              }
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border px-2.5 py-0.5 transition-colors ${
                active
                  ? 'border-[#8ACBB5] bg-[#8ACBB5] font-semibold text-[#0E1F1A] shadow-sm'
                  : 'border-line bg-transparent text-inkMuted hover:border-[#8ACBB5]/60 hover:text-ink'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`font-mono text-[10.5px] ${
                  active ? 'font-semibold text-[#0E1F1A]/80' : 'text-inkDim'
                }`}
              >
                {isEn ? s.tagEn : s.tag}
              </span>
              {active && (
                <span className="ml-0.5 text-[11px] font-semibold text-[#0E1F1A]/80">
                  &times;
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Cartographic Desk Split */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <YagiMap
            lang={lang}
            geojson={geojson}
            communeMap={communeMap}
            selectedGid={selectedGid}
            aiHighlightedGids={aiHighlightedGids}
            aiFocusSignal={aiFocusSignal}
            dateStr={currentDay.date}
            layers={layers}
            stats={stats}
            campaignLaunched={campaignLaunched}
            borrowerConfirmed={borrowerConfirmed}
            ubndSigned={ubndSigned}
            onSelectCommune={setSelectedGid}
            onClearAiHighlights={() => setAiHighlightedGids([])}
            onToggleLayer={handleToggleLayer}
            onSelectWindMode={handleSelectWindMode}
          />
          <TimelineDock
            lang={lang}
            dayIdx={dayIdx}
            isPlaying={isPlaying}
            campaignLaunched={campaignLaunched}
            onChangeDay={(idx) => {
              setIsPlaying(false);
              setDayIdx(idx);
            }}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onLaunchCampaign={handleRequestRegionalDeferral}
          />
        </section>

        <OperationalDrawer
          lang={lang}
          communes={communes}
          stations={stations}
          selectedCommune={selectedCommune}
          dateStr={currentDay.date}
          layers={layers}
          stats={stats}
          assessments={assessments}
          aiThreshold={aiThreshold}
          whatIf={whatIf}
          activeTab={activeTab}
          campaignLaunched={campaignLaunched}
          borrowerConfirmed={borrowerConfirmed}
          ubndSigned={ubndSigned}
          exceptionsResolved={exceptionsResolved}
          aiHighlightedCount={aiHighlightedGids.length}
          onApplyAiAction={handleApplyAiAction}
          onClearAiHighlights={() => setAiHighlightedGids([])}
          onChangeTab={setActiveTab}
          onChangeAiThreshold={setAiThreshold}
          onSelectCommune={setSelectedGid}
          onJumpToFloodPeak={() => {
            setIsPlaying(false);
            setDayIdx(7); // 2024-09-12 peak UNOSAT + Dap Cau/Pha Lai
          }}
          onLaunchCampaign={handleRequestRegionalDeferral}
          onConfirmBorrower={handleRequestCommuneDeferral}
          onSignUbnd={(gid) =>
            setUbndSigned((prev) => ({ ...prev, [gid]: true }))
          }
          onResolveException={(gid) =>
            setExceptionsResolved((prev) => ({ ...prev, [gid]: true }))
          }
        />
      </main>

      <DeferralConfirmModal
        lang={lang}
        pending={pendingDeferral}
        dateStr={currentDay.date}
        totalCommunes={communes.length}
        stats={stats}
        onCancel={() => setPendingDeferral(null)}
        onConfirm={handleConfirmPendingDeferral}
      />

      <VerificationModal
        lang={lang}
        open={auditOpen}
        onClose={() => {
          if (tourOpen) handleCloseTour();
          else setAuditOpen(false);
        }}
        communes={communes}
      />

      <SignalGlossaryModal
        lang={lang}
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      <SpotlightWalkthrough
        lang={lang}
        open={tourOpen && dataReady}
        stepIdx={tourStepIdx}
        onChangeStep={handleChangeTourStep}
        onClose={handleCloseTour}
      />
    </div>
  );
}


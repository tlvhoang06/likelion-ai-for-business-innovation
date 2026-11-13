import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  FileCheck2,
  SlidersHorizontal,
  Waves,
} from 'lucide-react';
import type {
  CommuneYagiStatus,
  DrawerTab,
  Lang,
  LayerToggles,
  RiverStationR2,
} from '../types/yagi';
import {
  computeProvinceStats,
  evaluateCommuneAtDate,
  formatNum,
  formatPct,
  formatVndBillions,
  isStationActiveAtDate,
  SIGNAL_COLORS,
} from '../utils/yagiLogic';
import {
  filterAiExceptionQueue,
  getWorkflowTrack,
  type CommuneAiAssessment,
  type WhatIfSummary,
  type AiWorkspaceAction,
} from '../utils/aiRiskEngine';
import { AiCopilotPanel } from './AiCopilotPanel';

interface OperationalDrawerProps {
  lang: Lang;
  communes: CommuneYagiStatus[];
  stations: RiverStationR2[];
  selectedCommune: CommuneYagiStatus | null;
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
  assessments: Map<string, CommuneAiAssessment>;
  aiThreshold: number;
  whatIf: WhatIfSummary;
  activeTab: DrawerTab;
  campaignLaunched: boolean;
  borrowerConfirmed: Record<string, boolean>;
  ubndSigned: Record<string, boolean>;
  exceptionsResolved: Record<string, boolean>;
  onChangeTab: (tab: DrawerTab) => void;
  onChangeAiThreshold: (v: number) => void;
  onSelectCommune: (gid: string | null) => void;
  onJumpToFloodPeak: () => void;
  onLaunchCampaign: () => void;
  onConfirmBorrower: (gid: string) => void;
  onSignUbnd: (gid: string) => void;
  onResolveException: (gid: string) => void;
  aiHighlightedCount?: number;
  onApplyAiAction: (action: AiWorkspaceAction) => void;
  onClearAiHighlights?: () => void;
}

const DRAWER_TABS: Array<{ id: DrawerTab; vi: string; en: string }> = [
  { id: 'bank', vi: 'Giãn nợ', en: 'Deferral' },
  { id: 'ai', vi: 'Trợ lý AI', en: 'AI Assistant' },
  { id: 'ubnd', vi: 'UBND Xã', en: 'Commune' },
  { id: 'exceptions', vi: 'Ngoại lệ', en: 'Exceptions' },
  { id: 'stations', vi: 'Mực nước', en: 'Rivers' },
  { id: 'api', vi: 'API', en: 'API' },
];

export function OperationalDrawer({
  lang,
  communes,
  stations,
  selectedCommune: c,
  dateStr,
  layers,
  stats,
  assessments,
  aiThreshold,
  whatIf,
  activeTab,
  campaignLaunched,
  borrowerConfirmed,
  ubndSigned,
  exceptionsResolved,
  onChangeTab,
  onChangeAiThreshold,
  onSelectCommune,
  onJumpToFloodPeak,
  onLaunchCampaign,
  onConfirmBorrower,
  onSignUbnd,
  onResolveException,
  aiHighlightedCount = 0,
  onApplyAiAction,
  onClearAiHighlights,
}: OperationalDrawerProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [exQueueFilter, setExQueueFilter] = useState<
    'all' | 'watchlist_ml' | 'unflagged_ml' | 'outside_scan'
  >('all');

  const signalEval = c ? evaluateCommuneAtDate(c, dateStr, layers) : null;
  const selectedAi = c ? assessments.get(c.gid_3) ?? null : null;
  const isConfirmed = c ? !!(borrowerConfirmed[c.gid_3] || campaignLaunched) : campaignLaunched;
  const isUbndSigned = c ? !!ubndSigned[c.gid_3] : false;
  const isExResolved = c ? !!exceptionsResolved[c.gid_3] : false;
  const displayDate = lang === 'en' ? dateStr : dateStr.split('-').reverse().join('/');

  const hotspotCommunes = useMemo(
    () =>
      communes
        .filter((x) => x.unosat_label === 1)
        .sort((a, b) => (b.unosat_flood_pct ?? 0) - (a.unosat_flood_pct ?? 0))
        .slice(0, 6),
    [communes]
  );

  // AI-ranked W3 exception queue dynamically synced with aiThreshold slider & quick triage filters
  const exceptionSummary = useMemo(
    () => filterAiExceptionQueue(communes, assessments, aiThreshold, 40),
    [communes, assessments, aiThreshold]
  );

  const mlPoolBuckets = useMemo(() => {
    const wl = communes
      .filter((x) => getWorkflowTrack(x) === 'watchlist_r3_only' && x.s2_ml_confirm === true)
      .sort((a, b) => (b.s2_ml_prob ?? 0) - (a.s2_ml_prob ?? 0))
      .map((commune) => ({ commune, ai: assessments.get(commune.gid_3)! }))
      .filter((x) => Boolean(x.ai));
    const unfl = communes
      .filter((x) => getWorkflowTrack(x) === 'unflagged_early' && x.s2_ml_confirm === true)
      .sort((a, b) => (b.s2_ml_prob ?? 0) - (a.s2_ml_prob ?? 0))
      .map((commune) => ({ commune, ai: assessments.get(commune.gid_3)! }))
      .filter((x) => Boolean(x.ai));
    const outScan = exceptionSummary.items.filter(
      (x) => x.commune.unosat_status !== 'CLASSIFIABLE'
    );
    return {
      watchlistMl: wl,
      unflaggedMl: unfl,
      outsideScan: outScan,
    };
  }, [communes, assessments, exceptionSummary.items]);

  const exceptionQueue =
    exQueueFilter === 'watchlist_ml'
      ? mlPoolBuckets.watchlistMl.slice(0, 40)
      : exQueueFilter === 'unflagged_ml'
      ? mlPoolBuckets.unflaggedMl.slice(0, 40)
      : exQueueFilter === 'outside_scan'
      ? mlPoolBuckets.outsideScan
      : exceptionSummary.items;

  const exceptionMatchingCount =
    exQueueFilter === 'watchlist_ml'
      ? mlPoolBuckets.watchlistMl.length
      : exQueueFilter === 'unflagged_ml'
      ? mlPoolBuckets.unflaggedMl.length
      : exQueueFilter === 'outside_scan'
      ? mlPoolBuckets.outsideScan.length
      : exceptionSummary.totalMatching;

  const provinceStats = useMemo(() => computeProvinceStats(communes), [communes]);

  const apiPayload = useMemo(() => {
    if (!c || !signalEval) {
      return {
        standard: 'TT_64_2024_TT_NHNN_OpenAPI_OAuth2',
        audit_retention_years: 5,
        payout_sla_business_days: 15,
        applicable_decrees: ['ND_346_2026', 'TT_29_2025_TT_NHNN', 'ND_86_2024'],
        privacy_guard: 'ZERO_PII_COMMUNE_GID3_ONLY',
        scope: 'REGIONAL_OVERVIEW_12_PROVINCES',
        total_communes: communes.length,
        observed_date: dateStr,
        triggered_communes: stats.triggeredCount,
        r1_triggered_communes: stats.r1Count,
        r2_triggered_communes: stats.r2Count,
        r3_triggered_communes: stats.r3Count,
        priority_review_r1_or_r2: stats.priorityCount,
        watchlist_r3_only: stats.watchlistCount,
        r2_river_stations_bd3: stations.filter((s) => isStationActiveAtDate(s, dateStr)).length,
        r2_crosswalk_status: 'RESOLVED_6_NORTHERN_BASINS_2895_COMMUNES_0_UNRESOLVED_CONFLUENCES',
        ai_triage_whatif: {
          score_threshold: whatIf.threshold,
          baseline_r1_recall_pct: Number(whatIf.baselineRecallPct.toFixed(1)),
          ai_assisted_recall_pct: Number(whatIf.aiRecallPct.toFixed(1)),
          extra_flooded_communes_flagged: whatIf.aiExtraFloodedCaught,
          outside_unosat_candidates: whatIf.outsideBlindSpotFlagged,
        },
        stage2_ml_cv_benchmark: {
          model: 'HistGradientBoostingClassifier_GroupKFold4',
          classifiable_communes: 2540,
          outside_cv_unknown_communes: 355,
          cv_precision_pct: 63.46,
          cv_recall_pct: 79.11,
          note: 'Post-event confirmation gate only (Sentinel-1 08-21 Sep + R2 + R1 + HAND); never early-alert accuracy',
        },
        simulated_portfolio_loans: stats.triggeredLoans,
        campaign_1tap_dispatched: campaignLaunched,
      };
    }

    return {
      standard: 'TT_64_2024_TT_NHNN_OpenAPI_OAuth2',
      audit_retention_years: 5,
      payout_sla_business_days: 15,
      applicable_decrees: ['ND_346_2026', 'TT_29_2025_TT_NHNN', 'ND_86_2024'],
      privacy_guard: 'ZERO_PII_COMMUNE_GID3_ONLY',
      commune: {
        gid_3: c.gid_3,
        name: c.name,
        district: c.district,
        province: c.province,
      },
      observed_date: dateStr,
      triggers: {
        r1_rain_qd18: {
          triggered: signalEval.r1On,
          peak_24h_mm: c.rain_mm,
          first_trigger_ict: c.r1_time,
        },
        r2_river_qd05: {
          triggered: signalEval.r2On,
          station: c.r2_station ?? null,
          river: c.r2_river ?? null,
          distance_km: c.r2_distance_km ?? null,
          hand_le10_pct: c.hand_le10_pct ?? c.r2_hand_le10_pct ?? null,
          first_bd3_bulletin_ict: c.r2_first_bulletin_ict ?? null,
          peak_time_ict: c.r2_peak_time_ict ?? null,
          assignment_status: c.r2_status ?? 'NO_SELECTED_NAMED_RIVER_LINE_INTERSECTION',
          stations_above_bd3: stations.filter((s) => isStationActiveAtDate(s, dateStr))
            .length,
        },
        workflow_track:
          signalEval.r1On || signalEval.r2On
            ? 'PRIORITY_REVIEW_R1_OR_R2_CONFIRM_BEFORE_1TAP'
            : signalEval.r3On
            ? 'WATCHLIST_R3_WIND_ONLY_NEEDS_CONFIRMATION'
            : 'UNFLAGGED_EARLY_EXCEPTION_CHECK',
        r3_wind: {
          threshold: layers.useR64 ? 'R64' : 'R50',
          triggered: signalEval.r3On,
          first_trigger_ict: c.r3_time,
        },
      },
      remote_sensing_validation: {
        unosat_3966_status: c.unosat_status,
        unosat_flood_pct: c.unosat_flood_pct,
        sentinel1_flood_pct: c.s1_flood_pct,
        sentinel1_cov_pct: c.s1_cov_pct ?? null,
        hand_le10_pct: c.hand_le10_pct ?? c.r2_hand_le10_pct ?? null,
      },
      stage2_ml_confirmation: {
        model: 'HistGradientBoostingClassifier_CV',
        post_event_window: '2024-09-08_to_2024-09-21',
        prob: c.s2_ml_prob ?? null,
        confirmed: c.s2_ml_confirm ?? null,
        cv_fold: c.s2_ml_fold ?? null,
        cv_cutoff: c.s2_ml_cutoff ?? null,
        coverage_note:
          c.s2_ml_prob != null
            ? 'CLASSIFIABLE_2540_CV'
            : 'NULL_OUTSIDE_UNOSAT_SCAN',
      },
      ai_basis_risk_triage: selectedAi
        ? {
            score: selectedAi.score,
            tier: selectedAi.tier,
            basis_risk_miss_r1: selectedAi.isBasisRiskMiss,
            outside_scan_candidate: selectedAi.isBlindSpotCandidate,
            human_approval_required: true,
          }
        : null,
      borrower_consent_1tap: isConfirmed,
      ubnd_batch_attestation: isUbndSigned,
    };
  }, [
    c,
    signalEval,
    selectedAi,
    communes.length,
    dateStr,
    stats.triggeredCount,
    stats.r1Count,
    stats.r2Count,
    stats.r3Count,
    stats.priorityCount,
    stats.watchlistCount,
    stats.triggeredLoans,
    whatIf.threshold,
    whatIf.baselineRecallPct,
    whatIf.aiRecallPct,
    whatIf.aiExtraFloodedCaught,
    whatIf.outsideBlindSpotFlagged,
    campaignLaunched,
    layers.useR64,
    stations,
    isConfirmed,
    isUbndSigned,
  ]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(apiPayload, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const isFloodPeak = dateStr === '2024-09-12';
  const isEn = lang === 'en';

  return (
    <aside
      data-tour="drawer-panel"
      className="flex w-full shrink-0 flex-col border-t border-lineStrong bg-panel lg:w-[460px] lg:border-l lg:border-t-0 xl:w-[480px]"
    >
      {/* Selected Commune OR Regional Overview Header */}
      {c && signalEval ? (
        <div className="border-b border-lineStrong px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[15px] font-semibold text-ink">
                  {isEn ? `${c.name} Commune` : `Xã ${c.name}`}
                </h2>
                {selectedAi && (
                  <button
                    type="button"
                    onClick={() => onChangeTab('exceptions')}
                    title={
                      isEn
                        ? 'Open threshold filter & score breakdown in Exceptions'
                        : 'Bấm để mở điểm rủi ro & bộ lọc trong tab Ngoại lệ'
                    }
                    className="inline-flex items-center rounded-[4px] border border-lineStrong bg-canvas px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
                  >
                    <span>
                      {isEn
                        ? `Triage ${selectedAi.score}/100`
                        : `Ưu tiên rà ${selectedAi.score}/100`}
                    </span>
                  </button>
                )}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-inkMuted">
                {c.district}, {c.province} &middot;{' '}
                <span className="font-mono text-inkDim">{c.gid_3}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onJumpToFloodPeak}
                className={`inline-flex h-7 items-center rounded-[4px] px-2.5 text-[11.5px] font-semibold transition-colors ${
                  isFloodPeak
                    ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                    : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                }`}
              >
                {isEn ? 'Peak 12/09' : 'Đỉnh lũ 12/09'}
              </button>
              <button
                type="button"
                onClick={() => onSelectCommune(null)}
                title={
                  isEn
                    ? 'Return to 12-province regional overview (Esc)'
                    : 'Quay lại danh sách tổng quan toàn vùng (Esc)'
                }
                className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-lineStrong bg-transparent px-2 text-[11.5px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={2} />
                <span>{isEn ? 'Overview' : 'Danh sách'}</span>
              </button>
            </div>
          </div>

          {/* Compact 4-signal verification matrix */}
          <div className="mt-3 divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas text-[12.5px]">
            <SignalRow
              label={isEn ? 'R1 24h Rain (Dec. 18)' : 'R1 Mưa 24h (Đ.44 QĐ 18)'}
              value={`${c.rain_mm} mm`}
              status={
                signalEval.r1On
                  ? isEn
                    ? 'Triggered'
                    : 'Chạm ngưỡng'
                  : c.r1
                  ? isEn
                    ? 'Pre-event date'
                    : 'Chưa đến ngày'
                  : isEn
                  ? 'Below 200mm'
                  : 'Dưới 200mm'
              }
              dotColor={signalEval.r1On ? SIGNAL_COLORS.r1 : undefined}
            />
            <SignalRow
              label={
                isEn
                  ? `R3 Typhoon Wind (${layers.useR64 ? 'R64' : 'R50'})`
                  : `R3 Gió bão (${layers.useR64 ? 'R64' : 'R50'})`
              }
              value={
                signalEval.r3On
                  ? isEn
                    ? 'In wind swath'
                    : 'Trong vùng gió'
                  : isEn
                  ? 'Outside'
                  : 'Không'
              }
              status={c.r3_time ? c.r3_time.slice(0, 10) : '—'}
              dotColor={
                signalEval.r3On
                  ? layers.useR64
                    ? SIGNAL_COLORS.r3R64
                    : SIGNAL_COLORS.r3R50
                  : undefined
              }
            />
            <SignalRow
              label={isEn ? 'R2 River Stage (Dec. 05)' : 'R2 Mực nước sông (QĐ 05)'}
              value={
                c.r2 === 1 && c.r2_station
                  ? `${c.r2_station}${c.r2_distance_km ? ` (${c.r2_distance_km.toFixed(1)}km)` : ''}`
                  : c.r2_station === 'Ha Noi'
                  ? isEn
                    ? 'Ha Noi (11.30m < AL3)'
                    : 'Trạm Hà Nội (< BĐ3)'
                  : isEn
                  ? 'No 6-basin river cut'
                  : 'Không cắt 6 tuyến sông'
              }
              status={
                signalEval.r2On
                  ? c.r2_first_bulletin_ict
                    ? c.r2_first_bulletin_ict.slice(5, 16)
                    : c.r2_station === 'Yen Bai'
                    ? '09-08 19:00–21:47*'
                    : '> BĐ3'
                  : c.r2 === 1
                  ? isEn
                    ? 'Pre-AL3 date'
                    : 'Chưa vượt BĐ3'
                  : c.r2_station === 'Ha Noi'
                  ? 'R2 = 0 (< BĐ3)'
                  : 'R2 = 0'
              }
              dotColor={signalEval.r2On ? SIGNAL_COLORS.r2 : undefined}
              mutedStatus={c.r2 !== 1}
            />
            <SignalRow
              label="UNOSAT 3966 / Sentinel-1"
              value={
                c.unosat_flood_pct !== null
                  ? isEn
                    ? `${c.unosat_flood_pct.toFixed(1)}% flood`
                    : `${c.unosat_flood_pct.toFixed(1)}% ngập`
                  : isEn
                  ? 'Outside RRD scan'
                  : 'Ngoài vùng ĐBSH'
              }
              status={
                c.unosat_label === 1
                  ? isEn
                    ? 'Flood >= 5%'
                    : 'Ngập >= 5%'
                  : c.unosat_flood_pct !== null
                  ? isEn
                    ? 'Below 5%'
                    : 'Dưới 5%'
                  : isEn
                  ? 'Use S1 / Field'
                  : 'Dùng S1 / Thực địa'
              }
              dotColor={
                c.unosat_label === 1
                  ? SIGNAL_COLORS.unosat
                  : c.s1_label === 1
                  ? SIGNAL_COLORS.s1
                  : undefined
              }
            />
            <SignalRow
              label={isEn ? 'Stage-2 ML (S1+HAND)' : 'ML Tầng 2 (S1+HAND)'}
              value={
                c.s2_ml_prob != null
                  ? `${(c.s2_ml_prob * 100).toFixed(1)}% · HAND ${(
                      c.hand_le10_pct ??
                      c.r2_hand_le10_pct ??
                      0
                    ).toFixed(0)}%`
                  : `${isEn ? 'No CV' : 'Ngoài CV'} · HAND ${(
                      c.hand_le10_pct ??
                      c.r2_hand_le10_pct ??
                      0
                    ).toFixed(0)}%`
              }
              status={
                c.s2_ml_prob != null
                  ? c.s2_ml_confirm
                    ? isEn
                      ? `Confirmed (F${c.s2_ml_fold ?? '-'})`
                      : `Xác nhận (F${c.s2_ml_fold ?? '-'})`
                    : isEn
                    ? `Below cutoff (F${c.s2_ml_fold ?? '-'})`
                    : `Dưới ngưỡng (F${c.s2_ml_fold ?? '-'})`
                  : isEn
                  ? 'Unknown (use S1)'
                  : 'Chưa biết (dùng S1)'
              }
              dotColor={c.s2_ml_confirm === true ? '#98c127' : undefined}
              mutedStatus={c.s2_ml_confirm !== true}
            />
          </div>
        </div>
      ) : (
        <div className="border-b border-lineStrong px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-[15px] font-semibold text-ink">
              {isEn
                ? 'Regional Overview — 12 Northern Provinces'
                : 'Tổng quan Toàn vùng — 12 tỉnh Bắc Bộ'}
            </h2>
            <button
              type="button"
              onClick={onJumpToFloodPeak}
              className={`inline-flex h-7 shrink-0 items-center rounded-[5px] px-2.5 text-[11.5px] font-semibold transition-colors ${
                isFloodPeak
                  ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                  : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
              }`}
            >
              {isEn ? 'Flood Peak 12/09' : 'Đỉnh lũ 12/09'}
            </button>
          </div>
          <div className="mt-1 text-[12px] text-inkMuted">
            {isEn
              ? '2,895 GADM v4.1 communes · Select any commune on map or benchmark strip'
              : '2.895 xã GADM v4.1 · Bấm xã trên bản đồ hoặc dải đối chứng để xem chi tiết'}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">
                {isEn ? 'Priority R1|R2 vs Watchlist R3' : 'Ưu tiên R1|R2 vs Watchlist R3'}
              </div>
              <div className="mt-0.5 font-mono text-[13.5px] font-semibold tabular-nums">
                <span className="text-[#8ACBB5]">{formatNum(stats.priorityCount, lang)}</span>{' '}
                <span className="text-inkDim">/</span>{' '}
                <span className="text-[#ff8ca1]">{formatNum(stats.watchlistCount, lang)}</span>{' '}
                <span className="text-[11px] font-normal text-inkDim">
                  ({formatNum(stats.triggeredCount, lang)}/2.895)
                </span>
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">
                {isEn ? 'At-Risk Portfolio (Sim.)' : 'Dư nợ vùng rủi ro (giả lập)'}
              </div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatVndBillions(stats.triggeredDebtM, lang)}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">
                {isEn ? '5% Dec. 86 Provision Risk' : 'Dự phòng 5% NĐ 86 nguy cơ'}
              </div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatVndBillions(stats.triggeredDebtM * 0.05, lang)}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">
                {isEn ? 'Break-Even (1 / 725 Loans)' : 'Hòa vốn mô hình 1/725'}
              </div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatNum(stats.savedLoans, lang)}{' '}
                {isEn ? 'kept Group 1' : 'khoản giữ N1'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Segmented Underline Tab Bar */}
      <nav
        aria-label={isEn ? 'Operational workflows' : 'Nghiệp vụ chi tiết'}
        className="flex overflow-x-auto border-b border-lineStrong bg-canvas px-1"
      >
        {DRAWER_TABS.map((tab) => {
          const active = tab.id === activeTab;
          const isAiTab = tab.id === 'ai';
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap px-2 py-2.5 text-center text-[11.5px] font-medium transition-colors sm:flex-1 sm:px-1 ${
                active
                  ? isAiTab
                    ? 'text-[#8ACBB5]'
                    : 'text-ink'
                  : isAiTab
                  ? 'text-[#8ACBB5]/80 hover:text-[#8ACBB5]'
                  : 'text-inkDim hover:text-inkMuted'
              }`}
            >
              <span>{isEn ? tab.en : tab.vi}</span>
              {active && (
                <span
                  className={`absolute bottom-0 left-1.5 right-1.5 h-[2px] ${
                    isAiTab ? 'bg-[#8ACBB5]' : 'bg-ink'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Tab Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === 'ai' && (
          <AiCopilotPanel
            lang={lang}
            communes={communes}
            stations={stations}
            selectedCommune={c}
            assessments={assessments}
            whatIf={whatIf}
            dateStr={dateStr}
            aiHighlightedCount={aiHighlightedCount}
            onSelectCommune={onSelectCommune}
            onApplyAiAction={onApplyAiAction}
            onClearAiHighlights={onClearAiHighlights}
            onOpenExceptionsTab={() => onChangeTab('exceptions')}
          />
        )}

        {activeTab === 'bank' && (
          c ? (
            <div className="space-y-3.5">
              {/* Simulated Portfolio Box */}
              <div className="flex items-center justify-between rounded-[6px] border border-lineStrong bg-canvas px-3.5 py-2.5">
                <div>
                  <div className="text-[11.5px] text-inkDim">
                    {isEn
                      ? 'Rural portfolio by commune (sim. 290M VND/loan)'
                      : 'Danh mục nông thôn gắn mã xã (giả lập 290tr/khoản)'}
                  </div>
                  <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                    {formatNum(c.sim_loans, lang)} {isEn ? 'loans' : 'khoản'} &middot;{' '}
                    {formatVndBillions(c.sim_debt_m_vnd, lang)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-inkDim">
                    {isEn ? '5% provision avoided' : 'Dự phòng 5% tránh được'}
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-ink tabular-nums">
                    {formatVndBillions(c.sim_debt_m_vnd * 0.05, lang)}
                  </div>
                </div>
              </div>

              {/* Borrower App/SMS Notification Preview */}
              <div className="rounded-[6px] border border-lineStrong bg-panelAlt p-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2 text-[11.5px] text-inkDim">
                  <span>
                    {isEn
                      ? 'SMS / Banking App Notice to Borrower'
                      : 'SMS / App Ngân hàng gửi Hộ vay'}
                  </span>
                  <span className="font-mono text-inkMuted">
                    {isEn ? 'Art. 3.1 Cir. 29/2025' : 'Khoản 1 Đ.3 TT 29/2025'}
                  </span>
                </div>

                <p className="mt-2.5 text-[13px] leading-relaxed text-ink">
                  {isEn ? (
                    <>
                      <b>{c.name} Commune</b> ({c.province}) is classified in{' '}
                      <b>
                        {c.r1 || c.r2 === 1
                          ? 'Priority Review (R1|R2)'
                          : c.r3_r50
                          ? 'Wind Watchlist (R3-only)'
                          : 'Exception Monitoring'}
                      </b>{' '}
                      (rain {c.rain_mm}mm{c.r2 === 1 && c.r2_station ? `, river ${c.r2_station} >AL3` : ''}{c.r3_r50 ? ', wind R50' : ''}). After damage confirmation (Sentinel-1 / UBND), dispatch a 1-tap{' '}
                      <b>3–6 month Group 1 deferral offer</b> inside the 10-day window.
                    </>
                  ) : (
                    <>
                      Địa bàn <b>Xã {c.name}</b> ({c.province}) thuộc diện{' '}
                      <b>
                        {c.r1 || c.r2 === 1
                          ? 'Rà soát Ưu tiên (R1|R2)'
                          : c.r3_r50
                          ? 'Theo dõi Watchlist (chỉ gió R3)'
                          : 'Theo dõi Ngoại lệ'}
                      </b>{' '}
                      (mưa {c.rain_mm}mm{c.r2 === 1 && c.r2_station ? `, lũ ${c.r2_station} >BĐ3` : ''}{c.r3_r50 ? ', gió R50' : ''}). Sau bước xác nhận thiệt hại (Sentinel-1 / UBND), gửi đề nghị{' '}
                      <b>giãn nợ 3–6 tháng giữ Nhóm 1</b> trong cửa sổ 10 ngày.
                    </>
                  )}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirmBorrower(c.gid_3)}
                    disabled={isConfirmed}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3.5 text-[12.5px] font-semibold transition-colors ${
                      isConfirmed
                        ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {isConfirmed
                        ? isEn
                          ? 'Deferral request recorded (Group 1)'
                          : 'Đã ghi nhận đề nghị giãn nợ (Nhóm 1)'
                        : isEn
                        ? 'Confirm fast debt deferral'
                        : 'Xác nhận giãn nợ nhanh'}
                    </span>
                  </button>
                </div>

                {isConfirmed && (
                  <div className="mt-2.5 rounded-[4px] border border-line bg-canvas/60 px-3 py-2 text-[11.5px] text-[#CBD5E1]">
                    {isEn
                      ? `Digital consent saved for ${c.name}: Group 1 kept, 5% provision waived (Decree 86).`
                      : `Đã lưu xác nhận cho Xã ${c.name}: giữ Nhóm 1, miễn 5% dự phòng NĐ 86.`}
                  </div>
                )}
              </div>

              <div className="rounded-[4px] border border-lineStrong bg-canvas px-3 py-2 text-[11.5px] text-inkMuted">
                <b className="font-medium text-ink">
                  {isEn ? 'Counter fallback:' : 'Nộp tại quầy:'}
                </b>{' '}
                {isEn
                  ? 'Borrowers without smartphones can still submit paper forms before reaching 10 days overdue.'
                  : 'Hộ không dùng smartphone vẫn nộp đơn giấy tại quầy trước khi đủ 10 ngày quá hạn.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="rounded-[4px] border border-lineStrong bg-panelAlt p-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2 text-[11.5px] text-inkDim">
                  <span>
                    {isEn
                      ? 'Regional Debt Relief (Cir. 29/2025)'
                      : 'Chiến dịch Giãn nợ Toàn vùng (TT 29/2025)'}
                  </span>
                  <span className="font-mono text-inkMuted">
                    {isEn ? 'Break-even 1 / 725' : 'Hòa vốn 1 / 725 khoản'}
                  </span>
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-inkMuted">
                  {isEn ? (
                    <>
                      As of <b className="text-ink">{displayDate}</b>:{' '}
                      <b className="text-[#8ACBB5]">{formatNum(stats.priorityCount, lang)} Priority (R1|R2)</b> +{' '}
                      <b className="text-[#ff8ca1]">{formatNum(stats.watchlistCount, lang)} Watchlist (R3)</b>{' '}
                      ({formatNum(stats.triggeredLoans, lang)} loans, ~{formatVndBillions(stats.triggeredDebtM, lang)}). Sends 1-tap offers post-confirmation inside the 10-day window.
                    </>
                  ) : (
                    <>
                      Mốc <b className="text-ink">{displayDate}</b>:{' '}
                      <b className="text-[#8ACBB5]">{formatNum(stats.priorityCount, lang)} xã Ưu tiên (R1|R2)</b> +{' '}
                      <b className="text-[#ff8ca1]">{formatNum(stats.watchlistCount, lang)} xã Watchlist (R3)</b>{' '}
                      ({formatNum(stats.triggeredLoans, lang)} khoản, ~{formatVndBillions(stats.triggeredDebtM, lang)}). Phát đề xuất 1-Chạm sau xác nhận thiệt hại.
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onLaunchCampaign}
                    disabled={campaignLaunched}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3.5 text-[12.5px] font-semibold transition-colors ${
                      campaignLaunched
                        ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {campaignLaunched
                        ? isEn
                          ? `Group 1 retained for ${formatNum(stats.savedLoans, lang)} loans`
                          : `Đã giữ Nhóm 1 cho ${formatNum(stats.savedLoans, lang)} khoản`
                        : isEn
                        ? 'Dispatch regional deferral proposal'
                        : 'Gửi đề xuất giãn nợ toàn vùng'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTab('ai')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-lineStrong bg-canvas px-3 text-[12px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
                  >
                    <span>
                      {isEn
                        ? `Find +${whatIf.aiExtraFloodedCaught} missed floods`
                        : `Tìm thêm +${whatIf.aiExtraFloodedCaught} xã ngập bị sót`}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium text-ink">
                  {isEn
                    ? 'Severely flooded communes (click to inspect)'
                    : 'Các xã trọng điểm ngập cao (bấm để xem chi tiết)'}
                </div>
                <div className="divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas">
                  {hotspotCommunes.map((h) => (
                    <button
                      key={h.gid_3}
                      type="button"
                      onClick={() => onSelectCommune(h.gid_3)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-panelAlt"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-medium text-ink">{h.name}</span>{' '}
                        <span className="text-[11.5px] text-inkDim">
                          ({h.district}, {h.province})
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[11.5px] text-inkMuted tabular-nums">
                        {h.unosat_flood_pct?.toFixed(1)}% &middot; {h.sim_loans}{' '}
                        {isEn ? 'loans' : 'khoản'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'ubnd' && (
          c ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCommune(null)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-lineStrong bg-transparent px-3 text-[12px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span>{isEn ? 'Back to commune list' : 'Quay lại danh sách xã'}</span>
                </button>
                <span className="truncate font-mono text-[11px] text-inkDim">
                  {isEn ? `${c.name} Commune` : `Xã ${c.name}`}
                </span>
              </div>

              <div className="rounded-[4px] border border-lineStrong bg-canvas p-4">
                <div className="border-b border-line pb-2.5 text-center text-[12px] font-semibold tracking-wide text-ink">
                  {isEn
                    ? 'COMMUNE-LEVEL REMOTE-SENSING LOSS ATTESTATION'
                    : 'BIÊN BẢN XÁC NHẬN THIỆT HẠI VIỄN THÁM CẤP XÃ'}
                </div>

                <div className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'Administrative unit' : 'Đơn vị hành chính'}
                    </span>
                    <span className="text-right font-medium text-ink">
                      {isEn ? `${c.name} Commune` : `Xã ${c.name}`}, {c.district}, {c.province}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'GADM v4.1 Code' : 'Mã GADM v4.1'}
                    </span>
                    <span className="font-mono text-ink">{c.gid_3}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'Early Alert R1 / R2 / R3' : 'Cảnh báo R1 / R2 / R3'}
                    </span>
                    <span className="font-mono text-ink">
                      {c.rain_mm}mm &middot;{' '}
                      {c.r2 === 1 ? `R2 ${c.r2_station ?? '>BĐ3'}` : 'R2 —'} &middot; R50:{' '}
                      {c.r3_r50 ? (isEn ? 'Yes' : 'Có') : isEn ? 'No' : 'Không'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'UNOSAT 3966 Flood Scan' : 'Ảnh ngập UNOSAT 3966'}
                    </span>
                    <span className="font-mono text-ink">
                      {c.unosat_flood_pct !== null
                        ? `${c.unosat_flood_ha.toFixed(1)} ha (${c.unosat_flood_pct.toFixed(2)}%)`
                        : isEn
                        ? 'Outside RRD scan'
                        : 'Ngoài vùng quét ĐBSH'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-inkDim">
                      {isEn ? 'Rural loan accounts in commune' : 'Hồ sơ vay nông thôn trong xã'}
                    </span>
                    <span className="font-mono text-ink">
                      {formatNum(c.sim_loans, lang)} {isEn ? 'borrowers' : 'hộ vay'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[11.5px] text-inkDim">
                    {isEn
                      ? '1 signature shared across banks & insurers.'
                      : '1 chữ ký UBND dùng chung mọi ngân hàng.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSignUbnd(c.gid_3)}
                    disabled={isUbndSigned}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[12px] font-medium transition-colors ${
                      isUbndSigned
                        ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>
                      {isUbndSigned
                        ? isEn
                          ? 'Commune signed batch attestation'
                          : 'UBND Xã đã ký xác nhận chung'
                        : isEn
                        ? 'Sign batch commune certificate'
                        : 'Ký xác nhận cho cả xã'}
                    </span>
                  </button>
                </div>
              </div>

              {isUbndSigned && (
                <div className="rounded-[4px] bg-white/[0.04] px-3 py-2 text-[11.5px] text-[#CBD5E1]">
                  {isEn
                    ? `Proposed batch attestation active for ${c.sim_loans} loans in ${c.name} (subject to partner bank & UBND acceptance).`
                    : `Xác nhận đề xuất theo xã đã kích hoạt cho ${c.sim_loans} hộ tại ${c.name} (áp dụng theo chấp thuận ngân hàng & UBND).`}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[4px] border border-lineStrong bg-canvas px-3 py-2 text-[11.5px] text-inkMuted">
                {isEn
                  ? 'Select a commune on the map or below to preview a proposed batch attestation (subject to partner bank & UBND acceptance).'
                  : 'Chọn xã trên bản đồ hoặc bên dưới để xem trước phương án xác nhận gộp theo xã (tùy chấp thuận của ngân hàng & UBND).'}
              </div>
              <div className="divide-y divide-line rounded-[4px] border border-lineStrong bg-canvas">
                {hotspotCommunes.map((h) => {
                  const signed = !!ubndSigned[h.gid_3];
                  return (
                    <div
                      key={h.gid_3}
                      className="flex items-center justify-between gap-2.5 px-3 py-2.5 transition-colors hover:bg-panelAlt"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCommune(h.gid_3)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-[12.5px] font-medium text-ink">
                          {isEn ? h.name : `Xã ${h.name}`}{' '}
                          <span className="text-inkDim">({h.province})</span>
                        </div>
                        <div className="font-mono text-[11px] text-inkMuted">
                          {isEn ? 'Flood' : 'Ngập'} {h.unosat_flood_pct?.toFixed(1)}% &middot;{' '}
                          {h.sim_loans} {isEn ? 'loans' : 'khoản vay'}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectCommune(h.gid_3)}
                        className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-[11.5px] font-semibold transition-colors ${
                          signed
                            ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                            : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                        }`}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.85} />
                        <span>
                          {signed
                            ? isEn
                              ? 'Signed'
                              : 'Đã ký chung'
                            : isEn
                            ? 'Open Brief'
                            : 'Mở biên bản'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {activeTab === 'exceptions' && (
          c ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCommune(null)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-lineStrong bg-transparent px-3 text-[12px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span>
                    {isEn ? 'Back to exception queue' : 'Quay lại danh sách ngoại lệ'}
                  </span>
                </button>
                <span className="truncate font-mono text-[11px] text-inkDim">
                  {isEn ? `${c.name} Commune` : `Xã ${c.name}`}
                </span>
              </div>

              {selectedAi && (
                <div className="rounded-[4px] border border-lineStrong bg-canvas p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-ink">
                      {isEn ? 'Priority Score' : 'Điểm ưu tiên duyệt'} &middot;{' '}
                      <span className="font-mono text-ink">{selectedAi.score}/100</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeTab('ai')}
                      className="rounded-[4px] border border-lineStrong px-2 py-0.5 text-[10.5px] font-medium text-inkMuted hover:border-inkDim hover:text-ink"
                    >
                      {isEn ? 'Draft memo' : 'Nhờ AI viết tờ trình'}
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
                    <span
                      className={`rounded-[3px] border px-1.5 py-0.5 ${
                        c.s2_ml_confirm === true
                          ? 'border-[#98c127]/50 bg-[#98c127]/10 text-[#CDECD7]'
                          : 'border-lineStrong bg-panelAlt text-inkMuted'
                      }`}
                    >
                      {c.s2_ml_prob != null
                        ? isEn
                          ? `Stage-2 ML: ${(c.s2_ml_prob * 100).toFixed(1)}% CV (${
                              c.s2_ml_confirm ? 'Confirm' : 'Low'
                            })`
                          : `ML Tầng 2: ${(c.s2_ml_prob * 100).toFixed(1)}% CV (${
                              c.s2_ml_confirm ? 'Xác nhận' : 'Dưới ngưỡng'
                            })`
                        : isEn
                        ? 'Stage-2 ML: Unknown (Outside CV)'
                        : 'ML Tầng 2: Ngoài vùng CV'}
                    </span>
                    <span className="rounded-[3px] border border-lineStrong bg-panelAlt px-1.5 py-0.5 text-inkMuted">
                      HAND ≤10m: {(c.hand_le10_pct ?? c.r2_hand_le10_pct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-inkMuted">
                    {isEn ? selectedAi.summaryEn : selectedAi.summaryVi}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-snug text-inkDim">
                    {isEn
                      ? '0–100 score orders manual triage; Stage-2 ML is post-event S1+HAND CV (never Day-1 early-alert precision).'
                      : 'Điểm 0–100 sắp thứ tự rà soát; xác suất ML Tầng 2 là hậu kiểm sau bão (08–21/09), tách khỏi cảnh báo sớm Tầng 1.'}
                  </p>
                  <div className="mt-2 grid grid-cols-4 divide-x divide-line rounded-[4px] border border-lineStrong bg-panelAlt">
                    {selectedAi.factors.map((f) => {
                      const shortName =
                        f.key === 'flood'
                          ? isEn
                            ? 'Flood'
                            : 'Ngập'
                          : f.key === 'rain'
                          ? isEn
                            ? 'Rain'
                            : 'Mưa'
                          : f.key === 'wind'
                          ? isEn
                            ? 'Wind'
                            : 'Gió'
                          : isEn
                          ? 'Province'
                          : 'Tỉnh/Vay';
                      return (
                        <div key={f.key} className="px-2 py-1.5 text-center">
                          <div className="text-[10px] text-inkDim">{shortName}</div>
                          <div className="font-mono text-[11px] font-semibold text-ink tabular-nums">
                            {f.points}/{f.maxPoints}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-[4px] border border-lineStrong bg-canvas p-4">
                <div className="border-b border-line pb-2.5 text-center text-[12px] font-semibold tracking-wide text-ink">
                  {isEn
                    ? 'EXCEPTION REVIEW & PAPER DOSSIER'
                    : 'PHIẾU DUYỆT NGOẠI LỆ & MỞ HỒ SƠ GIẤY'}
                </div>

                <div className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'Administrative unit' : 'Đơn vị hành chính'}
                    </span>
                    <span className="text-right font-medium text-ink">
                      {isEn ? `${c.name} Commune` : `Xã ${c.name}`}, {c.district}, {c.province}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'Exception basis' : 'Cơ sở xét ngoại lệ'}
                    </span>
                    <span className="text-right font-mono text-ink">
                      {c.unosat_status !== 'CLASSIFIABLE'
                        ? isEn
                          ? 'Outside RRD UNOSAT footprint'
                          : 'Ngoài vùng chụp UNOSAT ĐBSH'
                        : c.unosat_label === 1 && !c.r1
                        ? isEn
                          ? `Flood ${c.unosat_flood_pct?.toFixed(1)}% · R1=${c.rain_mm}mm (<200)`
                          : `Ngập ${c.unosat_flood_pct?.toFixed(1)}% · R1=${c.rain_mm}mm (<200)`
                        : isEn
                        ? 'Supplementary counter paper intake'
                        : 'Tiếp nhận đơn giấy bổ sung tại quầy'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">
                      {isEn ? 'Rainfall / Satellite' : 'Dữ liệu mưa / vệ tinh'}
                    </span>
                    <span className="font-mono text-ink">
                      {isEn ? 'Rain' : 'Mưa'} {c.rain_mm}mm &middot;{' '}
                      {c.unosat_flood_pct !== null
                        ? `UNOSAT ${c.unosat_flood_pct.toFixed(1)}%`
                        : isEn
                        ? 'S1 / Field'
                        : 'S1 / Thực địa'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-inkDim">
                      {isEn ? 'Loans under officer review' : 'Hồ sơ vay thuộc diện rà soát'}
                    </span>
                    <span className="font-mono text-ink">
                      {formatNum(c.sim_loans, lang)} {isEn ? 'loans' : 'khoản'} &middot;{' '}
                      {formatVndBillions(c.sim_debt_m_vnd, lang)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[11.5px] text-inkDim">
                    {isEn
                      ? 'Authorizes branch counter paper intake (10-day window).'
                      : 'Mở nộp đơn giấy tại quầy (cửa sổ 10 ngày · TT 29/2025).'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onResolveException(c.gid_3)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[12px] font-semibold transition-colors ${
                      isExResolved
                        ? 'bg-[#8ACBB5] text-[#0E1F1A]'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {isExResolved
                        ? isEn
                          ? 'Approved & dossier opened'
                          : 'Đã duyệt & mở hồ sơ giấy'
                        : isEn
                        ? 'Approve & Open Dossier'
                        : 'Duyệt & Mở hồ sơ giấy'}
                    </span>
                  </button>
                </div>
              </div>

              {isExResolved && (
                <div className="rounded-[4px] border border-line bg-white/[0.04] px-3 py-2 text-[11.5px] text-[#CBD5E1]">
                  {isEn
                    ? `Paper intake opened for ${c.name} — Credit Group 1 preserved (Cir. 29/2025 & Dec. 86/2024).`
                    : `Đã duyệt ngoại lệ & mở hồ sơ giấy cho Xã ${c.name} (giữ Nhóm 1 theo TT 29/2025 & NĐ 86/2024).`}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Full Interactive Score Threshold Filter & Live Portfolio Simulator */}
              <div className="rounded-[4px] border border-lineStrong bg-panelAlt p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-inkDim" />
                    <span className="text-[12.5px]">
                      {isEn
                        ? 'Missed-Flood Filter Threshold'
                        : 'Ngưỡng lọc xã ngập bị sót'}
                    </span>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-ink tabular-nums">
                    {isEn ? `Score ≥ ${aiThreshold}` : `Từ ${aiThreshold} điểm`}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-inkMuted">
                  {isEn
                    ? 'Slide to balance missed floods caught (rain <200mm) vs. review queue (rule score, not calibrated ML; simulated loan proxies):'
                    : 'Kéo để chỉnh danh sách xã ngập sót (mưa <200mm) & lượng rà (điểm rule chưa hiệu chuẩn ML; số hộ & dự phòng là mô phỏng):'}
                </p>

                <div className="mt-2">
                  <input
                    type="range"
                    min={45}
                    max={85}
                    step={5}
                    value={aiThreshold}
                    onChange={(e) => onChangeAiThreshold(Number(e.target.value))}
                    aria-label={
                      isEn
                        ? 'Filter exception queue by priority score'
                        : 'Ngưỡng điểm ưu tiên lọc danh sách ngoại lệ'
                    }
                    className="timeline-slider w-full"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-inkDim">
                    <span>45 · {isEn ? 'Broad' : 'Vớt rộng'}</span>
                    <span>65 · {isEn ? 'Balanced' : 'Cân bằng'}</span>
                    <span>85 · {isEn ? 'Strict' : 'Chặt'}</span>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-3 divide-x divide-line rounded-[4px] border border-lineStrong bg-canvas">
                  <div className="px-2.5 py-2">
                    <div className="text-[10.5px] text-inkDim">
                      {isEn ? 'Floods Caught' : 'Bắt đúng ngập'}
                    </div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold text-ink tabular-nums">
                      {formatPct(whatIf.aiRecallPct, lang, 1)}
                    </div>
                    <div className="font-mono text-[10.5px] text-[#8ACBB5]">
                      +{formatPct(whatIf.recallLiftPct, lang, 1)}
                    </div>
                  </div>

                  <div className="px-2.5 py-2">
                    <div className="text-[10.5px] text-inkDim">
                      {isEn ? 'Kept Group 1' : 'Hộ giữ N1'}
                    </div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold text-ink tabular-nums">
                      +{formatNum(whatIf.extraLoansRescued, lang)}
                    </div>
                    <div className="font-mono text-[10.5px] text-inkMuted">
                      {isEn ? 'loans' : 'khoản cứu'}
                    </div>
                  </div>

                  <div className="px-2.5 py-2">
                    <div className="text-[10.5px] text-inkDim">
                      {isEn ? 'Prov. Saved' : 'Giảm dự phòng'}
                    </div>
                    <div className="mt-0.5 font-mono text-[13px] font-semibold text-ink tabular-nums">
                      {formatVndBillions(whatIf.extraProvisionAvoidedM, lang)}
                    </div>
                    <div className="font-mono text-[10.5px] text-inkMuted">
                      {isEn ? '5% Dec 86' : 'NĐ 86 (5%)'}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-inkDim tabular-nums">
                  <span>
                    {isEn
                      ? `+${whatIf.aiExtraFloodedCaught} flood · +${whatIf.outsideBlindSpotFlagged} outer · ${whatIf.reviewQueueAdded} review`
                      : `+${whatIf.aiExtraFloodedCaught} ngập · +${whatIf.outsideBlindSpotFlagged} ngoài ảnh · rà ${whatIf.reviewQueueAdded} xã`}
                  </span>
                  <span className="font-semibold text-ink">
                    {formatNum(exceptionMatchingCount, lang)}{' '}
                    {isEn ? 'communes in view' : 'xã đang lọc'}
                  </span>
                </div>

                {/* Quick Triage Filter Bar: Heuristic Score vs Stage-2 ML Pools vs Outside UNOSAT */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                  {(
                    [
                      {
                        id: 'all',
                        vi: `Tất cả (${exceptionSummary.totalMatching})`,
                        en: `All (${exceptionSummary.totalMatching})`,
                      },
                      {
                        id: 'watchlist_ml',
                        vi: `Watchlist R3·ML (${mlPoolBuckets.watchlistMl.length})`,
                        en: `Watchlist R3·ML (${mlPoolBuckets.watchlistMl.length})`,
                      },
                      {
                        id: 'unflagged_ml',
                        vi: `Ngoài R1|R2|R3·ML (${mlPoolBuckets.unflaggedMl.length})`,
                        en: `Unflagged·ML (${mlPoolBuckets.unflaggedMl.length})`,
                      },
                      {
                        id: 'outside_scan',
                        vi: `Ngoài UNOSAT (${mlPoolBuckets.outsideScan.length})`,
                        en: `Out of Scan (${mlPoolBuckets.outsideScan.length})`,
                      },
                    ] as const
                  ).map((pill) => {
                    const active = exQueueFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setExQueueFilter(pill.id)}
                        className={`rounded-[3px] border px-2 py-1 text-[10.5px] font-medium transition-colors ${
                          active
                            ? 'border-[#98c127]/60 bg-[#98c127]/15 text-[#CDECD7]'
                            : 'border-lineStrong bg-canvas text-inkMuted hover:border-inkDim hover:text-ink'
                        }`}
                      >
                        {isEn ? pill.en : pill.vi}
                      </button>
                    );
                  })}
                </div>
              </div>

              {exceptionQueue.length === 0 ? (
                <div className="rounded-[4px] border border-lineStrong bg-canvas p-4 text-center text-[12px] text-inkMuted">
                  <p>
                    {isEn
                      ? `No missed flooded communes score ≥ ${aiThreshold}/100 (highest is 84).`
                      : `Không có xã ngập bị sót nào đạt từ ${aiThreshold}/100 điểm trở lên (cao nhất hiện tại là 84 điểm).`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setExQueueFilter('all');
                      onChangeAiThreshold(55);
                    }}
                    className="mt-2.5 inline-flex h-7 items-center rounded-[4px] bg-[#CDECD7] px-3 text-[11.5px] font-semibold text-[#0E1F1A] hover:bg-[#D8F1E0]"
                  >
                    {isEn ? 'Reset to ≥ 55' : 'Đặt ngưỡng về 55 điểm'}
                  </button>
                </div>
              ) : (
              <div className="divide-y divide-line rounded-[4px] border border-lineStrong bg-canvas">
                {exceptionQueue.map(({ commune: ex, ai }) => {
                  const done = !!exceptionsResolved[ex.gid_3];
                  const rainInt = Math.round(ex.rain_mm);
                  const mlTag =
                    ex.s2_ml_prob != null
                      ? ` · ML ${(ex.s2_ml_prob * 100).toFixed(0)}%`
                      : ' · CV null';
                  const handTag =
                    (ex.hand_le10_pct ?? ex.r2_hand_le10_pct) != null
                      ? ` · H${(ex.hand_le10_pct ?? ex.r2_hand_le10_pct ?? 0).toFixed(0)}%`
                      : '';
                  const reason =
                    ex.unosat_status !== 'CLASSIFIABLE'
                      ? isEn
                        ? `Out of scan · Rain ${rainInt}mm${mlTag}${handTag}`
                        : `Ngoài UNOSAT · Mưa ${rainInt}mm${mlTag}${handTag}`
                      : ex.unosat_flood_pct != null
                      ? isEn
                        ? `Flood ${ex.unosat_flood_pct.toFixed(1)}% · Rain ${rainInt}mm${mlTag}`
                        : `Ngập ${ex.unosat_flood_pct.toFixed(1)}% · Mưa ${rainInt}mm${mlTag}`
                      : `Rain ${rainInt}mm${mlTag}${handTag}`;
                  return (
                    <div
                      key={ex.gid_3}
                      className="flex items-center justify-between gap-2.5 px-3 py-2.5 transition-colors hover:bg-panelAlt"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCommune(ex.gid_3)}
                        title={
                          isEn
                            ? `Priority score ${ai.score}/100 (flood severity, rain, wind, exposure)`
                            : `Điểm ưu tiên ${ai.score}/100 (độ ngập, mưa cận ngưỡng, gió, hộ vay)`
                        }
                        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                      >
                        <span
                          className={`w-5 shrink-0 pt-0.5 text-right font-mono text-[12px] font-semibold tabular-nums ${
                            ai.score >= 70 ? 'text-[#8ACBB5]' : 'text-inkMuted'
                          }`}
                        >
                          {ai.score}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px]">
                            <span className="font-medium text-ink">{ex.name}</span>{' '}
                            <span className="text-inkDim">&middot; {ex.province}</span>
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-inkMuted tabular-nums">
                            {reason} &middot; {isEn ? 'Prov' : 'DP'}{' '}
                            {formatVndBillions(ai.provisionAtRiskM, lang)}
                          </div>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectCommune(ex.gid_3)}
                          className="inline-flex h-7 items-center rounded-[4px] border border-lineStrong bg-transparent px-2 text-[11.5px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:text-ink"
                        >
                          {isEn ? 'Brief' : 'Hồ sơ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolveException(ex.gid_3)}
                          className={`h-7 rounded-[4px] px-2.5 text-[11.5px] font-semibold transition-colors ${
                            done
                              ? 'border border-lineStrong bg-panelAlt text-[#8ACBB5]'
                              : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                          }`}
                        >
                          {done
                            ? isEn
                              ? '✓ Approved'
                              : '✓ Đã duyệt'
                            : isEn
                            ? 'Approve'
                            : 'Duyệt'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )
        )}

        {activeTab === 'stations' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-[4px] border border-lineStrong bg-canvas p-2.5 text-[11.5px] text-inkMuted">
              <Waves className="mt-0.5 h-4 w-4 shrink-0 text-inkMuted" strokeWidth={1.75} />
              <div>
                <b className="font-medium text-ink">
                  {isEn ? '11 Gauges -> 2,895-Commune R2 Crosswalk:' : '11 trạm thủy văn -> Khớp R2 toàn 2.895 xã:'}
                </b>{' '}
                {isEn
                  ? '5 AL3 stations map 215 R2=1 communes (0 unresolved confluences); 109 Hanoi communes map < AL3 (11.30m vs 11.50m). Yên Bái earliest-BĐ3 minute is bounded 08/09 19:00–21:47*.'
                  : '5 trạm vượt BĐ3 nối 215 xã R2=1 (0 giao cắt trùng chưa xử lý); 109 xã Hà Nội dưới BĐ3 (11,30m < 11,50m). Mốc phút BĐ3 sớm nhất Yên Bái trong khoảng 08/09 19:00–21:47*.'}
              </div>
            </div>

            <div className="overflow-x-auto rounded-[6px] border border-lineStrong bg-canvas">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="border-b border-line text-inkDim">
                  <tr>
                    <th className="px-2.5 py-2 font-medium">
                      {isEn ? 'Station / River' : 'Trạm / Sông'}
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      {isEn ? 'Peak (m)' : 'Đỉnh (m)'}
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      {isEn ? 'AL3' : 'BĐ3'}
                    </th>
                    <th className="px-2.5 py-2 text-right font-medium">
                      {isEn ? 'BĐ3 Status' : 'Mốc BĐ3'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stations.map((s) => {
                    const activeAtDate = isStationActiveAtDate(s, dateStr);
                    const bulletinLabel = s.first_bd3_bulletin_ict
                      ? s.first_bd3_bulletin_ict.slice(5, 16)
                      : s.bulletin_evidence_status ===
                          'ABOVE_CONFIRMED_EARLIEST_BULLETIN_BOUNDED_1900_2147_08SEP'
                        ? '09-08 19–21:47*'
                        : s.peak_time_ict.slice(5, 16);
                    return (
                      <tr
                        key={s.station}
                        className={activeAtDate ? 'bg-white/[0.03]' : ''}
                      >
                        <td className="px-2.5 py-1.5">
                          <div className="font-medium text-ink">{s.station}</div>
                          <div className="text-[11px] text-inkDim">
                            {isEn ? 'River' : 'Sông'} {s.river} · {s.province}
                            {s.mapped_communes
                              ? ` · ${s.mapped_communes} ${isEn ? 'comm.' : 'xã'}`
                              : ''}
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-ink tabular-nums">
                          {s.peak_m.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-inkMuted tabular-nums">
                          {s.bd3_m.toFixed(1)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[11px]">
                          {s.r2_triggered === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[#ffcd8e]/85">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: SIGNAL_COLORS.r1Light }}
                              />
                              <span>{isEn ? 'AL2 (< AL3)' : 'BĐ2 (dưới BĐ3)'}</span>
                            </span>
                          ) : activeAtDate ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#ff8ca1]">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: SIGNAL_COLORS.r2Alert }}
                              />
                              <span>
                                &gt;{isEn ? 'AL3' : 'BĐ3'} · {bulletinLabel}
                              </span>
                            </span>
                          ) : (
                            <span className="text-inkDim">
                              {isEn ? 'Pending' : 'Chờ'} {bulletinLabel.slice(3, 5)}/
                              {bulletinLabel.slice(0, 2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-4">
            {/* Open API JSON */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink">
                  {isEn
                    ? 'Open API Payload (Cir. 64/2024 · Dec. 346/2026 Parametric)'
                    : 'Open API Payload (TT 64/2024 · NĐ 346/2026 Bảo hiểm chỉ số)'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-line bg-transparent px-2 text-[11px] text-inkMuted hover:border-lineStrong hover:text-ink"
                >
                  <Copy className="h-3 w-3" strokeWidth={1.75} />
                  <span>
                    {copiedJson
                      ? isEn
                        ? 'Copied'
                        : 'Đã chép'
                      : isEn
                      ? 'Copy'
                      : 'Sao chép'}
                  </span>
                </button>
              </div>
              <pre className="max-h-[210px] overflow-auto rounded-[6px] border border-lineStrong bg-canvas p-2.5 font-mono text-[11px] leading-relaxed text-[#CBD5E1]">
                {JSON.stringify(apiPayload, null, 2)}
              </pre>
            </div>

            {/* 12-Province Live NHNN Quarterly Table computed from 2,895 JSON */}
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-ink">
                {isEn
                  ? '12-Province SBV Summary (computed live from 2,895 communes)'
                  : 'Tổng hợp báo cáo 12 tỉnh gửi NHNN (tính trực tiếp từ 2.895 xã)'}
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-[6px] border border-lineStrong bg-canvas">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead className="sticky top-0 bg-panel text-inkDim">
                    <tr>
                      <th className="border-b border-line px-2.5 py-1.5 font-medium">
                        {isEn ? 'Province' : 'Tỉnh'}
                      </th>
                      <th className="border-b border-line px-2 py-1.5 text-right font-medium">
                        {isEn ? 'Communes' : 'Số xã'}
                      </th>
                      <th className="border-b border-line px-2 py-1.5 text-right font-medium">
                        {isEn ? 'R1 Rain' : 'R1 mưa'}
                      </th>
                      <th className="border-b border-line px-2.5 py-1.5 text-right font-medium">
                        UNOSAT &ge;5%
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono tabular-nums text-inkMuted">
                    {provinceStats.map((row) => (
                      <tr key={row.province}>
                        <td className="px-2.5 py-1.5 font-sans text-ink">{row.province}</td>
                        <td className="px-2 py-1.5 text-right">{row.communes}</td>
                        <td className="px-2 py-1.5 text-right">{row.r1Count}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-inkMuted">
                          {row.unosatFlooded}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function SignalRow({
  label,
  value,
  status,
  dotColor,
  mutedStatus = false,
}: {
  label: string;
  value: string;
  status: string;
  dotColor?: string;
  mutedStatus?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="inline-flex items-center gap-2 text-inkDim">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor ?? '#3E4A5F' }}
        />
        <span>{label}</span>
      </span>
      <div className="flex items-center gap-2 font-mono text-[11.5px] tabular-nums">
        <span className="font-medium text-ink">{value}</span>
        <span className="text-white/[0.12]">|</span>
        <span
          style={dotColor && !mutedStatus ? { color: dotColor } : undefined}
          className={dotColor && !mutedStatus ? 'font-medium' : 'text-inkMuted'}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

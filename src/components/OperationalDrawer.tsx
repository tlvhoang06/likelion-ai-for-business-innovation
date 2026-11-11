import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, FileCheck2, ShieldAlert, Waves } from 'lucide-react';
import type {
  CommuneYagiStatus,
  DrawerTab,
  LayerToggles,
  RiverStationR2,
} from '../types/yagi';
import {
  computeProvinceStats,
  evaluateCommuneAtDate,
  formatNum,
  formatVndBillions,
  isStationActiveAtDate,
} from '../utils/yagiLogic';

interface OperationalDrawerProps {
  communes: CommuneYagiStatus[];
  stations: RiverStationR2[];
  selectedCommune: CommuneYagiStatus | null;
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
  activeTab: DrawerTab;
  campaignLaunched: boolean;
  borrowerConfirmed: Record<string, boolean>;
  ubndSigned: Record<string, boolean>;
  exceptionsResolved: Record<string, boolean>;
  onChangeTab: (tab: DrawerTab) => void;
  onSelectCommune: (gid: string | null) => void;
  onJumpToFloodPeak: () => void;
  onLaunchCampaign: () => void;
  onConfirmBorrower: (gid: string) => void;
  onSignUbnd: (gid: string) => void;
  onResolveException: (gid: string) => void;
}

const DRAWER_TABS: Array<{ id: DrawerTab; label: string }> = [
  { id: 'bank', label: 'Giãn nợ nhanh' },
  { id: 'ubnd', label: 'UBND Xã' },
  { id: 'exceptions', label: 'Duyệt ngoại lệ' },
  { id: 'stations', label: 'Mực nước lũ' },
  { id: 'api', label: 'Báo cáo & API' },
];

export function OperationalDrawer({
  communes,
  stations,
  selectedCommune: c,
  dateStr,
  layers,
  stats,
  activeTab,
  campaignLaunched,
  borrowerConfirmed,
  ubndSigned,
  exceptionsResolved,
  onChangeTab,
  onSelectCommune,
  onJumpToFloodPeak,
  onLaunchCampaign,
  onConfirmBorrower,
  onSignUbnd,
  onResolveException,
}: OperationalDrawerProps) {
  const [copiedJson, setCopiedJson] = useState(false);

  const signalEval = c ? evaluateCommuneAtDate(c, dateStr, layers) : null;
  const isConfirmed = c ? !!(borrowerConfirmed[c.gid_3] || campaignLaunched) : campaignLaunched;
  const isUbndSigned = c ? !!ubndSigned[c.gid_3] : false;
  const isExResolved = c ? !!exceptionsResolved[c.gid_3] : false;

  const hotspotCommunes = useMemo(
    () =>
      communes
        .filter((x) => x.unosat_label === 1)
        .sort((a, b) => (b.unosat_flood_pct ?? 0) - (a.unosat_flood_pct ?? 0))
        .slice(0, 6),
    [communes]
  );

  // Authentic W3 exception queue computed dynamically from 2,895 communes
  const exceptionList = useMemo(() => {
    const missR1 = communes
      .filter((x) => x.unosat_label === 1 && !x.r1)
      .sort((a, b) => (b.unosat_flood_pct ?? 0) - (a.unosat_flood_pct ?? 0))
      .slice(0, 6);
    const outside = communes
      .filter((x) => x.unosat_status !== 'CLASSIFIABLE' && (x.r1 || x.r3_r50))
      .slice(0, 3);
    return [...missR1, ...outside];
  }, [communes]);

  const provinceStats = useMemo(() => computeProvinceStats(communes), [communes]);

  const apiPayload = useMemo(() => {
    if (!c || !signalEval) {
      return {
        standard: 'TT_64_2024_TT_NHNN_OpenAPI_OAuth2',
        audit_retention_years: 5,
        payout_sla_business_days: 15,
        applicable_decrees: ['ND_346_2026', 'TT_29_2025_TT_NHNN', 'ND_86_2024'],
        scope: 'REGIONAL_OVERVIEW_12_PROVINCES',
        total_communes: communes.length,
        observed_date: dateStr,
        triggered_communes: stats.triggeredCount,
        r1_triggered_communes: stats.r1Count,
        r3_triggered_communes: stats.r3Count,
        r2_river_stations_bd3: stations.filter((s) => isStationActiveAtDate(s, dateStr)).length,
        simulated_portfolio_loans: stats.triggeredLoans,
        campaign_1tap_dispatched: campaignLaunched,
      };
    }

    return {
      standard: 'TT_64_2024_TT_NHNN_OpenAPI_OAuth2',
      audit_retention_years: 5,
      payout_sla_business_days: 15,
      applicable_decrees: ['ND_346_2026', 'TT_29_2025_TT_NHNN', 'ND_86_2024'],
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
          status: 'STATION_LEVEL_ONLY_PENDING_GID3_CROSSWALK',
          b5_stations_above_bd3: stations.filter((s) => isStationActiveAtDate(s, dateStr))
            .length,
        },
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
      },
      borrower_consent_1tap: isConfirmed,
      ubnd_batch_attestation: isUbndSigned,
    };
  }, [
    c,
    signalEval,
    communes.length,
    dateStr,
    stats.triggeredCount,
    stats.r1Count,
    stats.r3Count,
    stats.triggeredLoans,
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

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-lineStrong bg-panel lg:w-[460px] lg:border-l lg:border-t-0 xl:w-[480px]">
      {/* Selected Commune OR Regional Overview Header */}
      {c && signalEval ? (
        <div className="border-b border-lineStrong px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-ink">
                Xã {c.name}
              </h2>
              <div className="mt-0.5 truncate text-[12px] text-inkMuted">
                {c.district}, {c.province} &middot;{' '}
                <span className="font-mono text-inkDim">{c.gid_3}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onJumpToFloodPeak}
                className={`inline-flex h-7 items-center rounded-[5px] px-2.5 text-[11.5px] font-semibold transition-colors ${
                  isFloodPeak
                    ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                    : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                }`}
              >
                Đỉnh lũ 12/09
              </button>
              <button
                type="button"
                onClick={() => onSelectCommune(null)}
                title="Quay lại danh sách tổng quan toàn vùng (Esc)"
                className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[#8ACBB5]/80 bg-transparent px-2 text-[11.5px] font-medium text-[#CDECD7] transition-colors hover:bg-[#8ACBB5]/15 hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={2} />
                <span>Danh sách</span>
              </button>
            </div>
          </div>

          {/* Compact 4-signal verification matrix */}
          <div className="mt-3 divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas text-[12.5px]">
            <SignalRow
              label="R1 Mưa 24h (Đ.44 QĐ 18)"
              value={`${c.rain_mm} mm`}
              status={signalEval.r1On ? 'Chạm ngưỡng' : c.r1 ? 'Chưa đến ngày' : 'Dưới 200mm'}
              tone={signalEval.r1On ? 'alert' : 'neutral'}
            />
            <SignalRow
              label={`R3 Gió bão (${layers.useR64 ? 'R64' : 'R50'})`}
              value={signalEval.r3On ? 'Trong vùng gió' : 'Không'}
              status={c.r3_time ? c.r3_time.slice(0, 10) : '—'}
              tone={signalEval.r3On ? 'warn' : 'neutral'}
            />
            <SignalRow
              label="Mực nước sông (QĐ 05)"
              value="11 trạm thủy văn"
              status="Chờ nối GID_3 xã"
              tone="neutral"
            />
            <SignalRow
              label="UNOSAT 3966 / Sentinel-1"
              value={
                c.unosat_flood_pct !== null
                  ? `${c.unosat_flood_pct.toFixed(1)}% ngập`
                  : 'Ngoài vùng ĐBSH'
              }
              status={
                c.unosat_label === 1
                  ? 'Ngập >= 5%'
                  : c.unosat_flood_pct !== null
                  ? 'Dưới 5%'
                  : 'Dùng S1 / Thực địa'
              }
              tone={c.unosat_label === 1 ? 'info' : 'neutral'}
            />
          </div>
        </div>
      ) : (
        <div className="border-b border-lineStrong px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-[15px] font-semibold text-ink">
              Tổng quan Toàn vùng — 12 tỉnh Bắc Bộ
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
              Đỉnh lũ 12/09
            </button>
          </div>
          <div className="mt-1 text-[12px] text-inkMuted">
            2.895 xã GADM v4.1 &middot; Bấm xã trên bản đồ hoặc dải đối chứng để xem chi tiết
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">Xã chạm ngưỡng R1/R3</div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatNum(stats.triggeredCount)}{' '}
                <span className="text-[12px] font-normal text-inkDim">/ 2.895</span>
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">Dư nợ vùng rủi ro (giả lập)</div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatVndBillions(stats.triggeredDebtM)}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">Dự phòng 5% NĐ 86 nguy cơ</div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatVndBillions(stats.triggeredDebtM * 0.05)}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2">
              <div className="text-[11px] text-inkDim">Hòa vốn mô hình 1/725</div>
              <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                {formatNum(stats.savedLoans)} khoản giữ N1
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Segmented Underline Tab Bar */}
      <nav
        aria-label="Nghiệp vụ chi tiết"
        className="flex overflow-x-auto border-b border-lineStrong bg-canvas px-1.5"
      >
        {DRAWER_TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative shrink-0 whitespace-nowrap px-2.5 py-2.5 text-center text-[12px] font-medium transition-colors sm:flex-1 sm:px-1.5 ${
                active
                  ? 'text-ink'
                  : 'text-inkDim hover:text-inkMuted'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-ink" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Tab Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeTab === 'bank' && (
          c ? (
            <div className="space-y-3.5">
              {/* Simulated Portfolio Box */}
              <div className="flex items-center justify-between rounded-[6px] border border-lineStrong bg-canvas px-3.5 py-2.5">
                <div>
                  <div className="text-[11.5px] text-inkDim">
                    Danh mục nông thôn gắn mã xã (giả lập 290tr/khoản)
                  </div>
                  <div className="mt-0.5 font-mono text-[15px] font-semibold text-ink tabular-nums">
                    {c.sim_loans} khoản &middot; {formatVndBillions(c.sim_debt_m_vnd)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-inkDim">Dự phòng 5% tránh được</div>
                  <div className="font-mono text-[13px] font-semibold text-ink tabular-nums">
                    {formatVndBillions(c.sim_debt_m_vnd * 0.05)}
                  </div>
                </div>
              </div>

              {/* Borrower App/SMS Notification Preview */}
              <div className="rounded-[6px] border border-lineStrong bg-panelAlt p-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2 text-[11.5px] text-inkDim">
                  <span>SMS / App Ngân hàng gửi Hộ vay</span>
                  <span className="font-mono text-inkMuted">Khoản 1 Đ.3 TT 29/2025</span>
                </div>

                <p className="mt-2.5 text-[13px] leading-relaxed text-ink">
                  Địa bàn <b>Xã {c.name}</b> ({c.province}) ghi nhận tín hiệu thiên tai Bão Yagi (mưa {c.rain_mm}mm
                  {c.r3_r50 ? ', gió R50' : ''}). Quý khách đủ điều kiện đề nghị{' '}
                  <b>giãn nợ 3–6 tháng và giữ nguyên Nhóm nợ 1</b> trong cửa sổ 10 ngày quá hạn.
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
                        ? 'Đã ghi nhận đề nghị giãn nợ (Nhóm 1)'
                        : 'Xác nhận giãn nợ nhanh'}
                    </span>
                  </button>
                </div>

                {isConfirmed && (
                  <div className="mt-2.5 rounded-[5px] border border-line bg-canvas/60 px-3 py-2 text-[11.5px] text-[#CBD5E1]">
                    Đã lưu xác nhận điện tử của khách hàng. Khoản vay tại {c.name} giữ nguyên Nhóm 1, miễn trích lập 5% dự phòng Nhóm 2 theo NĐ 86/2024.
                  </div>
                )}
              </div>

              <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2.5 text-[12px] text-inkMuted">
                <b className="font-medium text-ink">Lưới an toàn đa kênh:</b> Hộ vay không dùng smartphone hoặc mất điện/sóng di động vẫn được tiếp nhận đơn giấy trực tiếp tại quầy giao dịch trong thời hạn 10 ngày.
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="rounded-[6px] border border-lineStrong bg-panelAlt p-3.5">
                <div className="flex items-center justify-between border-b border-line pb-2 text-[11.5px] text-inkDim">
                  <span>Chiến dịch Giãn nợ Toàn vùng (TT 29/2025)</span>
                  <span className="font-mono text-inkMuted">Hòa vốn 1 / 725 khoản</span>
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-inkMuted">
                  Tại ngày <b className="text-ink">{dateStr.split('-').reverse().join('/')}</b>, hệ thống ghi nhận{' '}
                  <b className="text-ink">{formatNum(stats.triggeredCount)} xã</b> chạm ngưỡng với{' '}
                  <b className="text-ink">{formatNum(stats.triggeredLoans)} khoản vay giả lập</b> (~{formatVndBillions(stats.triggeredDebtM)}). Phát đề xuất hàng loạt giúp thu thập đề nghị của khách hàng trong cửa sổ 10 ngày quá hạn.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onLaunchCampaign}
                    disabled={campaignLaunched}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3.5 text-[12.5px] font-semibold transition-colors ${
                      campaignLaunched
                        ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {campaignLaunched
                        ? `Đã giữ Nhóm 1 cho ${formatNum(stats.savedLoans)} khoản`
                        : 'Gửi đề xuất giãn nợ toàn vùng'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-medium text-ink">
                  Các xã trọng điểm ngập cao (bấm để xem chi tiết)
                </div>
                <div className="divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas">
                  {hotspotCommunes.map((h) => (
                    <button
                      key={h.gid_3}
                      type="button"
                      onClick={() => onSelectCommune(h.gid_3)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-panelAlt"
                    >
                      <div>
                        <span className="font-medium text-ink">{h.name}</span>{' '}
                        <span className="text-[11.5px] text-inkDim">
                          ({h.district}, {h.province})
                        </span>
                      </div>
                      <span className="font-mono text-[11.5px] text-inkMuted tabular-nums">
                        {h.unosat_flood_pct?.toFixed(1)}% &middot; {h.sim_loans} khoản
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[#8ACBB5] bg-[#161C26] px-3 text-[12px] font-medium text-[#CDECD7] transition-colors hover:border-[#CDECD7] hover:bg-[#8ACBB5]/15 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span>Quay lại danh sách xã</span>
                </button>
                <span className="truncate font-mono text-[11px] text-inkDim">
                  Xã {c.name}
                </span>
              </div>

              <div className="rounded-[6px] border border-lineStrong bg-canvas p-4">
                <div className="border-b border-line pb-2.5 text-center text-[12px] font-semibold tracking-wide text-ink">
                  BIÊN BẢN XÁC NHẬN THIỆT HẠI VIỄN THÁM CẤP XÃ
                </div>

                <div className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Đơn vị hành chính</span>
                    <span className="text-right font-medium text-ink">
                      Xã {c.name}, {c.district}, {c.province}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Mã GADM v4.1</span>
                    <span className="font-mono text-ink">{c.gid_3}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Chỉ số khí tượng R1 / R3</span>
                    <span className="font-mono text-ink">
                      {c.rain_mm}mm · R50: {c.r3_r50 ? 'Có' : 'Không'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Ảnh ngập UNOSAT 3966</span>
                    <span className="font-mono text-ink">
                      {c.unosat_flood_pct !== null
                        ? `${c.unosat_flood_ha.toFixed(1)} ha (${c.unosat_flood_pct.toFixed(2)}%)`
                        : 'Ngoài vùng quét ĐBSH'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-inkDim">Hồ sơ vay nông thôn trong xã</span>
                    <span className="font-mono text-ink">{c.sim_loans} hộ vay</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[11.5px] text-inkDim">
                    Một chữ ký UBND xã dùng chung cho mọi ngân hàng &amp; bảo hiểm.
                  </span>
                  <button
                    type="button"
                    onClick={() => onSignUbnd(c.gid_3)}
                    disabled={isUbndSigned}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-colors ${
                      isUbndSigned
                        ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>
                      {isUbndSigned ? 'UBND Xã đã ký xác nhận chung' : 'Ký xác nhận cho cả xã'}
                    </span>
                  </button>
                </div>
              </div>

              {isUbndSigned && (
                <div className="rounded-[4px] bg-white/[0.04] px-3 py-2 text-[12px] text-[#CBD5E1]">
                  Chứng thư cấp xã cho {c.name} đã có hiệu lực cho toàn bộ {c.sim_loans} hồ sơ vay mà không cần xin giấy xác nhận từng hộ.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[6px] border border-lineStrong bg-canvas p-3 text-[12px] text-inkMuted">
                Ở chế độ tổng quan, chọn 1 xã trong danh sách dưới đây hoặc bấm trực tiếp lên bản đồ để xuất biên bản viễn thám và ký xác nhận UBND xã một lần thay thế biên bản từng hộ.
              </div>
              <div className="divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas">
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
                          Xã {h.name} <span className="text-inkDim">({h.province})</span>
                        </div>
                        <div className="font-mono text-[11px] text-inkMuted">
                          Ngập {h.unosat_flood_pct?.toFixed(1)}% &middot; {h.sim_loans} khoản vay
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectCommune(h.gid_3)}
                        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-semibold transition-colors ${
                          signed
                            ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                            : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                        }`}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" strokeWidth={1.85} />
                        <span>{signed ? 'Đã ký chung' : 'Mở biên bản'}</span>
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[#8ACBB5] bg-[#161C26] px-3 text-[12px] font-medium text-[#CDECD7] transition-colors hover:border-[#CDECD7] hover:bg-[#8ACBB5]/15 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span>Quay lại danh sách ngoại lệ</span>
                </button>
                <span className="truncate font-mono text-[11px] text-inkDim">
                  Xã {c.name}
                </span>
              </div>

              <div className="rounded-[6px] border border-lineStrong bg-canvas p-4">
                <div className="border-b border-line pb-2.5 text-center text-[12px] font-semibold tracking-wide text-ink">
                  PHIẾU DUYỆT NGOẠI LỆ &amp; MỞ HỒ SƠ GIẤY
                </div>

                <div className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Đơn vị hành chính</span>
                    <span className="text-right font-medium text-ink">
                      Xã {c.name}, {c.district}, {c.province}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Cơ sở xét ngoại lệ</span>
                    <span className="text-right font-mono text-ink">
                      {c.unosat_status !== 'CLASSIFIABLE'
                        ? 'Ngoài vùng chụp UNOSAT ĐBSH'
                        : c.unosat_label === 1 && !c.r1
                        ? `Ngập ${c.unosat_flood_pct?.toFixed(1)}% · R1=${c.rain_mm}mm (<200)`
                        : 'Tiếp nhận đơn giấy bổ sung tại quầy'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                    <span className="text-inkDim">Dữ liệu mưa / vệ tinh</span>
                    <span className="font-mono text-ink">
                      Mưa {c.rain_mm}mm &middot;{' '}
                      {c.unosat_flood_pct !== null
                        ? `UNOSAT ${c.unosat_flood_pct.toFixed(1)}%`
                        : 'S1 / Thực địa'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-inkDim">Hồ sơ vay thuộc diện rà soát</span>
                    <span className="font-mono text-ink">
                      {c.sim_loans} khoản &middot; {formatVndBillions(c.sim_debt_m_vnd)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[11.5px] text-inkDim">
                    Cho phép nộp đơn giấy tại quầy trong cửa sổ 10 ngày TT 29/2025.
                  </span>
                  <button
                    type="button"
                    onClick={() => onResolveException(c.gid_3)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-semibold transition-colors ${
                      isExResolved
                        ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                        : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {isExResolved
                        ? 'Đã duyệt & mở hồ sơ giấy'
                        : 'Duyệt & Mở hồ sơ giấy'}
                    </span>
                  </button>
                </div>
              </div>

              {isExResolved && (
                <div className="rounded-[5px] border border-line bg-white/[0.04] px-3 py-2 text-[12px] text-[#CBD5E1]">
                  Đã duyệt ngoại lệ và mở luồng hồ sơ giấy tại quầy cho Xã {c.name}. Toàn bộ chứng từ bổ sung được lưu vết giữ Nhóm nợ 1 theo TT 29/2025 &amp; NĐ 86/2024.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-[6px] border border-lineStrong bg-canvas p-2.5 text-[12px] text-inkMuted">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-inkMuted" strokeWidth={1.75} />
                <div>
                  <b className="font-medium text-ink">Hàng đợi duyệt ngoại lệ (Cán bộ tín dụng):</b>{' '}
                  Xử lý những xã ngập thực tế (UNOSAT &ge;5% nhưng mưa R1 tại chỗ &lt;200mm) hoặc nằm ngoài vùng quét vệ tinh UNOSAT ĐBSH.
                </div>
              </div>

              <div className="divide-y divide-line rounded-[6px] border border-lineStrong bg-canvas">
                {exceptionList.map((ex) => {
                  const done = !!exceptionsResolved[ex.gid_3];
                  const reason =
                    ex.unosat_status !== 'CLASSIFIABLE'
                      ? 'Ngoài vùng UNOSAT ĐBSH'
                      : `Ngập ${ex.unosat_flood_pct?.toFixed(1)}% · R1=${ex.rain_mm}mm (<200)`;
                  return (
                    <div
                      key={ex.gid_3}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-panelAlt"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCommune(ex.gid_3)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-[12.5px] font-medium text-ink">
                          {ex.name} <span className="text-inkDim">({ex.province})</span>
                        </div>
                        <div className="truncate font-mono text-[11px] text-inkMuted">
                          {reason}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectCommune(ex.gid_3)}
                          className="inline-flex h-8 items-center rounded-[6px] border border-[#8ACBB5] bg-[#161C26] px-2.5 text-[12px] font-medium text-[#CDECD7] transition-colors hover:border-[#CDECD7] hover:bg-[#8ACBB5]/15 hover:text-white"
                        >
                          Mở giấy
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolveException(ex.gid_3)}
                          className={`h-8 rounded-[6px] px-2.5 text-[12px] font-semibold transition-colors ${
                            done
                              ? 'bg-[#8ACBB5] text-[#0E1F1A] shadow-sm'
                              : 'bg-[#CDECD7] text-[#0E1F1A] hover:bg-[#D8F1E0]'
                          }`}
                        >
                          {done ? '✓ Đã duyệt' : 'Duyệt'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {activeTab === 'stations' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-[6px] border border-lineStrong bg-canvas p-2.5 text-[12px] text-inkMuted">
              <Waves className="mt-0.5 h-4 w-4 shrink-0 text-inkMuted" strokeWidth={1.75} />
              <div>
                <b className="font-medium text-ink">Mực nước lũ tại 11 trạm thủy văn (QĐ 05/2020/QĐ-TTg):</b>{' '}
                10/11 trạm vượt Báo động 3 từ 10–12/09/2024. Trạm Hà Nội đạt 11,30m (dưới BĐ3 0,20m). Dữ liệu giữ nguyên ở cấp trạm vì chưa có bảng nối trạm &rarr; mã xã.
              </div>
            </div>

            <div className="overflow-x-auto rounded-[6px] border border-lineStrong bg-canvas">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="border-b border-line text-inkDim">
                  <tr>
                    <th className="px-2.5 py-2 font-medium">Trạm / Sông</th>
                    <th className="px-2 py-2 text-right font-medium">Đỉnh (m)</th>
                    <th className="px-2 py-2 text-right font-medium">BĐ3</th>
                    <th className="px-2.5 py-2 text-right font-medium">Đỉnh theo ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stations.map((s) => {
                    const activeAtDate = isStationActiveAtDate(s, dateStr);
                    return (
                      <tr
                        key={s.station}
                        className={activeAtDate ? 'bg-white/[0.03]' : ''}
                      >
                        <td className="px-2.5 py-1.5">
                          <div className="font-medium text-ink">{s.station}</div>
                          <div className="text-[11px] text-inkDim">
                            Sông {s.river} · {s.province}
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
                            <span className="text-inkDim">BĐ2 (dưới BĐ3)</span>
                          ) : activeAtDate ? (
                            <span className="text-ink">
                              &gt;BĐ3 · {s.peak_time_ict.slice(5, 16)}
                            </span>
                          ) : (
                            <span className="text-inkDim">
                              Chờ {s.peak_time_ict.slice(8, 10)}/{s.peak_time_ict.slice(5, 7)}
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
                  Open API Payload (TT 64/2024 · NĐ 346/2026 Bảo hiểm chỉ số)
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-line bg-transparent px-2 text-[11px] text-inkMuted hover:border-lineStrong hover:text-ink"
                >
                  <Copy className="h-3 w-3" strokeWidth={1.75} />
                  <span>{copiedJson ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              <pre className="max-h-[210px] overflow-auto rounded-[6px] border border-lineStrong bg-canvas p-2.5 font-mono text-[11px] leading-relaxed text-[#CBD5E1]">
                {JSON.stringify(apiPayload, null, 2)}
              </pre>
            </div>

            {/* 12-Province Live NHNN Quarterly Table computed from 2,895 JSON */}
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-ink">
                Tổng hợp báo cáo 12 tỉnh gửi NHNN (tính trực tiếp từ 2.895 xã)
              </div>
              <div className="max-h-[220px] overflow-y-auto rounded-[6px] border border-lineStrong bg-canvas">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead className="sticky top-0 bg-panel text-inkDim">
                    <tr>
                      <th className="border-b border-line px-2.5 py-1.5 font-medium">Tỉnh</th>
                      <th className="border-b border-line px-2 py-1.5 text-right font-medium">Số xã</th>
                      <th className="border-b border-line px-2 py-1.5 text-right font-medium">R1 mưa</th>
                      <th className="border-b border-line px-2.5 py-1.5 text-right font-medium">UNOSAT &ge;5%</th>
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
  tone,
}: {
  label: string;
  value: string;
  status: string;
  tone: 'alert' | 'warn' | 'info' | 'neutral';
}) {
  const toneClass = tone === 'neutral' ? 'text-inkMuted' : 'text-ink';

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="text-inkDim">{label}</span>
      <div className="flex items-center gap-2 font-mono text-[11.5px] tabular-nums">
        <span className="font-medium text-ink">{value}</span>
        <span className="text-white/[0.12]">|</span>
        <span className={toneClass}>{status}</span>
      </div>
    </div>
  );
}

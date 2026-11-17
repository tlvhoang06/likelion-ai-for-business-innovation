import type { CommuneYagiStatus, Lang, LayerToggles, RiverStationR2 } from '../types/yagi';

export interface TimelineDay {
  date: string;
  shortDate: string;
  displayDate: string;
  tag?: string;
  tagEn?: string;
  summary: string;
  summaryEn: string;
}

export const TIMELINE_DAYS: TimelineDay[] = [
  {
    date: '2024-09-05',
    shortDate: '05/09',
    displayDate: '05/09/2024',
    summary: 'Trước bão đổ bộ — theo dõi nền khí tượng thủy văn 12 tỉnh Bắc Bộ',
    summaryEn: 'Pre-landfall baseline — monitoring hydro-met telemetry across 12 Northern provinces',
  },
  {
    date: '2024-09-06',
    shortDate: '06/09',
    displayDate: '06/09/2024',
    summary: 'Cảnh báo bão vào Biển Đông, chưa có xã vượt ngưỡng kích hoạt',
    summaryEn: 'Typhoon enters East Sea — zero communes above parametric trigger thresholds',
  },
  {
    date: '2024-09-07',
    shortDate: '07/09',
    displayDate: '07/09/2024',
    tag: 'Đổ bộ',
    tagEn: 'Landfall',
    summary: 'Bão đổ bộ Quảng Ninh – Hải Phòng: gió R50 (R3) kích hoạt 2.594 xã vào Watchlist theo dõi',
    summaryEn: 'Quang Ninh – Hai Phong landfall: R50 wind band (R3) flags 2,594 communes into Watchlist',
  },
  {
    date: '2024-09-08',
    shortDate: '08/09',
    displayDate: '08/09/2024',
    tag: 'Mưa R1',
    tagEn: 'Rain R1',
    summary: 'Hoàn lưu gây mưa >200mm: 1.070 xã chạm R1; Yên Bái (Sông Thao) đạt ≥BĐ3 khung 19:00–21:47 (+48 xã R2)',
    summaryEn: 'Rain >200mm hits 1,070 R1 communes; Yen Bai crosses ≥AL3 within [19:00–21:47] (+48 R2 communes)',
  },
  {
    date: '2024-09-09',
    shortDate: '09/09',
    displayDate: '09/09/2024',
    summary: 'Mưa lớn kéo dài ở ĐBSH & trung du; rà soát sớm danh mục ưu tiên R1|R2 chuẩn bị biên bản UBND',
    summaryEn: 'Persistent rainfall across RRD & midlands; early R1|R2 priority screening & UBND batch prep',
  },
  {
    date: '2024-09-10',
    shortDate: '10/09',
    displayDate: '10/09/2024',
    summary: 'Thêm 98 xã R1; Phủ Lạng Thương (03:30) & Đáp Cầu (15:30) đạt ≥BĐ3 (+100 xã R2); Yên Bái đỉnh 35,73m',
    summaryEn: '98 more R1 communes; Phu Lang Thuong (03:30) & Dap Cau (15:30) reach ≥AL3 (+100 R2); Yen Bai peaks 35.73m',
  },
  {
    date: '2024-09-11',
    shortDate: '11/09',
    displayDate: '11/09/2024',
    tag: 'Đỉnh lũ',
    tagEn: 'River Peak',
    summary: 'Vụ Quang (03:30*) & Phả Lại (21:00) đạt ≥BĐ3 → đủ 215 xã R2; cộng gộp 2.692 xã R1|R2|R3 (1.338 xã R1|R2)',
    summaryEn: 'Vu Quang (03:30*) & Pha Lai (21:00) reach ≥AL3 → 215 R2; 2,692 combined early flag (1,338 R1|R2 Priority)',
  },
  {
    date: '2024-09-12',
    shortDate: '12/09',
    displayDate: '12/09/2024',
    tag: 'UNOSAT',
    tagEn: 'UNOSAT',
    summary: 'Đáp Cầu (7,79m) & Phả Lại (6,25m) đạt đỉnh; Hà Nội 11,30m (<BĐ3); ảnh hậu kiểm UNOSAT 3966 ghi 718 xã ngập ≥5%',
    summaryEn: 'Dap Cau (7.79m) & Pha Lai (6.25m) peak; Ha Noi 11.30m (<AL3); post-event UNOSAT 3966 maps 718 flooded ≥5%',
  },
  {
    date: '2024-09-13',
    shortDate: '13/09',
    displayDate: '13/09/2024',
    summary: 'Lớp hậu kiểm Sentinel-1 & đề xuất xác nhận UBND trước khi mở đề nghị 1-Chạm chờ ngân hàng duyệt (≤10 ngày TT 29/2025)',
    summaryEn: 'Post-event Sentinel-1 & proposed UBND confirmation gate 1-Tap requests for bank review inside ≤10d window',
  },
  {
    date: '2024-09-14',
    shortDate: '14/09',
    displayDate: '14/09/2024',
    summary: 'Khóa sổ kiểm toán NĐ 346/2026 & tổng hợp hồ sơ đề nghị giữ Nhóm nợ 1 chờ ngân hàng xét duyệt gửi NHNN',
    summaryEn: 'Close Decree 346/2026 audit ledger & compile Group 1 review dossiers for partner bank approval & SBV reporting',
  },
];

export const SHOWCASE_COMMUNES: Array<{
  gid: string;
  label: string;
  tag: string;
  tagEn: string;
}> = [
  { gid: 'VNM.3.4.26_1', label: 'Vũ Xá (Bắc Giang)', tag: '84,9% · R1+R3', tagEn: '84.9% · R1+R3' },
  { gid: 'VNM.42.4.6_1', label: 'Gia Thủy (Ninh Bình)', tag: '76,1% · Watchlist', tagEn: '76.1% · Exception' },
  { gid: 'VNM.44.1.6_1', label: 'Điêu Lương (Phú Thọ)', tag: '22,2% · R2 Yên Bái', tagEn: '22.2% · R2 Yen Bai' },
  { gid: 'VNM.27.6.15_1', label: 'Nam Phương Tiến', tag: '43,9% · Hà Nội <BĐ3', tagEn: '43.9% · HN <AL3' },
  { gid: 'VNM.49.7.1_1', label: 'Bạch Đằng', tag: 'Ngoài UNOSAT', tagEn: 'Out of UNOSAT' },
  { gid: 'VNM.3.1.2_1', label: 'Đa Mai', tag: '4,1% · Khô', tagEn: '4.1% · Dry' },
];

/** Unified 4-pair palette (+ balanced violet overlap) for hazard layer tags, map polygons, and legends. */
export const SIGNAL_COLORS = {
  r1: '#ffb255',
  r1Light: '#ffcd8e',
  r2: '#8fd7d7',
  r2Alert: '#f45f74',
  r3R50: '#ff8ca1',
  r3R64: '#f45f74',
  unosat: '#00b0be',
  unosatLight: '#8fd7d7',
  s1: '#98c127',
  s1Light: '#bdd373',
  overlap: '#a78bfa',
  overlap3: '#e879f9',
} as const;

export interface CommuneSignalEval {
  r1On: boolean;
  r2On: boolean;
  r3On: boolean;
  count: number;
  unosatFlood: boolean;
  s1Flood: boolean;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
}

export const UNOSAT_READY_DATE = '2024-09-12';
export const S1_COMPOSITE_WINDOW = '08–20/09/2024';

export function isPostEventReferenceReady(dateStr: string): boolean {
  return dateStr >= UNOSAT_READY_DATE;
}

export function getCommuneR2Date(c: CommuneYagiStatus): string | null {
  if (c.r2 !== 1) return null;
  if (c.r2_first_bulletin_ict) return c.r2_first_bulletin_ict.slice(0, 10);
  if (c.r2_station === 'Yen Bai') return '2024-09-08';
  return c.r2_peak_time_ict ? c.r2_peak_time_ict.slice(0, 10) : null;
}

export function evaluateCommuneAtDate(
  c: CommuneYagiStatus,
  dateStr: string,
  layers: LayerToggles
): CommuneSignalEval {
  const r1On = layers.r1 && c.r1 && c.r1_time !== null && c.r1_time.slice(0, 10) <= dateStr;
  const r2Date = getCommuneR2Date(c);
  const r2On = layers.r2 && c.r2 === 1 && r2Date !== null && r2Date <= dateStr;
  const r3Flag = layers.useR64 ? c.r3_r64 : c.r3_r50;
  const r3On = layers.r3 && r3Flag && c.r3_time !== null && c.r3_time.slice(0, 10) <= dateStr;
  const count = (r1On ? 1 : 0) + (r2On ? 1 : 0) + (r3On ? 1 : 0);

  const unosatFlood = layers.unosat && c.unosat_label === 1;
  const s1Flood = layers.s1 && c.s1_label === 1;

  let fillColor = '#1C232E';
  let fillOpacity = 0.85;

  if (unosatFlood) {
    fillColor = count > 0 ? SIGNAL_COLORS.unosatLight : SIGNAL_COLORS.unosat;
    fillOpacity = 0.92;
  } else if (s1Flood) {
    fillColor = SIGNAL_COLORS.s1;
    fillOpacity = 0.9;
  } else if (count === 3) {
    fillColor = SIGNAL_COLORS.overlap3;
    fillOpacity = 0.92;
  } else if (count === 2) {
    fillColor = SIGNAL_COLORS.overlap;
    fillOpacity = 0.88;
  } else if (r2On) {
    fillColor = SIGNAL_COLORS.r2;
    fillOpacity = 0.88;
  } else if (r1On) {
    fillColor = SIGNAL_COLORS.r1;
    fillOpacity = 0.85;
  } else if (r3On) {
    fillColor = layers.useR64 ? SIGNAL_COLORS.r3R64 : SIGNAL_COLORS.r3R50;
    fillOpacity = 0.82;
  }

  return {
    r1On,
    r2On,
    r3On,
    count,
    unosatFlood,
    s1Flood,
    fillColor,
    fillOpacity,
    strokeColor: '#0E1218',
  };
}

export function getStationActiveDate(s: RiverStationR2): string {
  if (s.first_bd3_bulletin_ict) return s.first_bd3_bulletin_ict.slice(0, 10);
  if (s.station === 'Yen Bai') return '2024-09-08';
  return s.peak_time_ict.slice(0, 10);
}

export function isStationActiveAtDate(s: RiverStationR2, dateStr: string): boolean {
  return s.r2_triggered === 1 && getStationActiveDate(s) <= dateStr;
}

export function formatNum(n: number, lang: Lang = 'vi'): string {
  return Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
}

export function formatVndBillions(millionVnd: number, lang: Lang = 'vi'): string {
  const ty = millionVnd / 1000;
  const digits = ty < 100 ? 2 : 1;
  const formatted = ty.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
    minimumFractionDigits: ty < 10 ? 1 : 0,
    maximumFractionDigits: digits,
  });
  return lang === 'en' ? `${formatted}B VND` : `${formatted} tỷ đ`;
}

export function formatPct(n: number, lang: Lang = 'vi', digits = 1): string {
  return `${n.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatDateLabel(dateStr: string, lang: Lang = 'vi'): string {
  const [y, m, d] = dateStr.split('-');
  return lang === 'en' ? `${y}-${m}-${d}` : `${d}/${m}/${y}`;
}

export interface ProvinceSummaryRow {
  province: string;
  communes: number;
  r1Count: number;
  r2Count: number;
  r3R50Count: number;
  unosatClassifiable: number;
  unosatFlooded: number;
  simLoans: number;
}

export function computeProvinceStats(communes: CommuneYagiStatus[]): ProvinceSummaryRow[] {
  const byProv = new Map<string, ProvinceSummaryRow>();
  for (const c of communes) {
    let row = byProv.get(c.province);
    if (!row) {
      row = {
        province: c.province,
        communes: 0,
        r1Count: 0,
        r2Count: 0,
        r3R50Count: 0,
        unosatClassifiable: 0,
        unosatFlooded: 0,
        simLoans: 0,
      };
      byProv.set(c.province, row);
    }
    row.communes += 1;
    if (c.r1) row.r1Count += 1;
    if (c.r2 === 1) row.r2Count += 1;
    if (c.r3_r50) row.r3R50Count += 1;
    if (c.unosat_status === 'CLASSIFIABLE') {
      row.unosatClassifiable += 1;
      if (c.unosat_label === 1) row.unosatFlooded += 1;
    }
    row.simLoans += c.sim_loans;
  }
  return Array.from(byProv.values()).sort((a, b) => b.unosatFlooded - a.unosatFlooded);
}

export function computeValidationMetrics(communes: CommuneYagiStatus[]) {
  const classifiable = communes.filter((c) => c.unosat_status === 'CLASSIFIABLE');
  const outsideUnosat = communes.length - classifiable.length;
  const pos = classifiable.filter((c) => c.unosat_label === 1);
  const dry = classifiable.filter((c) => c.unosat_label === 0);

  const isR2 = (c: CommuneYagiStatus) => c.r2 === 1;
  const isR1OrR2 = (c: CommuneYagiStatus) => c.r1 || c.r2 === 1;
  const isR50All = (c: CommuneYagiStatus) => c.r1 || c.r2 === 1 || c.r3_r50;
  const isR64All = (c: CommuneYagiStatus) => c.r1 || c.r2 === 1 || c.r3_r64;

  const r1Tp = pos.filter((c) => c.r1).length;
  const r2Tp = pos.filter(isR2).length;
  const r1OrR2Tp = pos.filter(isR1OrR2).length;
  const r3R50Tp = pos.filter((c) => c.r3_r50).length;
  const r3R64Tp = pos.filter((c) => c.r3_r64).length;
  const r50AllTp = pos.filter(isR50All).length;
  const r64AllTp = pos.filter(isR64All).length;

  const r1ClassTotal = classifiable.filter((c) => c.r1).length;
  const r2ClassTotal = classifiable.filter(isR2).length;
  const r1OrR2ClassTotal = classifiable.filter(isR1OrR2).length;
  const r3R50ClassTotal = classifiable.filter((c) => c.r3_r50).length;
  const r3R64ClassTotal = classifiable.filter((c) => c.r3_r64).length;
  const r50AllClassTotal = classifiable.filter(isR50All).length;
  const r64AllClassTotal = classifiable.filter(isR64All).length;

  const r50AllFp = r50AllClassTotal - r50AllTp;
  const r50AllFn = pos.length - r50AllTp;
  const r50AllTn = dry.length - r50AllFp;

  const threeRules = classifiable.filter((c) => c.r1 && c.r2 === 1 && c.r3_r50);
  const threeRuleTp = threeRules.filter((c) => c.unosat_label === 1).length;

  const s2Eval = classifiable.filter((c) => c.s2_ml_confirm !== null && c.s2_ml_confirm !== undefined);
  const s2MlTp = s2Eval.filter((c) => c.s2_ml_confirm === true && c.unosat_label === 1).length;
  const s2MlFp = s2Eval.filter((c) => c.s2_ml_confirm === true && c.unosat_label === 0).length;
  const s2MlFn = s2Eval.filter((c) => c.s2_ml_confirm === false && c.unosat_label === 1).length;
  const s2MlTn = s2Eval.filter((c) => c.s2_ml_confirm === false && c.unosat_label === 0).length;

  const isWatchlist = (c: CommuneYagiStatus) => isR50All(c) && !isR1OrR2(c);
  const watchlistClassifiable = classifiable.filter(isWatchlist);
  const watchlistMlConfirmCount = watchlistClassifiable.filter((c) => c.s2_ml_confirm === true).length;
  const watchlistFloodCaughtByMl = watchlistClassifiable.filter(
    (c) => c.s2_ml_confirm === true && c.unosat_label === 1
  ).length;
  const earlyFnRecoveredByMlCount = pos.filter(
    (c) => !isR50All(c) && c.s2_ml_confirm === true
  ).length;

  return {
    total: communes.length,
    classifiableCount: classifiable.length,
    outsideUnosat,
    floodedCount: pos.length,
    dryCount: dry.length,
    r1Total: communes.filter((c) => c.r1).length,
    r2Total: communes.filter(isR2).length,
    r1OrR2Total: communes.filter(isR1OrR2).length,
    r3OnlyWatchlistTotal: communes.filter(isWatchlist).length,
    r3R50Total: communes.filter((c) => c.r3_r50).length,
    r3R64Total: communes.filter((c) => c.r3_r64).length,
    r50AllTotal: communes.filter(isR50All).length,
    r64AllTotal: communes.filter(isR64All).length,
    threeRuleTotal: communes.filter((c) => c.r1 && c.r2 === 1 && c.r3_r50).length,
    threeRuleFloodPct: threeRules.length ? (threeRuleTp / threeRules.length) * 100 : 0,
    s1FloodCount: communes.filter((c) => c.s1_label === 1).length,
    s2MlClassifiableCount: s2Eval.length,
    s2MlTp,
    s2MlFp,
    s2MlFn,
    s2MlTn,
    s2MlPrecision: s2MlTp + s2MlFp ? (s2MlTp / (s2MlTp + s2MlFp)) * 100 : 0,
    s2MlRecall: s2MlTp + s2MlFn ? (s2MlTp / (s2MlTp + s2MlFn)) * 100 : 0,
    watchlistMlConfirmCount,
    watchlistFloodCaughtByMl,
    earlyFnRecoveredByMlCount,
    r1Recall: pos.length ? (r1Tp / pos.length) * 100 : 0,
    r1Precision: r1ClassTotal ? (r1Tp / r1ClassTotal) * 100 : 0,
    r1Tp,
    r2Recall: pos.length ? (r2Tp / pos.length) * 100 : 0,
    r2Precision: r2ClassTotal ? (r2Tp / r2ClassTotal) * 100 : 0,
    r2Tp,
    r1OrR2Recall: pos.length ? (r1OrR2Tp / pos.length) * 100 : 0,
    r1OrR2Precision: r1OrR2ClassTotal ? (r1OrR2Tp / r1OrR2ClassTotal) * 100 : 0,
    r1OrR2Tp,
    r3R50Recall: pos.length ? (r3R50Tp / pos.length) * 100 : 0,
    r3R50Precision: r3R50ClassTotal ? (r3R50Tp / r3R50ClassTotal) * 100 : 0,
    r3R50Tp,
    r3R64Recall: pos.length ? (r3R64Tp / pos.length) * 100 : 0,
    r3R64Precision: r3R64ClassTotal ? (r3R64Tp / r3R64ClassTotal) * 100 : 0,
    r3R64Tp,
    r50AllRecall: pos.length ? (r50AllTp / pos.length) * 100 : 0,
    r50AllPrecision: r50AllClassTotal ? (r50AllTp / r50AllClassTotal) * 100 : 0,
    r50AllTp,
    r50AllFp,
    r50AllFn,
    r50AllTn,
    r64AllRecall: pos.length ? (r64AllTp / pos.length) * 100 : 0,
    r64AllPrecision: r64AllClassTotal ? (r64AllTp / r64AllClassTotal) * 100 : 0,
    r64AllTp,
  };
}


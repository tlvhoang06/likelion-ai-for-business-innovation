import type { CommuneYagiStatus, LayerToggles, RiverStationR2 } from '../types/yagi';

export interface TimelineDay {
  date: string;
  shortDate: string;
  displayDate: string;
  tag?: string;
  summary: string;
}

export const TIMELINE_DAYS: TimelineDay[] = [
  {
    date: '2024-09-05',
    shortDate: '05/09',
    displayDate: '05/09/2024',
    summary: 'Trước bão đổ bộ — theo dõi nền khí tượng thủy văn 12 tỉnh Bắc Bộ',
  },
  {
    date: '2024-09-06',
    shortDate: '06/09',
    displayDate: '06/09/2024',
    summary: 'Cảnh báo bão vào Biển Đông, chưa có xã vượt ngưỡng kích hoạt',
  },
  {
    date: '2024-09-07',
    shortDate: '07/09',
    displayDate: '07/09/2024',
    tag: 'Đổ bộ',
    summary: 'Bão đổ bộ Quảng Ninh – Hải Phòng: gió R50 (R3) kích hoạt 2.594 xã',
  },
  {
    date: '2024-09-08',
    shortDate: '08/09',
    displayDate: '08/09/2024',
    tag: 'Mưa R1',
    summary: 'Hoàn lưu gây mưa cực lớn >200mm/24h: thêm 1.070 xã chạm ngưỡng R1 (Đ.44 QĐ18)',
  },
  {
    date: '2024-09-09',
    shortDate: '09/09',
    displayDate: '09/09/2024',
    summary: 'Mưa tiếp diễn vùng núi & ĐBSH; kích hoạt quy trình chuẩn bị hồ sơ UBND xã',
  },
  {
    date: '2024-09-10',
    shortDate: '10/09',
    displayDate: '10/09/2024',
    summary: 'Thêm 98 xã vượt ngưỡng R1; lũ sông Cầu (Gia Bảy) & Thao (Bảo Hà, Yên Bái) > BĐ3',
  },
  {
    date: '2024-09-11',
    shortDate: '11/09',
    displayDate: '11/09/2024',
    tag: 'Đỉnh B5',
    summary: '5 trạm thủy văn lớn (Lào Cai, Tuyên Quang, Vụ Quang, Chã, Phủ Lạng Thương) > BĐ3',
  },
  {
    date: '2024-09-12',
    shortDate: '12/09',
    displayDate: '12/09/2024',
    tag: 'UNOSAT',
    summary: 'Đáp Cầu & Phả Lại vượt BĐ3; ảnh vệ tinh UNOSAT 3966 ghi nhận 718 xã ngập ≥5%',
  },
  {
    date: '2024-09-13',
    shortDate: '13/09',
    displayDate: '13/09/2024',
    summary: 'Chốt đề nghị giãn nợ 1-Chạm & ngoại lệ trước hạn 10 ngày (TT 29/2025)',
  },
  {
    date: '2024-09-14',
    shortDate: '14/09',
    displayDate: '14/09/2024',
    summary: 'Khóa sổ kiểm toán NĐ 346/2026 & tổng hợp giữ Nhóm nợ 1 gửi NHNN',
  },
];

export const SHOWCASE_COMMUNES: Array<{ gid: string; label: string; tag: string }> = [
  { gid: 'VNM.3.4.26_1', label: 'Vũ Xá (Bắc Giang)', tag: '84,9% · R1+R3' },
  { gid: 'VNM.3.9.18_1', label: 'Trí Yên', tag: '80,2% · R1+R3' },
  { gid: 'VNM.42.4.6_1', label: 'Gia Thủy (Ninh Bình)', tag: '76,1% · Ngoại lệ' },
  { gid: 'VNM.22.3.12_1', label: 'Kênh Giang', tag: '69,3% · R1+R3' },
  { gid: 'VNM.27.6.15_1', label: 'Nam Phương Tiến', tag: '43,9% · R3' },
  { gid: 'VNM.49.7.1_1', label: 'Bạch Đằng', tag: 'Ngoài UNOSAT' },
  { gid: 'VNM.3.1.2_1', label: 'Đa Mai', tag: '4,1% · Khô' },
];

export interface CommuneSignalEval {
  r1On: boolean;
  r3On: boolean;
  count: number;
  unosatFlood: boolean;
  s1Flood: boolean;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
}

export function evaluateCommuneAtDate(
  c: CommuneYagiStatus,
  dateStr: string,
  layers: LayerToggles
): CommuneSignalEval {
  const r1On = layers.r1 && c.r1 && c.r1_time !== null && c.r1_time.slice(0, 10) <= dateStr;
  const r3Flag = layers.useR64 ? c.r3_r64 : c.r3_r50;
  const r3On = layers.r3 && r3Flag && c.r3_time !== null && c.r3_time.slice(0, 10) <= dateStr;
  const count = (r1On ? 1 : 0) + (r3On ? 1 : 0);

  const unosatFlood = layers.unosat && c.unosat_label === 1;
  const s1Flood = layers.s1 && c.s1_label === 1;

  let fillColor = '#1C232E';
  let fillOpacity = 0.85;

  if (unosatFlood) {
    fillColor = count > 0 ? '#0284C7' : '#0369A1';
    fillOpacity = 0.92;
  } else if (s1Flood) {
    fillColor = '#0D9488';
    fillOpacity = 0.9;
  } else if (count === 2) {
    fillColor = '#C2410C';
    fillOpacity = 0.88;
  } else if (count === 1) {
    fillColor = '#9A5B13';
    fillOpacity = 0.82;
  }

  return {
    r1On,
    r3On,
    count,
    unosatFlood,
    s1Flood,
    fillColor,
    fillOpacity,
    strokeColor: '#0E1218',
  };
}

export function isStationActiveAtDate(s: RiverStationR2, dateStr: string): boolean {
  return s.r2_triggered === 1 && s.peak_time_ict.slice(0, 10) <= dateStr;
}

export function formatNum(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function formatVndBillions(millionVnd: number): string {
  const ty = millionVnd / 1000;
  const digits = ty < 100 ? 2 : 1;
  return `${ty.toLocaleString('vi-VN', {
    minimumFractionDigits: ty < 10 ? 1 : 0,
    maximumFractionDigits: digits,
  })} tỷ đ`;
}

export interface ProvinceSummaryRow {
  province: string;
  communes: number;
  r1Count: number;
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
        r3R50Count: 0,
        unosatClassifiable: 0,
        unosatFlooded: 0,
        simLoans: 0,
      };
      byProv.set(c.province, row);
    }
    row.communes += 1;
    if (c.r1) row.r1Count += 1;
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
  const r1Tp = pos.filter((c) => c.r1).length;
  const r3R50Tp = pos.filter((c) => c.r3_r50).length;
  const r3R64Tp = pos.filter((c) => c.r3_r64).length;

  const r1ClassTotal = classifiable.filter((c) => c.r1).length;
  const r3R50ClassTotal = classifiable.filter((c) => c.r3_r50).length;
  const r3R64ClassTotal = classifiable.filter((c) => c.r3_r64).length;

  return {
    total: communes.length,
    classifiableCount: classifiable.length,
    outsideUnosat,
    floodedCount: pos.length,
    dryCount: classifiable.length - pos.length,
    r1Total: communes.filter((c) => c.r1).length,
    r3R50Total: communes.filter((c) => c.r3_r50).length,
    r3R64Total: communes.filter((c) => c.r3_r64).length,
    s1FloodCount: communes.filter((c) => c.s1_label === 1).length,
    r1Recall: pos.length ? (r1Tp / pos.length) * 100 : 0,
    r1Precision: r1ClassTotal ? (r1Tp / r1ClassTotal) * 100 : 0,
    r1Tp,
    r3R50Recall: pos.length ? (r3R50Tp / pos.length) * 100 : 0,
    r3R50Precision: r3R50ClassTotal ? (r3R50Tp / r3R50ClassTotal) * 100 : 0,
    r3R50Tp,
    r3R64Recall: pos.length ? (r3R64Tp / pos.length) * 100 : 0,
    r3R64Precision: r3R64ClassTotal ? (r3R64Tp / r3R64ClassTotal) * 100 : 0,
    r3R64Tp,
  };
}


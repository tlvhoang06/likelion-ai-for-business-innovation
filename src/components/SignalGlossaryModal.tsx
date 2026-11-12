import { Info, X } from 'lucide-react';
import type { Lang } from '../types/yagi';
import { SIGNAL_COLORS } from '../utils/yagiLogic';

interface SignalGlossaryModalProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
}

interface GlossaryEntry {
  code: string;
  color: string;
  titleVi: string;
  titleEn: string;
  ruleVi: string;
  ruleEn: string;
  meaningVi: string;
  meaningEn: string;
  noteVi?: string;
  noteEn?: string;
}

const SIGNAL_ENTRIES: GlossaryEntry[] = [
  {
    code: 'R1',
    color: SIGNAL_COLORS.r1,
    titleVi: 'R1 · Mưa cực đoan 24h',
    titleEn: 'R1 · Extreme 24h Rainfall',
    ruleVi: 'Ngưỡng > 200mm/24h (Đ.44 QĐ 18/2021) · 1.169 / 2.895 xã',
    ruleEn: 'Threshold > 200mm/24h (Art.44 Dec.18) · 1,169 / 2,895 communes',
    meaningVi:
      'Tín hiệu kích hoạt sớm dựa trên lượng mưa tại xã. Tự động đưa xã vào diện đề xuất giãn nợ khi vượt ngưỡng.',
    meaningEn:
      'Early parametric rain trigger. Automatically flags communes crossing 200mm for fast deferral offers.',
    noteVi:
      'Hạn chế: Một số xã mưa tại chỗ < 200mm vẫn ngập nặng do nước lũ thượng nguồn đổ về → được gom vào tab Ngoại lệ.',
    noteEn:
      'Gap: Communes below 200mm can still flood from upstream runoff — captured in the Exceptions queue.',
  },
  {
    code: 'R2',
    color: SIGNAL_COLORS.r2Alert,
    titleVi: 'R2 · Mực nước trạm thủy văn (BĐ3)',
    titleEn: 'R2 · River Station Stage (AL3)',
    ruleVi: '11 trạm B5 Bắc Bộ (QĐ 05/2020) · 10/11 đỉnh vượt Báo động 3',
    ruleEn: '11 Northern B5 gauges (Dec.05) · 10/11 peaks above Alert Level 3',
    meaningVi:
      'Theo dõi đỉnh lũ sông Cầu, Thương, Lục Nam, Thái Bình, Hồng, Hoàng Long trong tab Mực nước.',
    meaningEn:
      'Tracks river flood peaks across major Northern basins inside the River Stages tab.',
    noteVi:
      'Giới hạn hiện tại: Dữ liệu R2 mới dừng ở 11 điểm trạm sông, chưa có bảng nối trực tiếp tới từng mã xã GID_3.',
    noteEn:
      'Current limit: Station-level context only — verified station-to-GID_3 commune crosswalks are not yet mapped.',
  },
  {
    code: 'R3',
    color: SIGNAL_COLORS.r3R50,
    titleVi: 'R3 · Trường gió bão (R50 / R64)',
    titleEn: 'R3 · Typhoon Wind Band (R50 / R64)',
    ruleVi: 'R50: 2.622 xã · R64 (gió mạnh hơn): 1.879 xã',
    ruleEn: 'R50: 2,622 communes · R64 (stronger sensitivity): 1,879 communes',
    meaningVi:
      'Hai kịch bản độ nhạy diện rộng theo vùng gió bão quét qua, có thể bật/tắt nhanh ngay trên thanh bản đồ.',
    meaningEn:
      'Two wind-band sensitivity presets toggleable directly in the map layer bar.',
  },
  {
    code: 'R1+R3',
    color: SIGNAL_COLORS.overlap,
    titleVi: 'Tím · Khớp đồng thời 2 nguồn (R1 + R3)',
    titleEn: 'Violet · Dual-Rule Match (R1 + R3)',
    ruleVi: 'Cộng hưởng cả mưa cực đoan lẫn trường gió bão',
    ruleEn: 'Triggered by both extreme rainfall and storm wind band',
    meaningVi:
      'Nhóm xã có độ tin cậy tác động kép cao nhất tại mốc ngày đang chọn trên thanh thời gian.',
    meaningEn:
      'Highest-confidence parametric trigger overlap at the selected storm timeline date.',
  },
  {
    code: 'UNOSAT',
    color: SIGNAL_COLORS.unosat,
    titleVi: 'UNOSAT 3966 · Ảnh vệ tinh vùng ngập ĐBSH',
    titleEn: 'UNOSAT 3966 · Satellite Flood Extent',
    ruleVi: 'Chấm được 2.540 xã (718 xã ngập ≥ 5%, 1.822 xã < 5%) · Ngoài vùng: 355 xã',
    ruleEn: '2,540 classifiable (718 ≥ 5% flood, 1,822 < 5%) · Outside scan: 355',
    meaningVi:
      'Tham chiếu hậu kiểm ngập thực tế. Các xã nằm trong 355 xã ngoài vùng quét được giữ trạng thái "Chưa biết", không quy về 0%.',
    meaningEn:
      'Post-event flood validation reference. The 355 outside-scan communes remain marked Unknown coverage rather than 0%.',
  },
  {
    code: 'S1',
    color: SIGNAL_COLORS.s1,
    titleVi: 'Sentinel-1 SAR · Ảnh radar xuyên mây',
    titleEn: 'Sentinel-1 SAR · Auxiliary Radar Layer',
    ruleVi: 'Lớp phụ trợ · 101 xã ghi nhận dấu hiệu ngập',
    ruleEn: 'Auxiliary layer · 101 communes flagged with flood proxy',
    meaningVi:
      'Ảnh radar xuyên mây hỗ trợ đối chiếu thêm cho các vùng thiếu ảnh quang học hoặc nằm ngoài vùng quét UNOSAT.',
    meaningEn:
      'Cloud-penetrating radar flood proxy aiding review where optical scans or UNOSAT coverage are missing.',
  },
];

/** Concise glossary modal explaining R1/R2/R3, UNOSAT, Sentinel-1 and key banking regulations. */
export function SignalGlossaryModal({
  lang,
  open,
  onClose,
}: SignalGlossaryModalProps) {
  if (!open) return null;
  const isEn = lang === 'en';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signal-glossary-title"
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[780px] overflow-y-auto rounded-[6px] border border-lineStrong bg-panel text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-lineStrong px-5 py-3.5">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#8ACBB5]">
              <Info className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span>
                {isEn ? 'Signal & Terminology Reference' : 'Giải thích chỉ số & Thuật ngữ'}
              </span>
            </div>
            <h2
              id="signal-glossary-title"
              className="mt-0.5 text-[15px] font-semibold text-ink"
            >
              {isEn
                ? 'What are R1, R2, R3, UNOSAT 3966, Sentinel-1 & Group 1 retention?'
                : 'R1, R2, R3, UNOSAT 3966, Sentinel-1 và Nhóm nợ 1 nghĩa là gì?'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-line text-inkMuted hover:bg-panelAlt hover:text-ink"
            aria-label={isEn ? 'Close' : 'Đóng'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-[12.5px]">
          <div>
            <div className="mb-2 text-[12px] font-semibold text-ink">
              {isEn
                ? '1. Map Signal Layers & Color Legend'
                : '1. Các lớp tín hiệu thiên tai & màu trên bản đồ'}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SIGNAL_ENTRIES.map((item) => (
                <div
                  key={item.code}
                  className="rounded-[5px] border border-lineStrong bg-canvas p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-ink">
                      {isEn ? item.titleEn : item.titleVi}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] text-[#8ACBB5]">
                    {isEn ? item.ruleEn : item.ruleVi}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-inkMuted">
                    {isEn ? item.meaningEn : item.meaningVi}
                  </p>
                  {(item.noteVi || item.noteEn) && (
                    <p className="mt-1 border-t border-line pt-1 text-[11.5px] text-inkDim">
                      {isEn ? item.noteEn : item.noteVi}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-3.5">
            <div className="mb-2 text-[12px] font-semibold text-ink">
              {isEn
                ? '2. Credit Operations & Regulatory Terms'
                : '2. Khái niệm nghiệp vụ tín dụng trên giao diện'}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-[5px] border border-lineStrong bg-canvas p-3">
                <div className="font-mono text-[11px] font-semibold text-[#CDECD7]">
                  {isEn ? 'Dec. 55 · Cir. 29/2025 (10d)' : 'NĐ 55 · TT 29/2025 (10 ngày)'}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-inkMuted">
                  {isEn
                    ? 'Agri restructuring requires borrower request within ≤10 days overdue; non-agri relief waited 88 days for Cir. 53/2024 after Yagi.'
                    : 'Cửa sổ 10 ngày nhận đề nghị 1-chạm giữ nhóm nợ nông nghiệp (với ngoài nông nghiệp sau Yagi phải chờ 88 ngày mới có TT 53/2024).'}
                </p>
              </div>

              <div className="rounded-[5px] border border-lineStrong bg-canvas p-3">
                <div className="font-mono text-[11px] font-semibold text-[#CDECD7]">
                  {isEn ? 'Group 1 & 5% Decree 86' : 'Giữ Nhóm 1 & Dự phòng 5%'}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-inkMuted">
                  {isEn
                    ? 'Retaining Debt Group 1 avoids downgrading to Group 2, preventing a 5% loan-loss provision charge on the bank.'
                    : 'Giữ nguyên Nhóm nợ 1 giúp khoản vay không rớt sang Nhóm 2 — qua đó tránh phải trích lập 5% dự phòng rủi ro theo NĐ 86/2024.'}
                </p>
              </div>

              <div className="rounded-[5px] border border-lineStrong bg-canvas p-3">
                <div className="font-mono text-[11px] font-semibold text-[#CDECD7]">
                  {isEn ? 'Exceptions & UBND Sign-off' : 'Ca Ngoại lệ & UBND Xã'}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-inkMuted">
                  {isEn
                    ? 'Flags flooded communes missed by R1 rain gauges or outside UNOSAT scan so officers verify via single commune attestation or counter paper.'
                    : 'Gom các xã ngập bị đo mưa sót hoặc ngoài vùng quét vệ tinh để cán bộ rà soát, kết hợp xác nhận chung của UBND Xã hoặc kênh giấy.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


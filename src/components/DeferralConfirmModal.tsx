import { Check, Send, ShieldCheck, X } from 'lucide-react';
import type { CommuneYagiStatus, Lang } from '../types/yagi';
import { formatDateLabel, formatNum, formatVndBillions } from '../utils/yagiLogic';

export type PendingDeferralConfirm =
  | { scope: 'regional' }
  | { scope: 'commune'; commune: CommuneYagiStatus };

interface DeferralConfirmModalProps {
  lang: Lang;
  pending: PendingDeferralConfirm | null;
  dateStr: string;
  totalCommunes: number;
  stats: {
    triggeredCount: number;
    triggeredLoans: number;
    triggeredDebtM: number;
  };
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog shown before locking regional or commune-level TT 29 debt deferral. */
export function DeferralConfirmModal({
  lang,
  pending,
  dateStr,
  totalCommunes,
  stats,
  onCancel,
  onConfirm,
}: DeferralConfirmModalProps) {
  if (!pending) return null;

  const isRegional = pending.scope === 'regional';
  const commune = pending.scope === 'commune' ? pending.commune : null;
  const formattedDate = formatDateLabel(dateStr, lang);

  const targetScopeValue = isRegional
    ? lang === 'en'
      ? `${formatNum(stats.triggeredCount, 'en')} / ${formatNum(totalCommunes, 'en')} communes`
      : `${formatNum(stats.triggeredCount, 'vi')} / ${formatNum(totalCommunes, 'vi')} xã`
    : lang === 'en'
    ? `${commune!.name} (${commune!.province})`
    : `Xã ${commune!.name} (${commune!.province})`;
  const loansCount = isRegional ? stats.triggeredLoans : commune!.sim_loans;
  const debtM = isRegional ? stats.triggeredDebtM : commune!.sim_debt_m_vnd;
  const provisionSavedM = debtM * 0.05;
  const needsManualFallbackNote =
    commune !== null && !commune.r1 && commune.r2 !== 1 && !commune.r3_r50;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deferral-confirm-title"
      className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/75 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[540px] overflow-hidden rounded-[6px] border border-lineStrong bg-panel text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-lineStrong px-5 py-3.5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#8ACBB5]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              <span>
                {isRegional
                  ? lang === 'en'
                    ? 'Regional Request Batch · Human Approval · Cir. 29/2025'
                    : 'Ghi nhận gửi toàn vùng · Ngân hàng duyệt · TT 29/2025'
                  : lang === 'en'
                  ? '1-Tap Request Dispatch · Pending Bank Review'
                  : 'Gửi đề nghị 1-Chạm · Chờ ngân hàng duyệt'}
              </span>
            </div>
            <h2
              id="deferral-confirm-title"
              className="mt-1 text-[15px] font-semibold text-ink"
            >
              {isRegional
                ? lang === 'en'
                  ? 'Log regional 1-tap requests for bank review?'
                  : 'Ghi nhận đề nghị giãn nợ toàn vùng chờ ngân hàng duyệt?'
                : lang === 'en'
                ? `Log 1-tap deferral request for ${commune!.name}?`
                : `Ghi nhận đề nghị 1-Chạm cho Xã ${commune!.name}?`}
            </h2>
            <p className="mt-0.5 text-[12px] text-inkMuted">
              {isRegional
                ? lang === 'en'
                  ? `Observed ${formattedDate} · Logs timestamped 1-Tap requests across post-confirmation communes for bank credit review (D01).`
                  : `Mốc quan trắc ${formattedDate} · Ghi nhận đề nghị 1-Chạm (kèm mốc thời gian) cho các xã đã hậu kiểm để ngân hàng xét duyệt (D01).`
                : lang === 'en'
                ? `${commune!.district}, ${commune!.province} (${commune!.gid_3}) · Rain ${commune!.rain_mm}mm${commune!.r2 === 1 && commune!.r2_station ? ` · River ${commune!.r2_station} (≥AL3)` : ''}${commune!.r3_r50 ? ' · Wind R50' : ''}`
                : `${commune!.district}, ${commune!.province} (${commune!.gid_3}) · Mưa ${commune!.rain_mm}mm${commune!.r2 === 1 && commune!.r2_station ? ` · Lũ ${commune!.r2_station} (≥BĐ3)` : ''}${commune!.r3_r50 ? ' · Gió R50' : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-line text-inkMuted transition-colors hover:border-lineStrong hover:bg-panelAlt hover:text-ink"
            aria-label={lang === 'en' ? 'Close confirmation dialog' : 'Đóng hộp thoại xác nhận'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 p-5 text-[12.5px]">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2.5">
              <div className="text-[11px] text-inkDim">
                {lang === 'en' ? 'Target Scope' : 'Phạm vi áp dụng'}
              </div>
              <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-ink">
                {targetScopeValue}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2.5">
              <div className="text-[11px] text-inkDim">
                {lang === 'en' ? 'Simulated Loans' : 'Hồ sơ vay (giả lập)'}
              </div>
              <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-ink tabular-nums">
                {formatNum(loansCount, lang)} {lang === 'en' ? 'loans' : 'khoản'}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2.5">
              <div className="text-[11px] text-inkDim">
                {lang === 'en' ? 'Debt in Review (Sim.)' : 'Dư nợ trình duyệt (giả lập)'}
              </div>
              <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-ink tabular-nums">
                {formatVndBillions(debtM, lang)}
              </div>
            </div>
            <div className="rounded-[6px] border border-lineStrong bg-canvas px-3 py-2.5">
              <div className="text-[11px] text-inkDim">
                {lang === 'en' ? 'Est. 5% Provision at Stake' : 'Dự phòng 5% tiềm năng'}
              </div>
              <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-[#8ACBB5] tabular-nums">
                {formatVndBillions(provisionSavedM, lang)}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 rounded-[6px] border border-lineStrong bg-panelAlt p-3.5 text-[12px] leading-relaxed text-inkMuted">
            <div className="font-medium text-ink">
              {lang === 'en'
                ? 'Actions to be logged for bank review:'
                : 'Nội dung nghiệp vụ sẽ ghi nhận (chờ ngân hàng duyệt):'}
            </div>
            {lang === 'en' ? (
              <>
                <p>
                  &bull; Two-stage compliance (D01): unlock 1-Tap request only <b className="text-ink">after Sentinel-1 / proposed UBND confirmation</b>. Logging a request <b className="text-ink">does NOT auto-approve</b>; the bank checks loan conditions &amp; ≤10-day window (Cir. 29/2025) before retaining Group 1.
                </p>
                <p>
                  &bull; Potential <b className="text-ink">5% Group 2 provision</b> avoided if approved (Decree 86/2024; collateral reduces net provision); counter paper intake stays open.
                </p>
              </>
            ) : (
              <>
                <p>
                  &bull; Đúng quy trình 2 tầng (D01): chỉ mở 1-Chạm <b className="text-ink">sau bước hậu kiểm Sentinel-1 / đề xuất UBND</b>. Ghi nhận đề nghị <b className="text-ink">không tự động giữ Nhóm nợ 1</b>; ngân hàng thẩm định điều kiện &amp; hạn ≤10 ngày (TT 29/2025) trước khi duyệt.
                </p>
                <p>
                  &bull; Kịch bản tránh <b className="text-ink">5% dự phòng Nhóm 2</b> nếu được duyệt (NĐ 86/2024, giả định chưa khấu trừ TSĐB); duy trì kênh nộp đơn giấy tại quầy.
                </p>
              </>
            )}
            {needsManualFallbackNote && (
              <p className="text-[#FCD34D]">
                {lang === 'en'
                  ? '• Note: This commune did not hit automatic R1/R2/R3 thresholds — recorded under exception / safety-net route.'
                  : '• Lưu ý: Xã này chưa chạm ngưỡng R1/R2/R3 tự động trong dữ liệu sự kiện — ghi nhận theo diện lưới an toàn / chờ cán bộ tín dụng đối chiếu.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-lineStrong bg-canvas/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-[6px] border border-lineStrong bg-panel px-4 text-[12.5px] font-medium text-inkMuted transition-colors hover:border-inkDim hover:bg-panelAlt hover:text-ink"
          >
            {lang === 'en' ? 'Cancel' : 'Hủy bỏ'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#CDECD7] px-4 text-[12.5px] font-semibold text-[#0E1F1A] transition-colors hover:bg-[#D8F1E0]"
          >
            {isRegional ? (
              <Send className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
            )}
            <span>
              {isRegional
                ? lang === 'en'
                  ? 'Log Regional Requests'
                  : 'Ghi nhận gửi toàn vùng'
                : lang === 'en'
                ? 'Log Request for Review'
                : 'Ghi nhận đề nghị chờ duyệt'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


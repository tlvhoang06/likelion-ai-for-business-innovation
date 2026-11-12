import { X } from 'lucide-react';
import type { CommuneYagiStatus, Lang } from '../types/yagi';
import { computeValidationMetrics, formatNum, formatPct } from '../utils/yagiLogic';

interface VerificationModalProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  communes: CommuneYagiStatus[];
}

export function VerificationModal({ lang, open, onClose, communes }: VerificationModalProps) {
  if (!open) return null;
  const m = computeValidationMetrics(communes);

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        data-tour="legal-modal"
        className="max-h-[88vh] w-full max-w-[780px] overflow-y-auto rounded-[4px] border border-lineStrong bg-panel text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              {lang === 'en'
                ? 'Appendix A — Typhoon Yagi Empirical Validation & Legal Basis'
                : 'Phụ lục A — Kiểm chứng thực nghiệm Bão Yagi (9/2024) & Cơ sở pháp lý'}
            </h2>
            <p className="mt-0.5 text-[12px] text-inkMuted">
              {lang === 'en'
                ? 'Direct benchmark across 2,895 GADM v4.1 communes vs. UNOSAT 3966 flood extent & 11 NCHMF river gauges'
                : 'Đối chiếu trực tiếp 2.895 xã GADM v4.1 với ảnh ngập vệ tinh UNOSAT 3966 và 11 trạm thủy văn Bắc Bộ'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-line text-inkMuted hover:bg-panelAlt hover:text-ink"
            aria-label={lang === 'en' ? 'Close' : 'Đóng'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 text-[13px]">
          {/* UNOSAT Validation Summary */}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              {lang === 'en'
                ? '1. Parametric Triggers (R1, R3) vs. UNOSAT 3966 Ground Truth'
                : '1. Đối chiếu tín hiệu kích hoạt (R1, R3) với đáp án ngập UNOSAT 3966'}
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-[3px] border border-line bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'UNOSAT Benchmark' : 'Xã chấm được (UNOSAT)'}
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatNum(m.classifiableCount, lang)} / {formatNum(m.total, lang)}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.outsideUnosat, lang)}{' '}
                  {lang === 'en' ? 'outside delta scan' : 'xã ngoài ĐBSH'}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Flooded Communes (≥5%)' : 'Xã ngập thực tế (≥5%)'}
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatNum(m.floodedCount, lang)}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.dryCount, lang)} {lang === 'en' ? 'below 5%' : 'xã dưới 5%'}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Wind R3 Recall (R50)' : 'Recall gió R3 (R50)'}
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatPct(m.r3R50Recall, lang, 1)}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.r3R50Tp, lang)}/{formatNum(m.floodedCount, lang)}{' '}
                  {lang === 'en' ? 'communes' : 'xã'} · Prec {formatPct(m.r3R50Precision, lang, 1)}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Rain R1 Recall (Art.44)' : 'Recall mưa R1 (Đ.44)'}
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatPct(m.r1Recall, lang, 1)}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.r1Tp, lang)}/{formatNum(m.floodedCount, lang)}{' '}
                  {lang === 'en' ? 'communes' : 'xã'} · Prec {formatPct(m.r1Precision, lang, 1)}
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] text-inkMuted">
              {lang === 'en'
                ? 'Note: rain rule R1 alone catches 33.8% of flooded communes and misses downstream floods below 200mm (e.g. Gia Thuy, 76.1% flooded), which AI & Exception Review surface.'
                : 'Lưu ý thực nghiệm: đo mưa R1 đơn lẻ đạt độ phủ 33,8%, dễ sót xã ngập lũ dồn dù mưa <200mm (như Gia Thủy ngập 76,1%) — được bù bởi AI lọc ngoại lệ.'}
            </p>
          </div>

          {/* Break-even Economics */}
          <div className="rounded-[4px] border border-line bg-canvas p-3.5">
            <h3 className="mb-1.5 text-[13px] font-semibold text-ink">
              {lang === 'en'
                ? '2. Unit Economics (Retaining Group 1 Loans)'
                : '2. Mô hình kinh tế (Giữ Nhóm nợ 1)'}
            </h3>
            <p className="text-[12.5px] text-inkMuted">
              {lang === 'en' ? (
                <>
                  At an average <b className="text-ink">290M VND/loan</b>, shifting to Group 2 after 10 days requires{' '}
                  <b className="text-ink">5% provision (~14.5M VND)</b> under Decree 86/2024. Against 20,000 VND/loan/yr monitoring cost, banks{' '}
                  <b className="text-ink">break even saving 1 in 725 loans</b>.
                </>
              ) : (
                <>
                  Với khoản vay bình quân <b className="text-ink">290 tr/khoản</b>, nhảy sang Nhóm 2 sau 10 ngày phải trích{' '}
                  <b className="text-ink">5% dự phòng (~14,5 tr/khoản)</b> theo NĐ 86/2024. So với phí theo dõi 20.000 đ/khoản/năm, ngân hàng{' '}
                  <b className="text-ink">hòa vốn khi giữ được 1/725 khoản vay</b>.
                </>
              )}
            </p>
          </div>

          {/* Regulatory Compliance */}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              {lang === 'en'
                ? '3. Regulatory Alignment & Audited Data Boundaries'
                : '3. Khung pháp lý & giới hạn dữ liệu đã kiểm toán'}
            </h3>
            <div className="overflow-x-auto rounded-[3px] border border-line">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-canvas text-inkDim">
                  <tr>
                    <th className="border-b border-line px-3 py-2 font-medium">
                      {lang === 'en' ? 'Regulation / Source' : 'Văn bản / Nguồn'}
                    </th>
                    <th className="border-b border-line px-3 py-2 font-medium">
                      {lang === 'en'
                        ? 'Applied Constraint & Governance'
                        : 'Quy định & Ràng buộc kỹ thuật áp dụng'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-inkMuted">
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">NĐ 55/2015 &amp; TT 29/2025</td>
                    <td className="px-3 py-2">
                      {lang === 'en'
                        ? 'Decree 55/2015 (amended by Dec. 156/2025) & Cir. 29/2025/TT-NHNN (eff. 15 Nov 2025, replacing TT 10/2015, 25/2018): agricultural loans stay in Debt Group 1 if requested while current or ≤10 days overdue → motivating 1-tap consent + paper backup.'
                        : 'NĐ 55/2015/NĐ-CP (sửa bởi NĐ 156/2025) & TT 29/2025/TT-NHNN (hiệu lực 15/11/2025, thay TT 10/2015, 25/2018): giữ Nhóm nợ 1 cho vay nông nghiệp nếu có đề nghị khi trong hạn hoặc quá hạn ≤10 ngày → thúc đẩy xác nhận 1-Chạm + kênh giấy.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">TT 53/2024 &amp; NĐ 86/2024</td>
                    <td className="px-3 py-2">
                      {lang === 'en'
                        ? 'Cir. 53/2024/TT-NHNN took 88 days after Yagi to guide non-agricultural retention; missing that window shifts loans to Group 2 (5% provision) or Group 3 (20%) under Dec. 86/2024.'
                        : 'TT 53/2024/TT-NHNN mất 88 ngày sau bão Yagi mới cho phép giữ nhóm nợ ngoài nông nghiệp; trễ nhịp chuyển nhóm phải trích lập dự phòng 5% (Nhóm 2) hoặc 20% (Nhóm 3) theo NĐ 86/2024.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">QĐ 18/2021 (Đ.44)</td>
                    <td className="px-3 py-2">
                      {lang === 'en'
                        ? 'Level-2 disaster threshold for extreme rain (>200mm/24h or ≥3 consecutive days ≥100mm/day) → standardized R1 across 1,169 communes.'
                        : 'Ngưỡng rủi ro thiên tai cấp độ 2+ cho mưa lớn (>200mm/24h hoặc ≥3 ngày liên tiếp ≥100mm/ngày) → chuẩn hóa quy tắc R1 trên 1.169 xã.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">QĐ 05/2020/QĐ-TTg</td>
                    <td className="px-3 py-2">
                      {lang === 'en'
                        ? 'Flood Alarm Level 3 across 11 NCHMF hydrology stations (10 above AL3; Hanoi gauge 11.30m was 0.20m below AL3). Kept at station level until gauge-to-GID_3 crosswalk exists.'
                        : 'Mốc báo động lũ cấp 3 (BĐ3) tại 11 trạm thủy văn Bắc Bộ (10 trạm vượt BĐ3, trạm Hà Nội 11,30m dưới BĐ3 0,20m). Giữ R2 ở cấp trạm cho đến khi có crosswalk trạm–GID_3 xã.'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">NĐ 346/2026 &amp; TT 64/2024</td>
                    <td className="px-3 py-2">
                      {lang === 'en'
                        ? 'Banking Open API standard (REST/OAuth 2.0) feeding parametric agri-insurance: 15-business-day payout SLA, minimum 5-year audit retention.'
                        : 'Chuẩn hóa Open API ngành ngân hàng (REST/OAuth 2.0) cung cấp tín hiệu cho bảo hiểm chỉ số nông nghiệp: chi trả trong 15 ngày làm việc, lưu nhật ký kiểm toán tối thiểu 5 năm.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


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
                ? '1. Two-Stage Empirical Benchmark vs. UNOSAT 3966 (2,540 classifiable; 355 out-of-scan preserved)'
                : '1. Kiểm chứng thực nghiệm 2 tầng đối chiếu UNOSAT 3966 (2.540 xã chấm được; giữ 355 xã ngoài quét)'}
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-[3px] border border-line bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'UNOSAT Benchmark' : 'Đáp án UNOSAT 3966'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-ink">
                  {formatNum(m.classifiableCount, lang)} / {formatNum(m.total, lang)}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.floodedCount, lang)} {lang === 'en' ? 'flooded ≥5%' : 'ngập ≥5%'} · {formatNum(m.outsideUnosat, lang)} {lang === 'en' ? 'Unknown' : 'chưa biết'}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Stage 1 · Early Alert (R1|R2|R3 R50)' : 'Tầng 1 · Cảnh báo sớm (R1|R2|R3)'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[#8ACBB5]">
                  {formatPct(m.r50AllRecall, lang, 2)} Rec · {formatPct(m.r50AllPrecision, lang, 2)} Prec
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.r50AllTotal, lang)}/2.895 · {formatNum(m.r50AllTp, lang)} TP, {formatNum(m.r50AllFp, lang)} FP, {formatNum(m.r50AllFn, lang)} FN
                </div>
              </div>
              <div className="rounded-[5px] border border-[#98c127]/40 bg-canvas p-2.5">
                <div className="text-[11px] text-[#98c127]">
                  {lang === 'en' ? 'Stage 2 · Post-Event ML Confirm' : 'Tầng 2 · Hậu kiểm ML Tầng 2 (CV)'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[#CDECD7]">
                  {formatPct(m.s2MlRecall, lang, 2)} Rec · {formatPct(m.s2MlPrecision, lang, 2)} Prec
                </div>
                <div className="text-[11px] text-inkMuted">
                  {lang === 'en'
                    ? `HistGradient CV (S1+HAND) · Watch ${m.watchlistFloodCaughtByMl}/321 · FN ${m.earlyFnRecoveredByMlCount}/63`
                    : `HistGradient CV (S1+HAND) · Watch ${m.watchlistFloodCaughtByMl}/321 · Sót ${m.earlyFnRecoveredByMlCount}/63`}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Priority Track · R1 | R2' : 'Luồng Ưu tiên · R1 | R2'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-ink">
                  {formatNum(m.r1OrR2Total, lang)} {lang === 'en' ? 'communes' : 'xã'}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatPct(m.r1OrR2Recall, lang, 2)} Rec · {formatPct(m.r1OrR2Precision, lang, 2)} Prec ({formatNum(m.threeRuleTotal, lang)} 3-rule: {formatPct(m.threeRuleFloodPct, lang, 2)})
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'R2 River Stage (>BĐ3 Mapped)' : 'Lũ sông R2 (>BĐ3 đã nối xã)'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[#8fd7d7]">
                  {formatNum(m.r2Total, lang)} {lang === 'en' ? 'communes' : 'xã'}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatPct(m.r2Precision, lang, 2)} Prec ({formatNum(m.r2Tp, lang)} TP) · {formatNum(m.r2Total ? 109 : 0, lang)} {lang === 'en' ? 'HN <AL3' : 'HN <BĐ3'}
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">
                  {lang === 'en' ? 'Watchlist Track · R3 R50 only' : 'Luồng Theo dõi · Chỉ gió R3'}
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[#ff8ca1]">
                  {formatNum(m.r3OnlyWatchlistTotal, lang)} {lang === 'en' ? 'communes' : 'xã'}
                </div>
                <div className="text-[11px] text-inkMuted">
                  {lang === 'en'
                    ? 'Wind alone needs flood confirmation'
                    : 'Gió mạnh cần hậu kiểm trước 1-Chạm'}
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] text-inkMuted">
              {lang === 'en'
                ? 'Methodological separation: Stage 1 early triggers (R1|R2|R3_R50: 27.35% Prec / 91.23% Rec, -1.50h median lag invariant over Yen Bai [19:00–21:47] 08/09) put R1|R2 in Priority Review and R3-only in Watchlist. Stage 2 post-event Sentinel-1 CV (63.46% Prec / 79.11% Rec, 568 TP / 327 FP / 150 FN / 1,495 TN; 61.93%/81.34% at 88% target) is a post-event confirmation gate — NEVER early-alert accuracy.'
                : 'Tách bạch 2 tầng: Tầng 1 cảnh báo sớm (R1|R2|R3_R50: Precision 27,35% / Recall 91,23%, trung vị -1,50h bất biến quanh khung Yên Bái 19:00–21:47 08/09) xếp 1.338 xã R1|R2 vào Rà soát Ưu tiên và 1.354 xã chỉ gió R3 vào Watchlist. Tầng 2 hậu kiểm Sentinel-1+R2+R1+HAND (63,46% Prec / 79,11% Rec; 568 TP / 327 FP / 150 FN / 1.495 TN) dùng để xác nhận thiệt hại trước khi gửi 1-Chạm — KHÔNG phải độ chính xác cảnh báo sớm.'}
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
                  At an average <b className="text-ink">290M VND/loan</b>, migrating to Group 2 (special mention) at &ge;10 days overdue requires{' '}
                  <b className="text-ink">5% specific provision (~14.5M VND potential)</b> under Decree 86/2024. Against 20,000 VND/loan/yr monitoring cost, banks{' '}
                  <b className="text-ink">break even saving 1 in 725 loans</b>.
                </>
              ) : (
                <>
                  Với khoản vay bình quân <b className="text-ink">290 tr/khoản</b>, chuyển sang Nhóm 2 (nợ cần chú ý) từ 10 ngày quá hạn phải trích{' '}
                  <b className="text-ink">5% dự phòng cụ thể (tiềm năng ~14,5 tr/khoản)</b> theo NĐ 86/2024. So với phí theo dõi 20.000 đ/khoản/năm, ngân hàng{' '}
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
                        ? 'Flood Alarm Level 3 across 11 NCHMF stations mapped to 2,895 communes (6 Northern river basins, HAND ≤10m confluence tie-break): 215 communes triggered across 5 AL3 gauges (61.62% Precision), 109 Ha Noi communes mapped below AL3 (11.30m < 11.50m), 0 unresolved confluences; Yen Bai bounded [19:00–21:47] 08/09.'
                        : 'Mốc BĐ3 tại 11 trạm thủy văn đã nối hoàn chỉnh 2.895 xã (6 tuyến sông Bắc Bộ, quy tắc HAND ≤10m ngã ba sông): 215 xã >BĐ3 thuộc 5 trạm (Precision 61,62%), 109 xã vùng trạm Hà Nội <BĐ3 (11,30m < 11,50m), 0 ca mơ hồ; Yên Bái giới hạn khung 19:00–21:47 ngày 08/09.'}
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


import { X } from 'lucide-react';
import type { CommuneYagiStatus } from '../types/yagi';
import { computeValidationMetrics, formatNum } from '../utils/yagiLogic';

interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
  communes: CommuneYagiStatus[];
}

export function VerificationModal({ open, onClose, communes }: VerificationModalProps) {
  if (!open) return null;
  const m = computeValidationMetrics(communes);

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[780px] overflow-y-auto rounded-[4px] border border-lineStrong bg-panel text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Phụ lục A — Kiểm chứng thực nghiệm Bão Yagi (9/2024) &amp; Cơ sở pháp lý
            </h2>
            <p className="mt-0.5 text-[12px] text-inkMuted">
              Đối chiếu trực tiếp 2.895 xã GADM v4.1 với ảnh ngập vệ tinh UNOSAT 3966 và 11 trạm thủy văn B5
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-line text-inkMuted hover:bg-panelAlt hover:text-ink"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5 text-[13px]">
          {/* UNOSAT Validation Summary */}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              1. Đối chiếu tín hiệu kích hoạt (R1, R3) với đáp án ngập UNOSAT 3966
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-[3px] border border-line bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">Xã chấm được (UNOSAT)</div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatNum(m.classifiableCount)} / {formatNum(m.total)}
                </div>
                <div className="text-[11px] text-inkMuted">{formatNum(m.outsideUnosat)} xã ngoài ĐBSH</div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">Xã ngập thực tế (&ge;5%)</div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {formatNum(m.floodedCount)}
                </div>
                <div className="text-[11px] text-inkMuted">{formatNum(m.dryCount)} xã dưới 5%</div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">Recall gió R3 (R50)</div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {m.r3R50Recall.toFixed(1)}%
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.r3R50Tp)}/{formatNum(m.floodedCount)} xã · Prec {m.r3R50Precision.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-[5px] border border-white/[0.07] bg-canvas p-2.5">
                <div className="text-[11px] text-inkDim">Recall mưa R1 (Đ.44)</div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-ink">
                  {m.r1Recall.toFixed(1)}%
                </div>
                <div className="text-[11px] text-inkMuted">
                  {formatNum(m.r1Tp)}/{formatNum(m.floodedCount)} xã · Prec {m.r1Precision.toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] text-inkMuted">
              Nhận xét trung thực về độ chính xác: tín hiệu mưa R1 đạt độ phủ 33,8% và sót các xã ngập do lũ sông dồn hạ du dù mưa tại chỗ dưới 200mm (ví dụ xã Gia Thủy, Ninh Bình ngập 76,1%). Đây là lý do Kịp Thời phải kết hợp đa lớp (R3 + R2 trạm sông B5 + Sentinel-1) và mở màn hình duyệt ca ngoại lệ cho cán bộ tín dụng (W3).
            </p>
          </div>

          {/* Break-even Economics */}
          <div className="rounded-[3px] border border-line bg-canvas p-3.5">
            <h3 className="mb-1.5 text-[13px] font-semibold text-ink">
              2. Mô hình kinh tế đơn vị (Giá trị giữ Nhóm nợ 1)
            </h3>
            <p className="text-[12.5px] text-inkMuted">
              Với dư nợ vay nông nghiệp-nông thôn bình quân giả định <b className="text-ink">290 triệu đ/khoản vay</b>, nếu quá hạn 10 ngày theo Thông tư 29/2025 dẫn tới nhảy lên Nhóm nợ 2, ngân hàng phải trích lập dự phòng <b className="text-ink">5% theo Nghị định 86/2024 (~14,5 triệu đ/khoản)</b>. Với phí vận hành API dự kiến 20.000 đ/khoản/năm, ngân hàng <b className="text-ink">hòa vốn khi giữ lại được 1 trên 725 khoản vay</b> khỏi bị nhảy nhóm.
            </p>
          </div>

          {/* Regulatory Compliance */}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              3. Khung pháp lý &amp; giới hạn dữ liệu đã kiểm toán
            </h3>
            <div className="overflow-x-auto rounded-[3px] border border-line">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-canvas text-inkDim">
                  <tr>
                    <th className="border-b border-line px-3 py-2 font-medium">Văn bản / Nguồn</th>
                    <th className="border-b border-line px-3 py-2 font-medium">Quy định &amp; Ràng buộc kỹ thuật áp dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-inkMuted">
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">TT 29/2025/TT-NHNN</td>
                    <td className="px-3 py-2">Hiệu lực 15/11/2025 (thay TT 10/2015, 25/2018). Yêu cầu khoản vay trong hạn hoặc quá hạn tối đa 10 ngày và có đề nghị từ khách hàng → thúc đẩy xác nhận 1-Chạm + kênh giấy dự phòng.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">QĐ 18/2021 (Đ.44)</td>
                    <td className="px-3 py-2">Ngưỡng rủi ro thiên tai cấp độ 2+ cho mưa lớn (&gt;200mm/24h hoặc &ge;3 ngày liên tiếp &ge;100mm/ngày) → chuẩn hóa quy tắc R1 trên 1.169 xã.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">QĐ 05/2020/QĐ-TTg</td>
                    <td className="px-3 py-2">Mốc báo động lũ cấp 3 (BĐ3) tại 11 trạm thủy văn B5 (10 trạm vượt BĐ3, trạm Hà Nội 11,30m dưới BĐ3 0,20m). Giữ R2 ở cấp trạm cho đến khi có crosswalk trạm–GID_3 xã.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-ink">NĐ 346/2026 &amp; TT 64/2024</td>
                    <td className="px-3 py-2">Chuẩn hóa Open API ngành ngân hàng (REST/OAuth 2.0) cung cấp tín hiệu cho bảo hiểm chỉ số nông nghiệp: chi trả trong 15 ngày làm việc, lưu nhật ký kiểm toán tối thiểu 5 năm.</td>
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


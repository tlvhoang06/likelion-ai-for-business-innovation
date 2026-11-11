# Design Spec — KỊP THỜI (ResiLend) MVP

**Bản gốc bám sát:** `BÀI CHÍNH.txt` (Mục 3.1, 3.2, 4.3), `Bản phác thảo V1.txt` (12 bước), `PHÂN CÔNG.txt` (W3, B5–B7), `EK15 – Kết quả việc của Nhân (7–8 11).docx` (B3, R2), và dữ liệu kiểm chứng bão Yagi thực tế (`master_2895_communes_with_R1_R3.csv`, `B6_UNOSAT_...`, `B5_R2_station_peaks.csv`).

## 1. Bản chất & Ngữ cảnh sử dụng
- **Đối tượng dùng chính:** Cán bộ rủi ro/tín dụng ngân hàng nông nghiệp (Agribank, QTDND), Cán bộ UBND xã, Chuyên viên công ty bảo hiểm chỉ số (NĐ 346/2026), Cơ quan giám sát (NHNN).
- **Tính chất giao diện:** Nghiệp vụ tài chính – công nghệ chính quy (**không màu mè, không gradient trang trí, không emoji, không bịa số liệu**). Đọc hiểu cấu trúc hệ thống trong 3 giây đầu.
- **Kích thước & Đầu ra:** Prototype HTML tương tác trực tiếp (phase chọn hướng thiết kế: `1440×900` desktop + responsive mobile `390×844`), sau đó đóng gói thành Vite + React + Tailwind + Leaflet SPA dùng 100% dữ liệu tĩnh 2.895 xã.

## 2. Form Năm Câu Hỏi (`workflow.md`)
- **Vai trò tự sự (Narrative role):** Bảng điều hành tác nghiệp liên tổ chức (Inter-institutional Operations Console) chứng minh luồng khép kín từ tín hiệu thiên tai -> xác nhận xã -> cơ cấu nợ TT 29/2025 -> API bảo hiểm NĐ 346/2026.
- **Khoảng cách xem:** 60–90cm (màn hình làm việc văn phòng ngân hàng / thuyết trình ban giám khảo); cỡ chữ UI chính 14px, bảng số liệu 13px (`tabular-nums`), nhãn tối thiểu 12px.
- **Nhiệt độ thị giác:** Điềm tĩnh, chính xác, khách quan kiểu sổ cái ngân hàng và bản đồ thủy văn; màu nhấn chỉ xuất hiện để mã hóa cấp độ rủi ro kích hoạt và trạng thái duyệt.
- **Ước lượng dung lượng:** Tối đa 4 khu vực thông tin đồng thời trên 1 màn hình desktop (Thanh định danh + Vùng bản đồ 2.895 xã + Bảng tổng hợp/Danh mục khoản vay & ngoại lệ + Bộ mô phỏng xác nhận 1-Chạm / UBND Xã / API).
- **Visual Motif (Form từ nội dung riêng có):** Đường đồng mức ranh giới **2.895 xã GADM v4.1 vùng Bắc Bộ** kết hợp **trục thời gian đổ bộ bão Yagi (05/09 → 14/09/2024)** và **đồng hồ cửa sổ pháp lý 10 ngày (TT 29/2025)**.

## 3. Nội dung & Dữ liệu bắt buộc (100% Trung thực với Drive)
- **Thống kê thực tế Bão Yagi (12 tỉnh, 2.895 xã):**
  - R1 (Mưa >200mm/24h hoặc ≥3 ngày ≥100mm theo Đ.44 QĐ 18/2021): **1.169 xã** (`R1_primary_triggered_communes.csv`).
  - R3 (Gió bão R50 từ IBTrACS): **2.622 xã** (90,6%); biến thể độ nhạy R64: **1.879 xã** (64,9%).
  - R2 (Mực nước trạm thủy văn theo QĐ 05/2020): **11 trạm quan trắc** (`B5_R2_station_peaks.csv`, 10/11 trạm vượt BĐ3, trạm Hà Nội 11,30m dưới BĐ3 0,20m). **Lưu ý trung thực:** chưa có crosswalk trạm → `GID_3` xã và thiếu giờ cắt ngưỡng BĐ3 đầu tiên, nên cấp xã để `R2 = Trống (Chờ nối trạm)`.
  - Đáp án kiểm chứng ngập **UNOSAT 3966 (12–13/09/2024)**: **2.540 xã chấm được** (**718 xã ngập ≥5%**, 1.822 xã <5%); **355 xã** ngoài vùng quét ĐBSH. (Sentinel-1 proxy: 2.774 phủ ≥95%, 101 xã nhãn `1`).
- **4 Nghiệp vụ tương tác bắt buộc:**
  1. Bản đồ 2.895 xã + Bộ lọc lớp (`R1 Mưa`, `R2 Bảng 11 trạm`, `R3 Gió R50/R64`, `UNOSAT Ngập`, `Sentinel-1`) + Thanh trượt thời gian 05/09–14/09.
  2. Thẻ chi tiết xã + **Báo cáo thiệt hại viễn thám cấp xã** cho nút **UBND xã ký xác nhận một lần cho cả xã**.
  3. **Mô-đun Giãn nợ Ngân hàng (TT 29/2025 + NĐ 86/2024)**: danh mục khoản vay mô phỏng (290 triệu đ/khoản, hòa vốn 1/725), **Xác nhận 1-Chạm Hộ vay** (App/SMS), **Màn hình duyệt ca ngoại lệ cho cán bộ tín dụng (`W3`)**, giữ **Kênh thủ công** làm lưới an toàn.
  4. **Open API (TT 64/2024) & Báo cáo**: xem JSON payload cho công ty bảo hiểm chỉ số (NĐ 346/2026, lưu nhật ký 5 năm) + bảng báo cáo NHNN theo quý.


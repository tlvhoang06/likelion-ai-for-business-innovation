# Ứng dụng AI trong ResiLend

> **Nguyên tắc thiết kế cốt lõi:** *"AI phân tích & điều phối không gian — Quy tắc tất định xử lý kích hoạt & hạch toán — Con người giữ quyền phê duyệt tín dụng."*

Tài liệu này khái quát vai trò thực tế của AI trong hệ thống **ResiLend**, đồng thời phân tách rõ ranh giới giữa phần dùng **Mô hình ngôn ngữ lớn (LLM)** và phần vận hành bằng **quy tắc nghiệp vụ cố định** để đảm bảo tính minh bạch và khả năng giải trình kiểm toán ngân hàng.

---

## 1. Kiến trúc Hybrid AI 3 lớp (Tầng 1 Tất định -> Tầng 2 ML Hậu kiểm + Gemini Copilot -> Pha 2)

ResiLend kết hợp 3 lớp bổ trợ chặt chẽ mà **không** dùng hộp đen thay thế quy trình tín dụng ngân hàng:

1. **Tầng 1 — Quy tắc pháp lý tất định + Điểm ưu tiên 0–100 (Cảnh báo sớm):**
   - `R1 | R2 | R3_R50` chia rõ **1.338 xã Rà soát Ưu tiên (`R1|R2`)** và **1.354 xã Watchlist (`chỉ gió R3`)** ngay khi bão đổ bộ (Recall UNOSAT 91,23%, trung vị `-1,50h`), kết hợp thang heuristic minh bạch `0–100` để xếp hạng các xã ngoài vùng phủ vệ tinh.
2. **Tầng 2A — Học máy hậu kiểm sau bão (`HistGradientBoostingClassifier`, CV 4-fold theo tỉnh):**
   - Hợp nhất `Sentinel-1 (08–21/09)` + `R2` + `R1` + địa hình trũng `HAND ≤ 10m` trên `2.540` xã chấm được (**63,46% Precision / 79,11% Recall**), giúp bắt đúng **256/321 (79,8%) xã ngập trong Watchlist R3** và khôi phục **52/63 (82,5%) ca bị bộ luật Tầng 1 bỏ sót** (tập trung ở Phú Thọ 59, Thái Nguyên 4).
   - Toàn bộ **355 xã ngoài vùng UNOSAT** giữ nguyên `null` (*Chưa biết / ngoài vùng quét*), tuyệt đối không nội suy về `0%`.
3. **Tầng 2B — Trợ lý Điều phối Google Gemini Function Calling (Zero-PII):**
   - **`query_communes`:** Lọc trực tiếp `2.895` xã theo `workflow_track`, xác suất ML tầng 2 (`s2_ml_prob`), `HAND ≤ 10m`, ngoại lệ đo mưa sót và vùng ngoài quét UNOSAT.
   - **`plan_branch_triage`:** Tối ưu phân công cán bộ theo giới hạn ngày công/giờ (bao gồm cả các điểm Watchlist & vùng trũng được ML hậu kiểm xác nhận) để giữ nhiều dư nợ Nhóm 1 nhất (tránh dự phòng `5%`).
   - **`get_river_stations`:** Tra cứu mực nước đỉnh lũ và mốc báo động `BĐ3` theo thời gian thực nghiệm trên 11 trạm thủy văn `R2`.
   - **`dispatch_ui_action` & Quy trình soạn hồ sơ (`Dossier drafting workflow`):** Điều khiển bản đồ Leaflet (tô sáng, phóng tới cụm xã, chuyển mốc ngày, bật lớp `Sentinel-1`/`UNOSAT`) và soạn nháp **Tờ trình ngoại lệ / Đề xuất biên bản UBND cấp xã** (phương án đề xuất theo xã, tùy chấp thuận của ngân hàng & địa phương) kèm số liệu mưa, gió, `HAND ≤ 10m`, và xác suất hậu kiểm ML Tầng 2.

---

## 2. Cơ chế an toàn, kiểm soát và chống "AI-washing"

- **Tách bạch 2 tầng nghiêm ngặt & giới hạn SLA `<72h`:** Tầng 2 ML (`63,46% / 79,11%`, mã tái lập CV và dự đoán từng xã công khai tại [`submission_data/06_SUPPLEMENTARY_POST_EVENT/`](submission_data/06_SUPPLEMENTARY_POST_EVENT/)) chạy trên ảnh Sentinel-1 hậu bão (`08–20/09`, trước `21/09`) nên **chỉ dùng cho hậu kiểm xác nhận thiệt hại**, không đánh tráo sang độ chính xác cảnh báo sớm Tầng 1 (`27,35% / 91,23%`) và chỉ mới kiểm thử chéo trong 1 mùa bão Yagi. Vì cửa sổ ảnh hậu kiểm kéo dài tới `20/09`, mục tiêu xử lý `<72h` được giữ là **mục tiêu thí điểm (pilot SLA target)** chứ chưa được chứng minh khép kín trong dữ liệu Yagi hồi cứu.
- **Bảo vệ dữ liệu cá nhân (Zero-PII):** Hệ thống chỉ gửi mã hành chính cấp xã (`GID_3`), tên địa bàn và thông số công khai tới API Gemini; danh tính hộ vay và hợp đồng tín dụng nằm hoàn toàn tại ngân hàng.
- **Khóa phạm vi nghiệp vụ & quyền quyết định con người:** AI tự động từ chối truy vấn ngoài phạm vi ResiLend, giữ nguyên điểm quy tắc tường minh khi rà ngoại lệ, và **con người (cán bộ tín dụng + ngân hàng + UBND xã theo chấp thuận đối tác) giữ 100% quyền phê duyệt cuối cùng**.

---

## 3. Định hướng Pha 2 (2027–2028)

Khi triển khai thí điểm nhiều mùa bão cùng ngân hàng và bảo hiểm đối tác:
1. **Hiệu chỉnh ML đa mùa bão & thủy văn theo giờ:** Mở rộng từ CV nội bộ Yagi sang kiểm định chéo nhiều cơn bão bằng dữ liệu vỡ nợ Nhóm 2+ thực tế, kết hợp dự báo lưu lượng `GloFAS` và chuỗi mực nước theo giờ từ các trạm `R2`.
2. **Thẩm định hồ sơ đa phương thức (Multimodal Intake):** Hỗ trợ OCR đơn giấy tại quầy và đối chiếu ảnh chụp hiện trường của hộ vay với lớp mưa – vệ tinh tại đúng mã xã `GID_3`.

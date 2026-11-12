# Feedback Tổng Hợp Cho `slide v1.html` (Gửi Khang)

> **Mục tiêu chỉnh sửa:** Đồng bộ `slide v1.html` (15 slides) với **đúng format & rubric cuộc thi AI FOR BUSINESS INNOVATION (`AI4Biz_Tendoi_2026`, deadline 23:59 13/11/2026)**, đồng thời khớp 100% với **Web MVP `ResiLend`** đã hoàn thiện (để ăn trọn **điểm cộng Prototype/MVP** và trọng số **30% Idea & AI Fit**).
>
> **Lưu ý thương hiệu:** Dùng thống nhất tên **`ResiLend`** (không dùng song song `KỊP THỜI`).

---

## 1. Đánh giá nhanh theo Format & Tiêu chí Cuộc thi

- **Định dạng & Độ dài:** `15 slides`, tiếng Anh — **đạt trần tối đa 15 slides** của BTC (xuất sang **PDF** trước khi nộp).
- **Điểm mạnh sẵn có của bản `v1`:**
  - Kỷ luật khoa học cực tốt theo đúng note `3.4-Cong-nghe`: không thổi phồng `<72 giờ` hay `giảm 90% công sức` thành kết quả đã chứng minh; luôn khẳng định *Con người/Ngân hàng giữ quyền duyệt cuối*.
  - Luồng trình bày tài chính – ngân hàng mạch lạc, bài toán kinh tế `1/725` rõ ràng.
- **5 điểm yếu chí mạng nếu giữ nguyên bản `v1` đi thi AI4Biz:**
  1. **Mờ nhạt vai trò AI thật (ảnh hưởng trực tiếp 30% điểm Idea & Creativity):** Slide 6 mới ghi `"Future machine learning"` và `"Workflow automation"`, chưa thể hiện **AI Operations Copilot (Gemini Tool-Calling Agent)** đang chạy thật trên Web MVP. BGK AI4Biz sẽ dễ bắt lỗi *"AI chỉ là tương lai, hiện tại toàn rule cứng"*.
  2. **Tự hạ cấp MVP thật thành `"Mockup"` + `"commune centroids"` (mất điểm cộng Prototype/MVP):** Slide 8 đang ghi `12 provinces / commune centroids` và dán nhãn `Mockup` cho giao diện, trong khi Web App thật đã dựng được **ranh giới polygon đầy đủ của 2.895 xã**, tua timeline 10 ngày, lọc ngoại lệ và điều khiển bản đồ bằng AI.
  3. **Ví dụ xã trên Slide 8 ngược với dữ liệu thật khi demo live:** Slide 8 đặt `Vũ Xá` làm *"Area evidence awaiting review · In review"*, nhưng trong backtest Yagi trên Web App thì **`Vũ Xá` (`84.9% UNOSAT · R1+R3`)** kích hoạt cả Mưa & Gió (nhóm tự động 1-Chạm), còn **`Gia Thủy` (`76.1% UNOSAT · Mưa <200mm`)** và **`Nam Phương Tiến` (`43.9% UNOSAT · R3 gió, sót R1 mưa`)** mới là ca đại diện cho hàng đợi **Ngoại lệ / Area review**.
  4. **Slide 9 thiếu chứng cứ ngập vệ tinh mạnh nhất (`UNOSAT` & `Sentinel-1`):** Đầu slide có tag `Flood reference` nhưng phần số liệu chỉ mới đưa Gió (`2,622`), Mưa (`1,169`), Sông (`10/11`), bỏ trống hoàn toàn số lượng xã ngập từ `UNOSAT 3966` và `Sentinel-1`.
  5. **Slide 2, 10, 13 không nêu tên văn bản pháp lý Việt Nam:** Chỉ nói chung chung `"10 days overdue"`, `"5% Group 2"` mà không dẫn **`TT 29/2025/TT-NHNN`**, **`NĐ 55/2015` (sửa `NĐ 156/2025`)**, **`TT 53/2024`** (`88 ngày`), **`NĐ 86/2024`**, **`NĐ 346/2026`**, **`TT 64/2024`**.

---

## 2. Mapping 15 Slides hiện tại vào Cấu trúc Đề xuất của AI4Biz

Cấu trúc gợi ý của BTC gồm 10 mục cốt lõi; bản 15 slides của Khang map rất khớp và nên giữ nguyên nhịp 15 slides, chỉ gán rõ vai trò từng slide để BGK theo dõi dễ dàng:

| Slide hiện tại | Mục tương ứng trong Format BTC | Trạng thái cần làm |
| :--- | :--- | :--- |
| **Slide 1** | 1. Title | Sửa nhãn `Concept proposal` → `Working MVP`, chốt `ResiLend` |
| **Slide 2** | 2. Business Problem | Bổ sung mã `TT 29/2025`, `NĐ 55/2015`, `NĐ 86/2024` |
| **Slide 3** | 3. Target Business & Users | Giữ nguyên, rất rõ |
| **Slide 4** | 4. Business Insight | Bổ sung thẻ **`88 days` (`TT 53/2024`)** cạnh Agribank & `190T VND` |
| **Slide 5** | 5. Proposed Solution | Giữ nguyên, rõ cơ chế 1 tín hiệu – đa bên dùng chung |
| **Slide 6** | 6. **How AI Helps** *(Trọng tâm 30%)* | **Sửa lớn**: Bổ sung **Gemini Function-Calling Operations Copilot** đang chạy thật + tách rõ 3 tầng (Deterministic Rules / AI Copilot Today / Future ML) |
| **Slide 7** | 7. How It Works | Bổ sung nhẹ bước `Opt-in / 1-Tap Consent` gắn với hạn `10 ngày` (`TT 29/2025`) |
| **Slide 8** | 8. **Mockup / Demo** *(Điểm cộng MVP)* | **Sửa lớn**: Đổi `"commune centroids"` → `2,895 GADM polygons`, thay hình `Mockup` web bằng ảnh chụp thật từ Web App, sửa ví dụ `Vũ Xá` / `Gia Thủy` |
| **Slide 9** | 8b. Early Evidence / Backtest Proof | **Bổ sung số `UNOSAT 3966` (`2,540` / `718` / `355`) & `Sentinel-1 (101)`** + ca sót mưa `Gia Thủy (76.1%)` |
| **Slide 10** | 7b / Governance & AI Risk Safeguards | Bổ sung **`NĐ 346/2026`**, **`TT 64/2024`**, `5-year audit log`, chống AI hallucination |
| **Slide 11** | 9a. Feasibility & Business Model | Giữ nguyên cấu trúc; giữ rõ giả định thị trường |
| **Slide 12** | 9b. Business Value / Unit Economics | Giữ nguyên `1 in 725`, cực sắc nét |
| **Slide 13** | 10. Competitive Advantage & Ecosystem | Thêm **`Dec. 346/2026`** & **`Cir. 64/2024 Open API`** vào bảng so sánh |
| **Slide 14** | 9c. Implementation Feasibility & Pilot | Ghi rõ: **Đã có Interactive Web MVP (Yagi 2024)**; Pilot Q1–Q3/2027 nối `PostGIS/FastAPI` + Bank Core |
| **Slide 15** | Closing | Đồng bộ chữ `Working Web Prototype` thay cho chỉ `historical data pipeline` |

---

## 3. Chi tiết nội dung cần sửa theo từng Slide (Copy-ready English)

### Slide 1 — Title
- **Hiện tại:** Ghi `Concept proposal` ở góc trên/dưới.
- **Sửa thành:** Thay `"Concept proposal"` bằng **`"Working Web MVP · Yagi 2024 Backtest"`** (giữ tên app duy nhất **`ResiLend`**, bỏ tên khác nếu có).

### Slide 2 — The Problem (Business Problem)
- **Hiện tại:** Nói `"10 days overdue"` và `"5% Group 2 specific provision rate"` nhưng không nêu văn bản.
- **Bổ sung trực tiếp dưới 2 thẻ số:**
  - Dưới `10 days overdue`: `Per Cir. 29/2025/TT-NHNN & Dec. 55/2015 (amended Dec. 156/2025) for agricultural loans.`
  - Dưới `5% Group 2`: `Per Dec. 86/2024/NĐ-CP (5% Group 2, 20% Group 3 provision if restructuring misses the window).`

### Slide 4 — Why the Current Process Is Slow (Business Insight)
- **Hiện tại:** Có `Agribank ~12,000 → >28,000` và `Sector credit 116T → 190T VND`.
- **Thêm 1 thẻ metric / callout ngắn (hoặc footer note):**
  - **`88 days`** — *Time required after Typhoon Yagi to issue Cir. 53/2024/TT-NHNN for non-agricultural debt group retention.*
  - Nhấn mạnh: *Ad-hoc policy & paper workflows guarantee banks react after the 10-day window closes.*

### Slide 6 — How Analysis and AI Help *(CỰC KỲ QUAN TRỌNG CHO AI4Biz)*
- **Vấn đề hiện tại:** Chỉ nói `Geospatial rules` + `Future machine learning` + `Workflow automation` chung chung.
- **Thay bằng kiến trúc Hybrid 3 lớp minh bạch (giải thích đúng vì sao KHÔNG dùng black-box AI để tự ý duyệt vay, mà dùng AI đúng chỗ):**
  - **Layer 1 — Deterministic Trigger Engine (Live Backtest):**
    `Explicit hazard rules (R1 Rain >200mm, R3 Wind ≥50/64kt, R2 River ≥ AL3) + UNOSAT/Sentinel-1 radar masks identify affected communes with full auditability.`
  - **Layer 2 — AI Operations Copilot (Live in Web MVP · Zero-Training Gemini Agent):**
    `Function-calling LLM agent grounded strictly on the 2,895-commune dataset (no hallucinated scores):`
    - *Natural-language geospatial filtering* (`query_communes` — e.g., finding out-of-scan blind spots or missed floods).
    - *Constraint-based branch dispatch* (`plan_branch_triage` — grouping priority communes into actionable cluster schedules by officer headcount & hour budget, e.g., 3 officers / 48h).
    - *Automated dossier drafting* (pre-filling commune evidence summaries & UBND batch confirmation briefs).
  - **Layer 3 — Future ML Calibration (Phase 2):**
    `Refine local commune trigger thresholds once anonymized bank loss & repayment data are collected during pilot. Credit approval always remains with the bank.`

### Slide 8 — Demo / Prototype Experience *(CHỖ LỆCH LỚN SO VỚI APP)*
- **Sửa 3 điểm sai/cũ ngay trên Slide 8:**
  1. Đổi `"12 provinces / commune centroids"` → **`"12 provinces · 2,895 full GADM commune polygons (Live Web MVP)"`**.
  2. Thay phần UI `"Mockup"` bên trái (bản đồ & hàng đợi ngân hàng) bằng **ảnh chụp màn hình thật (screenshot) của Web App `ResiLend`**, chỉ giữ chữ **`Mockup`** cho khung **Borrower SMS** bên phải (vì SMS telco chưa nối thật).
  3. Chỉnh ví dụ 2 xã trong Bank Review Queue để khớp 100% với bản đồ khi BGK xem video demo:
     - **`Vũ Xá (Bắc Giang)`** — *84.9% UNOSAT flood · R1+R3 Auto-eligible (1-Tap queue).*
     - **`Gia Thủy (Ninh Bình)`** — *76.1% UNOSAT flood · Rain <200mm (Flagged in Exception Review).* *(Hoặc `Nam Phương Tiến: 43.9% flood · R3 Wind only, missed by R1 Rain`)*

### Slide 9 — Early Evidence / Yagi 2024 Backtest
- **Hiện tại:** Mới có `2,622 Wind (90.6%)`, `1,169 Rain (40.4%)`, `10/11 River gauges > AL3`.
- **Bổ sung thêm khối `Flood Reference` (từ `3.4-Cong-nghe` & App) ngay bên cạnh để lấp ô trống:**
  - **`UNOSAT 3966` (Satellite Flood Reference):** `2,540` classifiable communes (`718` flooded `≥5%`, `1,822` `<5%`) & `355` outside scan *(kept as Unknown, never forced to 0%)*.
  - **`Sentinel-1 SAR` (Auxiliary Radar):** `101` flood-flagged communes *(helps cover optical/scan blind spots such as Bạch Đằng)*.
  - **Key Backtest Insight:** `Rain rule alone (1,169 communes) misses severe flood pockets (e.g., Gia Thủy 76.1% flood with <200mm rain) and 10/11 river peaks lack commune crosswalks — proving why ResiLend pairs multi-signal rules with an Exception Review Queue & AI Copilot.`
  - *(Giữ nguyên dòng trung thực: `Trigger counts are not accuracy scores.`)*

### Slide 10 — Safeguards & AI Governance
- **Bổ sung các điểm giúp ăn điểm phần *"Xem xét tính bảo mật, độ tin cậy và rủi ro khi dùng AI"* trong đề AI4Biz:**
  - **Legal & Audit:** `Retains Debt Group 1 strictly under Cir. 29/2025 & Dec. 55/2015; maintains 5-year audit trail per Dec. 346/2026.`
  - **AI Reliability Guardrail:** `Gemini Copilot is tool-grounded (reads verified commune metrics only, zero-hallucination scope); heuristic exception scores rank review priority, never serve as uncalibrated ML approval.`
  - **Zero-PII Privacy:** `ResiLend holds GID_3 area signals only; borrower PII and loan records never leave the bank.`

### Slide 13 — Ecosystem & Competitive Advantage
- **Bổ sung vào cột `Reg / Tech Enabler` hoặc dòng `Parametric insurance / Shared infrastructure`:**
  - Gắn rõ **`Dec. 346/2026`** *(remote-sensing parametric agri-insurance, effective Oct 2026)* và **`Cir. 64/2024`** *(standardized Vietnam Banking Open API)* để chứng minh lợi thế đi trước về độ tương thích hạ tầng tại Việt Nam.

### Slide 14 & Slide 15 — Feasibility, Readiness & Video Demo Note
- **Slide 14:** Thêm hộp nhỏ **`Current Readiness vs. Pilot Build`**:
  - *Built & Demo-ready:* Interactive 2,895-commune React/Leaflet Web MVP + Gemini Function-Calling Copilot on Yagi 2024 data.
  - *Pilot Integration (Q1–Q3/2027):* Live KTTV/GEE ingestion on PostGIS/FastAPI + Banking Open API (`Cir. 64/2024`).
- **Chuẩn bị Final Pitch 19/11 (nếu vào Top 8):** Quay sẵn **Video demo ≤ 2 phút** trên chính Web App `ResiLend` (chạy flow: Bật layer `R1/R3/UNOSAT/S1` → Kéo timeline 06–15/09 → Chọn `Vũ Xá` 1-Chạm & `Gia Thủy` Ngoại lệ → Hỏi Gemini Copilot lập lịch `3 cán bộ trong 48 giờ` & tạo tờ trình UBND).

---

## Checklist Kiểm Tra Nhanh Trước Khi Xuất PDF Nộp BTC
- [ ] Toàn bộ 15 slides chỉ dùng tên **`ResiLend`**.
- [ ] Số trang đúng **`≤ 15 slides`**, xuất **PDF**, toàn bộ nội dung **tiếng Anh**.
- [ ] Đặt tên folder nộp đúng chuẩn: **`AI4Biz_Tendoi_2026`**.
- [ ] Slide 6 đã phản ánh đúng **Gemini Tool-Calling Copilot đang chạy thật** + phân tách rõ với Future ML.
- [ ] Slide 8 đã bỏ chữ `"commune centroids"`, thay bằng ảnh thật Web App (polygon 2.895 xã) & đúng ví dụ `Vũ Xá` vs `Gia Thủy`.
- [ ] Slide 9 đã thêm số `UNOSAT (2,540 / 718 / 355)` và `Sentinel-1 (101)`.
- [ ] Slide 2, 4, 10, 13 đã ghi đủ mã văn bản: `Cir. 29/2025`, `Dec. 55/2015`, `Cir. 53/2024 (88 days)`, `Dec. 86/2024`, `Dec. 346/2026`, `Cir. 64/2024`.

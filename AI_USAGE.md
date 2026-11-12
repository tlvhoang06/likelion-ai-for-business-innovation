# Ứng dụng AI trong ResiLend

> **Nguyên tắc thiết kế cốt lõi:** *"AI phân tích & điều phối không gian — Quy tắc tất định xử lý kích hoạt & hạch toán — Con người giữ quyền phê duyệt tín dụng."*

Tài liệu này khái quát vai trò thực tế của AI trong hệ thống **ResiLend**, đồng thời phân tách rõ ranh giới giữa phần dùng **Mô hình ngôn ngữ lớn (LLM)** và phần vận hành bằng **quy tắc nghiệp vụ cố định** để đảm bảo tính minh bạch và khả năng giải trình kiểm toán ngân hàng.

---

## 1. AI làm gì trong hệ thống? (Không cần huấn luyện mô hình riêng)

Thay vì huấn luyện mô hình dự báo đen trên dữ liệu chưa đủ dày, ResiLend tận dụng năng lực suy luận ngôn ngữ và gọi công cụ (`Function Calling Agent` qua **Google Gemini**) kết hợp trực tiếp với bộ dữ liệu thiên tai – danh mục hiện có:

1. **Truy vấn đa điều kiện bằng ngôn ngữ tự nhiên:**
   - Cán bộ tín dụng có thể đặt câu hỏi hoặc lọc trực tiếp trên `2.895` xã Bắc Bộ và `11` trạm thủy văn mà không cần tự lọc bảng thủ công (ví dụ: tìm xã ngoài vùng quét vệ tinh, xã mưa dưới ngưỡng nhưng ngập cao, vùng gió mạnh, hoặc đối chiếu mực nước vượt Báo động 3).
   - Các xã thiếu dữ liệu vệ tinh được giữ nguyên trạng thái **"chưa biết / ngoài vùng quét"**, tuyệt đối không tự ép thành `0%` ngập.

2. **Điều phối trực quan lên Bản đồ & Mốc thời gian:**
   - AI không chỉ trả lời văn bản thụ động mà gọi lệnh đồng bộ trực tiếp vào giao diện làm việc: tự động tô sáng cụm xã khớp kết quả, phóng bản đồ tới khu vực mục tiêu, chuyển mốc ngày diễn biến bão hoặc điều chỉnh các lớp hiển thị (`R1`, `R3`, `UNOSAT`, `Sentinel-1`).

3. **Lập kế hoạch xử lý theo giới hạn nguồn lực:**
   - Khi chi nhánh nhập ràng buộc thực tế (như số cán bộ hiện có và khung giờ xử lý), AI tính toán công suất tối đa, ưu tiên các xã trọng điểm để bảo toàn nhiều dư nợ Nhóm 1 nhất (giảm trích lập dự phòng `5%`), và gom theo từng cụm huyện để thuận tiện phân tuyến thực địa.

4. **Hỗ trợ soạn nháp hồ sơ hành chính (`Tờ trình`):**
   - Chuyển đổi các thông số mưa, gió, vệ tinh và quy mô dư nợ ước tính thành bản nháp **Tờ trình đề xuất** (cho từng xã lẻ hoặc gộp theo cụm xã) đúng cấu trúc hành chính ngân hàng để cán bộ rà soát, sao chép và trình duyệt.

---

## 2. Cơ chế an toàn, kiểm soát và chống "AI-washing"

- **Bảo vệ dữ liệu cá nhân (Zero-PII):** Hệ thống chỉ dùng mã hành chính cấp xã (`GID_3`), tên địa bàn và số liệu tổng hợp khi giao tiếp với API AI. Thông tin định danh hộ vay và hợp đồng tín dụng chi tiết được giữ lại hoàn toàn trong phạm vi ngân hàng.
- **Khóa phạm vi nghiệp vụ:** Trợ lý AI được cấu hình chỉ phục vụ các câu hỏi và tác vụ điều phối thuộc hệ thống ResiLend và khung pháp lý liên quan, tự động từ chối các yêu cầu ngoài lề.
- **Vận hành linh hoạt (có hoặc không có API Key):** Người dùng có thể gắn Gemini API Key theo phiên làm việc để bật toàn bộ suy luận đa bước, hoặc vận hành ngay bằng bộ công cụ phân tích cục bộ sẵn có trên trình duyệt.
- **Tách bạch các khâu KHÔNG dùng AI:**
  - **Nhận diện thiên tai chuẩn hóa (`R1`, `R2`, `R3`):** Chạy 100% bằng đối chiếu ngưỡng pháp lý và vật lý (như Đ.44 QĐ 18/2021, QĐ 05/2020), không dùng ước lượng xác suất.
  - **Chấm điểm & thanh lọc hàng đợi (`Ngoại lệ`):** Dùng công thức trọng số minh bạch để mọi thay đổi ngưỡng đều giải trình được từng điểm cộng.
  - **Xác nhận giãn nợ & báo cáo (`1-Chạm`, `UBND Xã`, `Open API`):** Tuân thủ luồng nghiệp vụ cố định (`TT 29/2025/TT-NHNN`, `NĐ 86/2024`, `TT 64/2024`, `NĐ 346/2026`); mọi quyết định cuối cùng đều do cán bộ tín dụng và các bên liên quan xác nhận.

---

## 3. Định hướng mở rộng sau giai đoạn nguyên mẫu

Khi hệ thống được kết nối với dữ liệu tổn thất thực tế qua nhiều mùa thiên tai từ các ngân hàng và công ty bảo hiểm đối tác, AI có thể mở rộng thêm theo 3 hướng:
1. **Thẩm định hồ sơ đa phương thức:** Tự động trích xuất thông tin từ đơn giấy viết tay tại quầy hoặc đối chiếu ảnh chụp hiện trường của người dân với dữ liệu mưa – vệ tinh tại đúng địa bàn.
2. **Hiệu chỉnh ngưỡng bằng Học máy:** Dùng lịch sử nợ xấu thực tế theo vùng để tinh chỉnh ngưỡng kích hoạt phù hợp đặc thù từng tỉnh/lưu vực.
3. **Nối dữ liệu thủy văn xuống cấp xã:** Kết hợp địa hình số (DEM) với chuỗi mực nước theo giờ từ các trạm đo sông (`R2`) để ước lượng vùng ngập hạ lưu chính xác hơn.

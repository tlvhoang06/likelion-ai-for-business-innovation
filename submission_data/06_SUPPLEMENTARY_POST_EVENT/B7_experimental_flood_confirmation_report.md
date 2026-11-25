# B7 — thử nghiệm cải tiến xác nhận ngập sau bão

**Trạng thái:** thử nghiệm hồi cứu trên Yagi, tạo ngày 13/11/2026. Không thay thế quy tắc cảnh báo sớm R1 OR R2 OR R3 và chưa được dùng để tuyên bố hiệu quả vận hành. Bảng xã: `B7_experimental_flood_confirmation_cv.csv`; script tái lập: `B7_experimental_flood_confirmation.py`.

## Câu hỏi và phạm vi

Runbook của nhóm đặt mục tiêu precision ≥60% và recall ≥80% khi đối chiếu xã ngập UNOSAT. Trên 2.540 xã có nhãn, cờ cảnh báo sớm R50 hiện tại đạt 27,35% và 91,23%. Thử nghiệm này hỏi liệu tín hiệu ảnh ngập Sentinel-1 xử lý riêng, cộng mực nước R2, mưa và tỷ lệ đất trũng HAND, có thể **xác nhận ngập sau bão** tốt hơn hay không. Không gán giờ kích hoạt sớm cho mô hình này.

## Dữ liệu và cách kiểm tra

- Nhãn: `UNOSAT_FLOOD_LABEL_95_5` trong bảng B7 (718 ngập, 1.822 không ngập; 355 xã không đủ độ phủ UNOSAT giữ trống). Nhãn chỉ là vùng ngập ảnh vệ tinh, chưa xác minh thực địa.
- Đầu vào mô hình: `log(1 + S1_FLOOD_PCT_VALID_LAND)`, tỷ lệ phủ Sentinel-1, R2, `MAX_24H_RAIN_MM`, và tỷ lệ diện tích xã có HAND≤10 m. Ba xã R2 chưa chốt được mã hóa tạm là 0 **chỉ trong thử nghiệm này**; trạng thái gốc vẫn giữ trong CSV.
- Sentinel-1 tự xử lý dùng ảnh sau bão từ **08/09 đến trước 21/09/2024** theo `B6_method_and_limits.md`. Số `MAX_24H_RAIN_MM` cũng là tổng kết sự kiện, không có giờ sẵn dùng theo xã trong bảng này. Vì vậy mô hình là **xác nhận hồi cứu**, không phải tín hiệu biết được lúc 13:30 ngày 07/09.
- `HistGradientBoostingClassifier` cố định với `max_iter=80`, `max_leaf_nodes=5`, `min_samples_leaf=40`, `l2_regularization=20`, `random_state=42`. Mỗi xã được dự đoán ở một trong bốn nhóm tỉnh giữ lại; mô hình học từ các tỉnh còn lại. Trong phần huấn luyện của mỗi nhóm, ba lượt giữ lại tỉnh khác chọn mục tiêu recall huấn luyện từ 80%, 84%, 86%, 88%, 90%, 92% bằng precision cao nhất khi recall kiểm tra bên trong ≥80%. Ngưỡng xác suất cuối là ngưỡng cao nhất trên tập huấn luyện vẫn đạt mục tiêu recall được chọn. Không dùng nhãn của tỉnh đang chấm để chọn ngưỡng cho lượt đó.

## Kết quả

| Cách chấm | TP | FP | FN | TN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| Cảnh báo sớm R1 OR R2 OR R3 R50 | 655 | 1740 | 63 | 82 | 27.35% | 91.23% |
| Xác nhận sau bão, chọn ngưỡng bên trong mỗi lượt | 568 | 327 | 150 | 1495 | 63.46% | 79.11% |
| Xác nhận sau bão, cố định mục tiêu huấn luyện 88% | 584 | 359 | 134 | 1463 | 61.93% | 81.34% |

Kết quả **63,5% / 79,1%** ở hàng chọn ngưỡng theo lượt cải thiện precision nhưng chưa đạt mục tiêu recall 80%. Hàng 88% có thể vượt cả hai mốc trên các lượt giữ lại tỉnh; **88% đã được xem sau khi thử Yagi**, nên hàng đó là độ nhạy khám phá, không phải kết quả xác nhận độc lập. Cả hai hàng đều dùng dữ liệu sau bão.

### Kết quả theo nhóm tỉnh, cách chọn ngưỡng bên trong

| Nhóm | Tỉnh giữ lại | Mục tiêu recall huấn luyện | Ngưỡng điểm | TP | FP | FN | TN | Precision | Recall |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Hà Nội, Quảng Ninh | 86% | 0.259 | 141 | 70 | 46 | 395 | 66.82% | 75.40% |
| 2 | Bắc Giang, Hưng Yên, Thái Bình | 86% | 0.244 | 102 | 91 | 32 | 411 | 52.85% | 76.12% |
| 3 | Bắc Ninh, Nam Định, Phú Thọ | 86% | 0.216 | 207 | 96 | 29 | 272 | 68.32% | 87.71% |
| 4 | Hải Dương, Hải Phòng, Ninh Bình, Thái Nguyên | 84% | 0.278 | 118 | 70 | 43 | 417 | 62.77% | 73.29% |

Nhóm Bắc Giang / Hưng Yên / Thái Bình chỉ đạt precision khoảng 53%; kết quả không đồng đều theo địa lý. Kiểm tra theo tỉnh trong **cùng một bão** không thay cho kiểm tra trên bão/lũ khác.

## Quyết định đề xuất cho bài nộp

1. Giữ R1/R2/R3 R50 là **tín hiệu sàng lọc sớm**; công bố đúng 27,35% precision và 91,23% recall trên nhãn ngập UNOSAT nếu nêu con số B7.
2. Mô tả ảnh Sentinel-1 là **bước xác nhận sau khi có ảnh**, chỉ kích hoạt đề xuất giãn nợ sau xác nhận của xã/ngân hàng theo thiết kế sản phẩm. Không chuyển điểm 63,5%/79,1% hoặc 61,9%/81,3% thành điểm của bộ cảnh báo sớm.
3. Để thử đạt hai mục tiêu cho **cảnh báo sớm**, cần thêm dữ liệu sẵn có trước từng giờ ra quyết định (ví dụ dự báo lũ, mực nước theo giờ và mưa cập nhật theo giờ), khóa quy tắc trước khi chấm trên một sự kiện khác. Không thể xác nhận mốc 60%/80% sớm từ các file hiện tại. Một nguồn dự báo lũ sông có dữ liệu năm 2024 là [Copernicus GloFAS](https://ewds.climate.copernicus.eu/datasets/cems-glofas-forecast?tab=download); trang tải yêu cầu tài khoản và chấp nhận giấy phép trước khi gửi yêu cầu. Dữ liệu dự báo dòng chảy của sông vẫn phải được gán về xã và không thay thế bản đồ ngập đô thị/ven biển.

## Giới hạn bắt buộc khi diễn giải

UNOSAT và proxy Sentinel-1 đều dựa trên ảnh radar cùng đợt, nên không độc lập hoàn toàn. Một tỉnh có thể khác hẳn tỉnh khác; các mốc và tham số đã được thử trên cùng sự kiện Yagi nên ước lượng vẫn có thể lạc quan. Cờ R2 còn 3 xã hợp lưu chưa chốt và nguồn sông 2009 có thể thiếu tuyến. File này là bằng chứng thử nghiệm để nhóm lựa chọn thiết kế, **không phải kết quả B7 cuối hay xác nhận rằng cảnh báo sớm đạt chuẩn**.

"""Reproducible, post-event flood-confirmation experiment for Yagi B7.

This does not replace the R1/R2/R3 early warning rule. All model predictions
for labelled communes are made by a model trained on other provinces.
"""

import csv
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupKFold


BASE = Path(__file__).resolve().parent
B7 = BASE / "B7_UNOSAT_R1_R2_R3_mapped_preliminary.csv"
S1 = BASE / "B7_partial_R1_R2_R3_plus_S1_proxy.csv"
MASTER = BASE / "master_2895_communes_with_R1_R3.csv"
HAND = BASE / "R2_HAND_GADM41_candidate_metrics.csv"
OUT_CSV = BASE / "B7_experimental_flood_confirmation_cv.csv"
OUT_REPORT = BASE / "B7_experimental_flood_confirmation_report.md"
INNER_RECALL_TARGETS = (0.80, 0.84, 0.86, 0.88, 0.90, 0.92)


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def keyed(path):
    rows = read_rows(path)
    indexed = {row["GID_3"]: row for row in rows}
    if len(rows) != 2895 or len(indexed) != 2895:
        raise ValueError(f"Expected 2,895 unique GID_3 in {path.name}")
    return indexed


def model():
    return HistGradientBoostingClassifier(
        max_iter=80,
        max_leaf_nodes=5,
        min_samples_leaf=40,
        l2_regularization=20,
        random_state=42,
    )


def cutoff_for_recall(scores, labels, target):
    positives = int(np.sum(labels))
    if positives == 0:
        raise ValueError("Training partition has no UNOSAT positive labels")
    eligible = [
        value for value in np.unique(scores)
        if np.count_nonzero((scores >= value) & labels) / positives >= target
    ]
    return float(max(eligible))


def counts(prediction, labels):
    tp = int(np.count_nonzero(prediction & labels))
    fp = int(np.count_nonzero(prediction & ~labels))
    fn = int(np.count_nonzero(~prediction & labels))
    tn = int(np.count_nonzero(~prediction & ~labels))
    return tp, fp, fn, tn


def metrics(prediction, labels):
    tp, fp, fn, tn = counts(prediction, labels)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return (tp, fp, fn, tn), precision, recall


def fmt_result(prediction, labels):
    (tp, fp, fn, tn), precision, recall = metrics(prediction, labels)
    return f"{tp} | {fp} | {fn} | {tn} | {precision:.2%} | {recall:.2%}"


def main():
    b7 = read_rows(B7)
    if len(b7) != 2895 or len({row["GID_3"] for row in b7}) != 2895:
        raise ValueError("B7 requires 2,895 unique GID_3")
    s1, master, hand = keyed(S1), keyed(MASTER), keyed(HAND)
    gids = {row["GID_3"] for row in b7}
    if not all(set(table) == gids for table in (s1, master, hand)):
        raise ValueError("Input GID_3 sets do not match")

    labelled = [row for row in b7 if row["UNOSAT_FLOOD_LABEL_95_5"] in {"0", "1"}]
    if len(labelled) != 2540 or Counter(r["UNOSAT_FLOOD_LABEL_95_5"] for r in labelled) != {"0": 1822, "1": 718}:
        raise ValueError("UNOSAT reference changed; re-check benchmark scope")

    features = []
    for row in labelled:
        gid = row["GID_3"]
        satellite = s1[gid]
        features.append([
            np.log1p(float(satellite["S1_FLOOD_PCT_VALID_LAND"] or 0)),
            float(satellite["S1_DESCENDING_COVERAGE_PCT"] or 0) / 100,
            int(row["R2_RIVER_TRIGGERED"] == "1"),
            float(master[gid]["MAX_24H_RAIN_MM"]) / 100,
            float(hand[gid]["HAND_LE10_SHARE_COMMUNE_PCT"]) / 100,
        ])
    x = np.asarray(features, dtype=float)
    y = np.asarray([row["UNOSAT_FLOOD_LABEL_95_5"] == "1" for row in labelled], dtype=bool)
    province = np.asarray([row["NAME_1"] for row in labelled])
    if not np.isfinite(x).all():
        raise ValueError("Feature matrix contains missing or non-finite values")

    nested_prediction = np.zeros(len(y), dtype=bool)
    fixed_prediction = np.zeros(len(y), dtype=bool)
    heldout_score = np.full(len(y), np.nan)
    nested_cutoff = np.full(len(y), np.nan)
    fixed_cutoff = np.full(len(y), np.nan)
    outer_fold = np.zeros(len(y), dtype=int)
    selected_target = np.full(len(y), np.nan)
    fold_details = []

    for fold_number, (train, test) in enumerate(GroupKFold(n_splits=4).split(x, y, province), 1):
        inner = []
        for in_train, in_test in GroupKFold(n_splits=3).split(x[train], y[train], province[train]):
            fit_idx, valid_idx = train[in_train], train[in_test]
            fitted = model().fit(x[fit_idx], y[fit_idx])
            inner.append((
                fitted.predict_proba(x[fit_idx])[:, 1], y[fit_idx],
                fitted.predict_proba(x[valid_idx])[:, 1], y[valid_idx],
            ))

        choices = []
        for target in INNER_RECALL_TARGETS:
            validation_predictions, validation_labels = [], []
            for fit_score, fit_label, valid_score, valid_label in inner:
                threshold = cutoff_for_recall(fit_score, fit_label, target)
                validation_predictions.extend(valid_score >= threshold)
                validation_labels.extend(valid_label)
            _, precision, recall = metrics(
                np.asarray(validation_predictions, dtype=bool),
                np.asarray(validation_labels, dtype=bool),
            )
            choices.append((target, precision, recall))
        passing = [item for item in choices if item[2] >= 0.80]
        target = max(passing, key=lambda item: item[1])[0] if passing else max(choices, key=lambda item: item[2])[0]

        fitted = model().fit(x[train], y[train])
        training_scores = fitted.predict_proba(x[train])[:, 1]
        test_scores = fitted.predict_proba(x[test])[:, 1]
        threshold = cutoff_for_recall(training_scores, y[train], target)
        threshold_fixed = cutoff_for_recall(training_scores, y[train], 0.88)
        nested_prediction[test] = test_scores >= threshold
        fixed_prediction[test] = test_scores >= threshold_fixed
        heldout_score[test] = test_scores
        nested_cutoff[test] = threshold
        fixed_cutoff[test] = threshold_fixed
        outer_fold[test] = fold_number
        selected_target[test] = target
        fold_details.append((
            fold_number, ", ".join(sorted(set(province[test]))), target,
            threshold, test.copy(),
        ))

    if not np.all(outer_fold > 0):
        raise ValueError("Not every classifiable commune received a held-out prediction")

    baseline = np.asarray([row["R50_R1_R2_R3_TRIGGERED"] == "1" for row in labelled])
    baseline_counts = counts(baseline, y)
    if baseline_counts != (655, 1740, 63, 82):
        raise ValueError(f"Unexpected early-rule baseline: {baseline_counts}")

    by_gid = {}
    for i, row in enumerate(labelled):
        by_gid[row["GID_3"]] = {
            "CV_FOLD": str(outer_fold[i]),
            "NESTED_TRAIN_RECALL_TARGET": f"{selected_target[i]:.2f}",
            "HELDOUT_MODEL_SCORE": f"{heldout_score[i]:.8f}",
            "NESTED_FOLD_CUTOFF": f"{nested_cutoff[i]:.8f}",
            "NESTED_CONFIRM_FLAG": str(int(nested_prediction[i])),
            "NESTED_OUTCOME": { (True, True): "TP", (True, False): "FP", (False, True): "FN", (False, False): "TN" }[(bool(nested_prediction[i]), bool(y[i]))],
            "FIXED_88_FOLD_CUTOFF": f"{fixed_cutoff[i]:.8f}",
            "FIXED_88_CONFIRM_FLAG": str(int(fixed_prediction[i])),
        }

    fields = [
        "GID_3", "NAME_3", "NAME_1", "UNOSAT_FLOOD_LABEL_95_5",
        "R50_EARLY_WATCH", "R2_RIVER_TRIGGERED", "R2_STATUS",
        "S1_DESCENDING_COVERAGE_PCT", "S1_FLOOD_PCT_VALID_LAND",
        "MAX_24H_RAIN_MM", "HAND_LE10_SHARE_COMMUNE_PCT",
        "CV_FOLD", "NESTED_TRAIN_RECALL_TARGET", "HELDOUT_MODEL_SCORE",
        "NESTED_FOLD_CUTOFF", "NESTED_CONFIRM_FLAG", "NESTED_OUTCOME",
        "FIXED_88_FOLD_CUTOFF", "FIXED_88_CONFIRM_FLAG", "EXPERIMENT_STATUS",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in b7:
            gid = row["GID_3"]
            out = {
                "GID_3": gid,
                "NAME_3": row["NAME_3"],
                "NAME_1": row["NAME_1"],
                "UNOSAT_FLOOD_LABEL_95_5": row["UNOSAT_FLOOD_LABEL_95_5"],
                "R50_EARLY_WATCH": row["R50_R1_R2_R3_TRIGGERED"],
                "R2_RIVER_TRIGGERED": row["R2_RIVER_TRIGGERED"],
                "R2_STATUS": row["R2_STATUS"],
                "S1_DESCENDING_COVERAGE_PCT": s1[gid]["S1_DESCENDING_COVERAGE_PCT"],
                "S1_FLOOD_PCT_VALID_LAND": s1[gid]["S1_FLOOD_PCT_VALID_LAND"],
                "MAX_24H_RAIN_MM": master[gid]["MAX_24H_RAIN_MM"],
                "HAND_LE10_SHARE_COMMUNE_PCT": hand[gid]["HAND_LE10_SHARE_COMMUNE_PCT"],
                "EXPERIMENT_STATUS": "POST_EVENT_HELDOUT_PROVINCE" if gid in by_gid else "UNOSAT_UNCLASSIFIABLE_NO_CV_SCORE",
            }
            out.update(by_gid.get(gid, {}))
            writer.writerow(out)

    fold_rows = []
    for fold_number, names, target, threshold, indices in fold_details:
        fold_rows.append(
            f"| {fold_number} | {names} | {target:.0%} | {threshold:.3f} | "
            + fmt_result(nested_prediction[indices], y[indices]) + " |"
        )
    report = f"""# B7 — thử nghiệm cải tiến xác nhận ngập sau bão

**Trạng thái:** thử nghiệm hồi cứu trên Yagi, tạo ngày 13/11/2026. Không thay thế quy tắc cảnh báo sớm R1 OR R2 OR R3 và chưa được dùng để tuyên bố hiệu quả vận hành. Bảng xã: `{OUT_CSV.name}`; script tái lập: `{Path(__file__).name}`.

## Câu hỏi và phạm vi

Runbook của nhóm đặt mục tiêu precision ≥60% và recall ≥80% khi đối chiếu xã ngập UNOSAT. Trên 2.540 xã có nhãn, cờ cảnh báo sớm R50 hiện tại đạt 27,35% và 91,23%. Thử nghiệm này hỏi liệu tín hiệu ảnh ngập Sentinel-1 xử lý riêng, cộng mực nước R2, mưa và tỷ lệ đất trũng HAND, có thể **xác nhận ngập sau bão** tốt hơn hay không. Không gán giờ kích hoạt sớm cho mô hình này.

## Dữ liệu và cách kiểm tra

- Nhãn: `UNOSAT_FLOOD_LABEL_95_5` trong bảng B7 (718 ngập, 1.822 không ngập; 355 xã không đủ độ phủ UNOSAT giữ trống). Nhãn chỉ là vùng ngập ảnh vệ tinh, chưa xác minh thực địa.
- Đầu vào mô hình: `log(1 + S1_FLOOD_PCT_VALID_LAND)`, tỷ lệ phủ Sentinel-1, R2, `MAX_24H_RAIN_MM`, và tỷ lệ diện tích xã có HAND≤10 m. Ba xã R2 chưa chốt được mã hóa tạm là 0 **chỉ trong thử nghiệm này**; trạng thái gốc vẫn giữ trong CSV.
- Sentinel-1 tự xử lý dùng ảnh sau bão từ **08/09 đến trước 21/09/2024** theo `B6_method_and_limits.md`. Số `MAX_24H_RAIN_MM` cũng là tổng kết sự kiện, không có giờ sẵn dùng theo xã trong bảng này. Vì vậy mô hình là **xác nhận hồi cứu**, không phải tín hiệu biết được lúc 13:30 ngày 07/09.
- `HistGradientBoostingClassifier` cố định với `max_iter=80`, `max_leaf_nodes=5`, `min_samples_leaf=40`, `l2_regularization=20`, `random_state=42`. Mỗi xã được dự đoán ở một trong bốn nhóm tỉnh giữ lại; mô hình học từ các tỉnh còn lại. Trong phần huấn luyện của mỗi nhóm, ba lượt giữ lại tỉnh khác chọn mục tiêu recall huấn luyện từ {', '.join(f'{v:.0%}' for v in INNER_RECALL_TARGETS)} bằng precision cao nhất khi recall kiểm tra bên trong ≥80%. Ngưỡng xác suất cuối là ngưỡng cao nhất trên tập huấn luyện vẫn đạt mục tiêu recall được chọn. Không dùng nhãn của tỉnh đang chấm để chọn ngưỡng cho lượt đó.

## Kết quả

| Cách chấm | TP | FP | FN | TN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| Cảnh báo sớm R1 OR R2 OR R3 R50 | {fmt_result(baseline, y)} |
| Xác nhận sau bão, chọn ngưỡng bên trong mỗi lượt | {fmt_result(nested_prediction, y)} |
| Xác nhận sau bão, cố định mục tiêu huấn luyện 88% | {fmt_result(fixed_prediction, y)} |

Kết quả **63,5% / 79,1%** ở hàng chọn ngưỡng theo lượt cải thiện precision nhưng chưa đạt mục tiêu recall 80%. Hàng 88% có thể vượt cả hai mốc trên các lượt giữ lại tỉnh; **88% đã được xem sau khi thử Yagi**, nên hàng đó là độ nhạy khám phá, không phải kết quả xác nhận độc lập. Cả hai hàng đều dùng dữ liệu sau bão.

### Kết quả theo nhóm tỉnh, cách chọn ngưỡng bên trong

| Nhóm | Tỉnh giữ lại | Mục tiêu recall huấn luyện | Ngưỡng điểm | TP | FP | FN | TN | Precision | Recall |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
{chr(10).join(fold_rows)}

Nhóm Bắc Giang / Hưng Yên / Thái Bình chỉ đạt precision khoảng 53%; kết quả không đồng đều theo địa lý. Kiểm tra theo tỉnh trong **cùng một bão** không thay cho kiểm tra trên bão/lũ khác.

## Quyết định đề xuất cho bài nộp

1. Giữ R1/R2/R3 R50 là **tín hiệu sàng lọc sớm**; công bố đúng 27,35% precision và 91,23% recall trên nhãn ngập UNOSAT nếu nêu con số B7.
2. Mô tả ảnh Sentinel-1 là **bước xác nhận sau khi có ảnh**, chỉ kích hoạt đề xuất giãn nợ sau xác nhận của xã/ngân hàng theo thiết kế sản phẩm. Không chuyển điểm 63,5%/79,1% hoặc 61,9%/81,3% thành điểm của bộ cảnh báo sớm.
3. Để thử đạt hai mục tiêu cho **cảnh báo sớm**, cần thêm dữ liệu sẵn có trước từng giờ ra quyết định (ví dụ dự báo lũ, mực nước theo giờ và mưa cập nhật theo giờ), khóa quy tắc trước khi chấm trên một sự kiện khác. Không thể xác nhận mốc 60%/80% sớm từ các file hiện tại. Một nguồn dự báo lũ sông có dữ liệu năm 2024 là [Copernicus GloFAS](https://ewds.climate.copernicus.eu/datasets/cems-glofas-forecast?tab=download); trang tải yêu cầu tài khoản và chấp nhận giấy phép trước khi gửi yêu cầu. Dữ liệu dự báo dòng chảy của sông vẫn phải được gán về xã và không thay thế bản đồ ngập đô thị/ven biển.

## Giới hạn bắt buộc khi diễn giải

UNOSAT và proxy Sentinel-1 đều dựa trên ảnh radar cùng đợt, nên không độc lập hoàn toàn. Một tỉnh có thể khác hẳn tỉnh khác; các mốc và tham số đã được thử trên cùng sự kiện Yagi nên ước lượng vẫn có thể lạc quan. Cờ R2 còn 3 xã hợp lưu chưa chốt và nguồn sông 2009 có thể thiếu tuyến. File này là bằng chứng thử nghiệm để nhóm lựa chọn thiết kế, **không phải kết quả B7 cuối hay xác nhận rằng cảnh báo sớm đạt chuẩn**.
"""
    OUT_REPORT.write_text(report, encoding="utf-8")
    print(f"Wrote {len(b7)} rows: {OUT_CSV.name}")
    print(f"Wrote report: {OUT_REPORT.name}")
    print("Early:", fmt_result(baseline, y))
    print("Nested:", fmt_result(nested_prediction, y))
    print("Fixed 88%:", fmt_result(fixed_prediction, y))


if __name__ == "__main__":
    main()

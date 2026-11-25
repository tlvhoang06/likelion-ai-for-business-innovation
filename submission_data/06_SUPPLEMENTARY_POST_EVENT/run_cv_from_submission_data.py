"""Reproduce Stage-2 post-event flood confirmation CV directly from public submission_data CSVs.

Reuses the exact feature transformation, GroupKFold splits, and HistGradientBoostingClassifier
hyperparameters of `B7_experimental_flood_confirmation.py`, reading directly from:
  - ../10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv
  - ../08_Sentinel1_SAR_Flood_Screen_2895_Communes.csv
  - ../09_R2_GADM41_Commune_Crosswalk_2895.csv

Note on exact counts across scikit-learn / R2 revisions:
  - Committed baseline snapshot (`B7_experimental_flood_confirmation_cv.csv`):
      568 TP | 327 FP | 150 FN | 1,495 TN (63.46% Prec | 79.11% Rec)
  - Under scikit-learn 1.8.0 with preliminary confluence encoding (Dong Phuc & Duc Long R2=0):
      570 TP | 325 FP | 148 FN | 1,497 TN (63.69% Prec | 79.39% Rec)
  - Under scikit-learn 1.8.0 with verified resolved R2 (`10_B7`):
      573 TP | 331 FP | 145 FN | 1,491 TN (63.38% Prec | 79.81% Rec)
"""

import csv
from pathlib import Path

import numpy as np
from sklearn.model_selection import GroupKFold

from B7_experimental_flood_confirmation import (
    INNER_RECALL_TARGETS,
    cutoff_for_recall,
    fmt_result,
    metrics,
    model,
)

SUB_DIR = Path(__file__).resolve().parent.parent


def _load_keyed(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return {row["GID_3"]: row for row in csv.DictReader(handle)}


def run_cv(*, use_preliminary_r2_confluences: bool = False) -> str:
    """Run nested 4x3 GroupKFold provincial CV and return the formatted confusion summary."""
    with (SUB_DIR / "10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv").open(
        encoding="utf-8-sig", newline=""
    ) as handle:
        b7_rows = list(csv.DictReader(handle))

    s1 = _load_keyed(SUB_DIR / "08_Sentinel1_SAR_Flood_Screen_2895_Communes.csv")
    hand = _load_keyed(SUB_DIR / "09_R2_GADM41_Commune_Crosswalk_2895.csv")

    labelled = [r for r in b7_rows if r["UNOSAT_FLOOD_LABEL_95_5"] in {"0", "1"}]
    features = np.asarray(
        [
            [
                np.log1p(float(s1[r["GID_3"]]["DESCENDING_FLOOD_PCT_VALID_LAND"] or 0)),
                float(s1[r["GID_3"]]["DESCENDING_COVERAGE_PCT"] or 0) / 100.0,
                0.0
                if (use_preliminary_r2_confluences and r["GID_3"] in {"VNM.3.9.2_1", "VNM.5.4.7_1"})
                else float(r["R2_RIVER_TRIGGERED"] == "1"),
                float(r["MAX_24H_RAIN_MM"]) / 100.0,
                float(hand[r["GID_3"]]["HAND_LE10_SHARE_COMMUNE_PCT"]) / 100.0,
            ]
            for r in labelled
        ],
        dtype=float,
    )
    labels = np.asarray([r["UNOSAT_FLOOD_LABEL_95_5"] == "1" for r in labelled], dtype=bool)
    provinces = np.asarray([r["NAME_1"] for r in labelled])

    nested_pred = np.zeros(len(labels), dtype=bool)
    for train_idx, test_idx in GroupKFold(n_splits=4).split(features, labels, provinces):
        inner_splits = []
        for in_tr, in_val in GroupKFold(n_splits=3).split(
            features[train_idx], labels[train_idx], provinces[train_idx]
        ):
            fit_i, val_i = train_idx[in_tr], train_idx[in_val]
            fitted = model().fit(features[fit_i], labels[fit_i])
            inner_splits.append(
                (
                    fitted.predict_proba(features[fit_i])[:, 1],
                    labels[fit_i],
                    fitted.predict_proba(features[val_i])[:, 1],
                    labels[val_i],
                )
            )

        choices = []
        for target in INNER_RECALL_TARGETS:
            val_preds, val_labels = [], []
            for fit_scores, fit_labels, val_scores, val_y in inner_splits:
                cutoff = cutoff_for_recall(fit_scores, fit_labels, target)
                val_preds.extend(val_scores >= cutoff)
                val_labels.extend(val_y)
            _, prec, rec = metrics(np.asarray(val_preds, dtype=bool), np.asarray(val_labels, dtype=bool))
            choices.append((target, prec, rec))
        passing = [c for c in choices if c[2] >= 0.80]
        selected_target = (
            max(passing, key=lambda c: c[1])[0] if passing else max(choices, key=lambda c: c[2])[0]
        )

        outer_model = model().fit(features[train_idx], labels[train_idx])
        outer_cutoff = cutoff_for_recall(
            outer_model.predict_proba(features[train_idx])[:, 1], labels[train_idx], selected_target
        )
        nested_pred[test_idx] = outer_model.predict_proba(features[test_idx])[:, 1] >= outer_cutoff

    return fmt_result(nested_pred, labels)


if __name__ == "__main__":
    print("Preliminary R2 encoding :", run_cv(use_preliminary_r2_confluences=True))
    print("Verified 10_B7 R2 inputs:", run_cv(use_preliminary_r2_confluences=False))


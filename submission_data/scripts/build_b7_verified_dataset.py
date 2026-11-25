"""Build the verified ResiLend B7 commune dataset from audited R1, R2, R3, and UNOSAT inputs.

Reads only local files in ``submission_data`` so execution is self-contained and idempotent:
- ``01_ResiLend_Yagi_Master_2895_Communes.csv`` (baseline R1, R3, UNOSAT, S1 fields)
- ``04_R2_NCHMF_River_Station_Peaks_11.csv`` (peak levels and binary BĐ3 trigger flags)
- ``04b_R2_Bulletin_Trigger_Evidence_11.csv`` (audited first BĐ3 NCHMF bulletin issue times)
- ``09_R2_GADM41_Commune_Crosswalk_2895.csv`` (resolved 2,895-commune river-station crosswalk)

Outputs:
- ``10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv``
- Updates ``01_ResiLend_Yagi_Master_2895_Communes.csv`` (keeps baseline 37-column order intact)

Scientific integrity rules preserved:
- Blank trigger timestamps are never filled with peak water-level timestamps or guessed minutes.
- Uncovered UNOSAT communes (n = 355) remain ``UNCLASSIFIABLE_UNOSAT``.
"""

from __future__ import annotations

import csv
import statistics
from collections import Counter
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_PATH = BASE_DIR / "01_ResiLend_Yagi_Master_2895_Communes.csv"
PEAKS_PATH = BASE_DIR / "04_R2_NCHMF_River_Station_Peaks_11.csv"
BULLETINS_PATH = BASE_DIR / "04b_R2_Bulletin_Trigger_Evidence_11.csv"
CROSSWALK_PATH = BASE_DIR / "09_R2_GADM41_Commune_Crosswalk_2895.csv"
B7_OUT_PATH = BASE_DIR / "10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv"

LANDFALL_ICT = datetime.fromisoformat("2024-09-07 13:30:00")
B7_STATUS_LABEL = (
    "CONFLUENCES_RESOLVED_VU_QUANG_PHA_LAI_VERIFIED_YEN_BAI_BOUNDED_1900_2147_08SEP"
)

BASELINE_37_COLS = [
    "GID_3",
    "NAME_3",
    "NAME_2",
    "NAME_1",
    "LON",
    "LAT",
    "GRID_CELL_ID",
    "MAX_24H_RAIN_MM",
    "R1_PRIMARY_TRIGGERED",
    "R1_TRIGGER_REASON",
    "R1_OBS_TIME_ICT",
    "R1_TRIGGER_TIME_ICT",
    "R1_LAG_HOURS",
    "R3_R50_TRIGGERED",
    "R3_R50_TRIGGER_TIME_ICT",
    "R3_R50_LAG_HOURS",
    "R3_R64_TRIGGERED",
    "R3_R64_TRIGGER_TIME_ICT",
    "R3_R64_LAG_HOURS",
    "ANY_R1_OR_R3_R50_TRIGGERED",
    "ANY_R1_OR_R3_R64_TRIGGERED",
    "R2_RIVER_TRIGGERED",
    "R2_MAPPING_STATUS",
    "ELIGIBLE_LAND_ALL_M2",
    "UNOSAT_ANALYZED_ELIGIBLE_M2",
    "UNOSAT_FLOODED_ELIGIBLE_M2",
    "UNOSAT_ANALYSIS_COVERAGE_PCT",
    "UNOSAT_FLOOD_PCT_ANALYZED_LAND",
    "UNOSAT_FLOOD_LABEL_95_5",
    "UNOSAT_REFERENCE_STATUS",
    "S1_DESCENDING_COVERAGE_PCT",
    "S1_FLOOD_PCT_VALID_LAND",
    "S1_ELIGIBLE_LAND_M2",
    "S1_VALID_LAND_M2",
    "S1_FLOODED_LAND_M2",
    "S1_FLOOD_LABEL_95_5",
    "S1_ANY_COVERAGE_SENSITIVITY_LABEL",
]


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    """Read a UTF-8 CSV file into a list of dictionaries."""
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def combine_triggers(
    triggers: list[tuple[str, str]],
) -> tuple[str, str, str, str]:
    """Combine rule flags and issue times using earliest verified timestamp semantics.

    If R2 (or any active trigger passed with an unknown time when ``flag == '1'``) lacks
    an exact minute-level timestamp, the earliest trigger time remains blank with status
    ``R2_FIRST_BULLETIN_TIME_UNKNOWN`` rather than substituting a peak timestamp.
    """
    any_on = any(flag == "1" for flag, _ in triggers)
    if not any_on:
        return "0", "", "", "NOT_TRIGGERED"

    # Preserve strictness: if any active rule (specifically R2=1) has no verified time,
    # do not emit an unverified earliest timestamp unless all active rules have times.
    if any(flag == "1" and not ts for flag, ts in triggers):
        return "1", "", "", "R2_FIRST_BULLETIN_TIME_UNKNOWN"

    active_times = [datetime.fromisoformat(ts) for flag, ts in triggers if flag == "1" and ts]
    if not active_times:
        return "1", "", "", "TRIGGER_TIME_NOT_AVAILABLE"
    earliest = min(active_times)
    lag_hours = (earliest - LANDFALL_ICT).total_seconds() / 3600.0
    return "1", earliest.isoformat(sep=" "), f"{lag_hours:g}", "TIME_KNOWN"


def classify_unosat_outcome(flag: str, label: str, ref_status: str) -> str:
    """Return TP/FP/FN/TN on classifiable UNOSAT communes or UNCLASSIFIABLE_UNOSAT."""
    if ref_status != "CLASSIFIABLE":
        return "UNCLASSIFIABLE_UNOSAT"
    return {
        ("1", "1"): "TP",
        ("1", "0"): "FP",
        ("0", "1"): "FN",
        ("0", "0"): "TN",
    }[(flag, label)]


def derive_r2_fields(
    geo: dict[str, str],
    peaks: dict[str, dict[str, str]],
    bulletins: dict[str, dict[str, str]],
) -> dict[str, str]:
    """Derive R2 status, trigger flag, and bulletin metadata from the resolved crosswalk."""
    station = geo["STATION_NAME"].strip()
    if not station:
        if geo["STATION_ASSIGNMENT_STATUS"] != "NO_NAMED_RIVER_LINE_INTERSECTION":
            raise ValueError(f"Unassigned non-empty river status for {geo['GID_3']}")
        return {
            "R2_RIVER_TRIGGERED": "0",
            "R2_STATION_NAME": "",
            "R2_MATCHED_RIVERS": geo["MATCHED_RIVERS"],
            "R2_PEAK_TIME_ICT": "",
            "R2_FIRST_BD3_BULLETIN_ISSUE_ICT": "",
            "R2_STATUS": "NO_SELECTED_NAMED_RIVER_LINE_INTERSECTION",
        }

    peak = peaks[station]
    bulletin = bulletins[station]
    r2_flag = peak["R2_RIVER_TRIGGERED"]
    verified_time = (
        bulletin["FIRST_BD3_BULLETIN_ISSUE_ICT"]
        if bulletin["FIRST_ABOVE_BULLETIN_VERIFIED"].lower() == "true"
        else ""
    )
    if bulletin["FIRST_ABOVE_BULLETIN_VERIFIED"].lower() == "true" and not verified_time:
        raise ValueError(f"Missing verified FIRST_BD3_BULLETIN_ISSUE_ICT for {station}")

    if r2_flag == "0":
        r2_status = "ASSIGNED_STATION_BELOW_BD3_PEAK"
    elif verified_time:
        r2_status = "ASSIGNED_BD3_FIRST_BULLETIN_VERIFIED"
    else:
        r2_status = "ASSIGNED_BD3_FIRST_BULLETIN_UNKNOWN"

    return {
        "R2_RIVER_TRIGGERED": r2_flag,
        "R2_STATION_NAME": station,
        "R2_MATCHED_RIVERS": geo["MATCHED_RIVERS"],
        "R2_PEAK_TIME_ICT": peak["TRIGGER_TIME_ICT"],
        "R2_FIRST_BD3_BULLETIN_ISSUE_ICT": verified_time,
        "R2_STATUS": r2_status,
    }


def summarize_stream(rows: list[dict[str, str]], prefix: str) -> dict[str, object]:
    """Compute confusion matrix and TP lag metrics for a trigger stream."""
    counts = Counter(row[f"{prefix}_OUTCOME"] for row in rows)
    tp = counts["TP"]
    fp = counts["FP"]
    fn = counts["FN"]
    tn = counts["TN"]
    tp_lags = [
        float(row[f"{prefix}_LAG_HOURS"])
        for row in rows
        if row[f"{prefix}_OUTCOME"] == "TP" and row[f"{prefix}_LAG_HOURS"] != ""
    ]
    return {
        "triggered": sum(1 for r in rows if r[f"{prefix}_TRIGGERED"] == "1"),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "unclass": counts["UNCLASSIFIABLE_UNOSAT"],
        "precision": tp / (tp + fp) if (tp + fp) else 0.0,
        "recall": tp / (tp + fn) if (tp + fn) else 0.0,
        "tp_known": len(tp_lags),
        "tp_med_lag": statistics.median(tp_lags) if tp_lags else None,
        "tp_min_lag": min(tp_lags) if tp_lags else None,
        "tp_max_lag": max(tp_lags) if tp_lags else None,
        "tp_le72h": sum(1 for x in tp_lags if x <= 72.0),
    }


def run_sensitivity(
    master_rows: list[dict[str, str]],
    crosswalk_by_id: dict[str, dict[str, str]],
    peaks: dict[str, dict[str, str]],
    bulletins: dict[str, dict[str, str]],
    yb_ts: str,
    pl_ts: str,
    dong_phuc_station: str = "Phu Lang Thuong",
) -> dict[str, dict[str, object]]:
    """Simulate confusion/lag metrics under an explicit timestamp assignment."""
    sim_rows = []
    for base in master_rows:
        gid = base["GID_3"]
        geo = dict(crosswalk_by_id[gid])
        if gid == "VNM.3.9.2_1":
            geo["STATION_NAME"] = dong_phuc_station
        station = geo["STATION_NAME"]
        if station:
            r2_flag = peaks[station]["R2_RIVER_TRIGGERED"]
            if station == "Yen Bai":
                r2_time = yb_ts
            elif station == "Pha Lai":
                r2_time = pl_ts
            else:
                r2_time = bulletins[station]["FIRST_BD3_BULLETIN_ISSUE_ICT"]
        else:
            r2_flag, r2_time = "0", ""

        rec = {
            "R50_OUTCOME": "",
            "R50_LAG_HOURS": "",
            "R50_TRIGGERED": "",
            "R64_OUTCOME": "",
            "R64_LAG_HOURS": "",
            "R64_TRIGGERED": "",
            "R1R2_OUTCOME": "",
            "R1R2_LAG_HOURS": "",
            "R1R2_TRIGGERED": "",
        }
        r1_pair = (base["R1_PRIMARY_TRIGGERED"], base["R1_TRIGGER_TIME_ICT"])
        r2_pair = (r2_flag, r2_time)
        for prefix, pairs in (
            ("R50", [r1_pair, r2_pair, (base["R3_R50_TRIGGERED"], base["R3_R50_TRIGGER_TIME_ICT"])]),
            ("R64", [r1_pair, r2_pair, (base["R3_R64_TRIGGERED"], base["R3_R64_TRIGGER_TIME_ICT"])]),
            ("R1R2", [r1_pair, r2_pair]),
        ):
            flag, _, lag, _ = combine_triggers(pairs)
            rec[f"{prefix}_TRIGGERED"] = flag
            rec[f"{prefix}_LAG_HOURS"] = lag
            rec[f"{prefix}_OUTCOME"] = classify_unosat_outcome(
                flag, base["UNOSAT_FLOOD_LABEL_95_5"], base["UNOSAT_REFERENCE_STATUS"]
            )
        sim_rows.append(rec)
    return {p: summarize_stream(sim_rows, p) for p in ("R50", "R64", "R1R2")}


def main() -> None:
    master_rows = read_csv_rows(MASTER_PATH)
    peaks = {r["STATION_NAME"]: r for r in read_csv_rows(PEAKS_PATH)}
    bulletins = {r["STATION_NAME"]: r for r in read_csv_rows(BULLETINS_PATH)}
    crosswalk_rows = read_csv_rows(CROSSWALK_PATH)
    crosswalk_by_id = {r["GID_3"]: r for r in crosswalk_rows}

    if len(master_rows) != 2895 or len({r["GID_3"] for r in master_rows}) != 2895:
        raise ValueError("Expected 2,895 unique communes in 01_ResiLend_Yagi_Master")
    if set(crosswalk_by_id) != {r["GID_3"] for r in master_rows}:
        raise ValueError("GID_3 mismatch between Master and 09 Crosswalk")
    if set(peaks) != set(bulletins):
        raise ValueError("Station mismatch between 04 peaks and 04b bulletins")
    if any(r["STATION_ASSIGNMENT_STATUS"] == "MULTIPLE_RIVERS_REVIEW" for r in crosswalk_rows):
        raise ValueError("Unresolved MULTIPLE_RIVERS_REVIEW remains in 09 Crosswalk")

    b7_rows: list[dict[str, str]] = []
    updated_master_rows: list[dict[str, str]] = []

    for base in master_rows:
        gid = base["GID_3"]
        geo = crosswalk_by_id[gid]
        r2_info = derive_r2_fields(geo, peaks, bulletins)

        r1_pair = (base["R1_PRIMARY_TRIGGERED"], base["R1_TRIGGER_TIME_ICT"])
        r2_pair = (
            r2_info["R2_RIVER_TRIGGERED"],
            r2_info["R2_FIRST_BD3_BULLETIN_ISSUE_ICT"],
        )
        r3_r50_pair = (base["R3_R50_TRIGGERED"], base["R3_R50_TRIGGER_TIME_ICT"])
        r3_r64_pair = (base["R3_R64_TRIGGERED"], base["R3_R64_TRIGGER_TIME_ICT"])

        r50_flag, r50_time, r50_lag, r50_tstat = combine_triggers([r1_pair, r2_pair, r3_r50_pair])
        r64_flag, r64_time, r64_lag, r64_tstat = combine_triggers([r1_pair, r2_pair, r3_r64_pair])
        onetap_flag, onetap_time, onetap_lag, onetap_tstat = combine_triggers([r1_pair, r2_pair])

        label = base["UNOSAT_FLOOD_LABEL_95_5"]
        ref_status = base["UNOSAT_REFERENCE_STATUS"]
        r50_out = classify_unosat_outcome(r50_flag, label, ref_status)
        r64_out = classify_unosat_outcome(r64_flag, label, ref_status)
        onetap_out = classify_unosat_outcome(onetap_flag, label, ref_status)

        r50_cnt = str(
            int(base["R1_PRIMARY_TRIGGERED"])
            + int(r2_info["R2_RIVER_TRIGGERED"])
            + int(base["R3_R50_TRIGGERED"])
        )
        r64_cnt = str(
            int(base["R1_PRIMARY_TRIGGERED"])
            + int(r2_info["R2_RIVER_TRIGGERED"])
            + int(base["R3_R64_TRIGGERED"])
        )
        watchlist = (
            "1"
            if (
                base["R3_R50_TRIGGERED"] == "1"
                and base["R1_PRIMARY_TRIGGERED"] == "0"
                and r2_info["R2_RIVER_TRIGGERED"] == "0"
            )
            else "0"
        )

        b7_rec = {
            "GID_3": gid,
            "NAME_3": base["NAME_3"],
            "NAME_2": base["NAME_2"],
            "NAME_1": base["NAME_1"],
            "LON": base["LON"],
            "LAT": base["LAT"],
            "GRID_CELL_ID": base["GRID_CELL_ID"],
            "MAX_24H_RAIN_MM": base["MAX_24H_RAIN_MM"],
            "R1_PRIMARY_TRIGGERED": base["R1_PRIMARY_TRIGGERED"],
            "R1_TRIGGER_REASON": base["R1_TRIGGER_REASON"],
            "R1_OBS_TIME_ICT": base["R1_OBS_TIME_ICT"],
            "R1_TRIGGER_TIME_ICT": base["R1_TRIGGER_TIME_ICT"],
            "R1_LAG_HOURS": base["R1_LAG_HOURS"],
            "R2_RIVER_TRIGGERED": r2_info["R2_RIVER_TRIGGERED"],
            "R2_STATION_NAME": r2_info["R2_STATION_NAME"],
            "R2_MATCHED_RIVERS": r2_info["R2_MATCHED_RIVERS"],
            "R2_HAND_ELIGIBLE": geo["R2_HAND_ELIGIBLE"],
            "HAND_LE10_SHARE_COMMUNE_PCT": geo["HAND_LE10_SHARE_COMMUNE_PCT"],
            "R2_NEAREST_DISTANCE_KM": geo["NEAREST_DISTANCE_KM"],
            "R2_STATION_ASSIGNMENT_STATUS": geo["STATION_ASSIGNMENT_STATUS"],
            "R2_PEAK_TIME_ICT": r2_info["R2_PEAK_TIME_ICT"],
            "R2_FIRST_BD3_BULLETIN_ISSUE_ICT": r2_info["R2_FIRST_BD3_BULLETIN_ISSUE_ICT"],
            "R2_STATUS": r2_info["R2_STATUS"],
            "R3_R50_TRIGGERED": base["R3_R50_TRIGGERED"],
            "R3_R50_TRIGGER_TIME_ICT": base["R3_R50_TRIGGER_TIME_ICT"],
            "R3_R50_LAG_HOURS": base["R3_R50_LAG_HOURS"],
            "R3_R64_TRIGGERED": base["R3_R64_TRIGGERED"],
            "R3_R64_TRIGGER_TIME_ICT": base["R3_R64_TRIGGER_TIME_ICT"],
            "R3_R64_LAG_HOURS": base["R3_R64_LAG_HOURS"],
            "ANY_R1_OR_R3_R50_TRIGGERED": base["ANY_R1_OR_R3_R50_TRIGGERED"],
            "ANY_R1_OR_R3_R64_TRIGGERED": base["ANY_R1_OR_R3_R64_TRIGGERED"],
            "R50_R1_R2_R3_TRIGGERED": r50_flag,
            "R50_R1_R2_R3_TRIGGER_TIME_ICT": r50_time,
            "R50_R1_R2_R3_LAG_HOURS": r50_lag,
            "R50_R1_R2_R3_TIME_STATUS": r50_tstat,
            "R50_R1_R2_R3_OUTCOME": r50_out,
            "R50_RULES_ACTIVE_COUNT": r50_cnt,
            "R64_R1_R2_R3_TRIGGERED": r64_flag,
            "R64_R1_R2_R3_TRIGGER_TIME_ICT": r64_time,
            "R64_R1_R2_R3_LAG_HOURS": r64_lag,
            "R64_R1_R2_R3_TIME_STATUS": r64_tstat,
            "R64_R1_R2_R3_OUTCOME": r64_out,
            "R64_RULES_ACTIVE_COUNT": r64_cnt,
            "R1_OR_R2_1TAP_TRIGGERED": onetap_flag,
            "R1_OR_R2_1TAP_TRIGGER_TIME_ICT": onetap_time,
            "R1_OR_R2_1TAP_LAG_HOURS": onetap_lag,
            "R1_OR_R2_1TAP_TIME_STATUS": onetap_tstat,
            "R1_OR_R2_1TAP_OUTCOME": onetap_out,
            "R3_ONLY_R50_WATCHLIST": watchlist,
            "ELIGIBLE_LAND_ALL_M2": base["ELIGIBLE_LAND_ALL_M2"],
            "UNOSAT_ANALYZED_ELIGIBLE_M2": base["UNOSAT_ANALYZED_ELIGIBLE_M2"],
            "UNOSAT_FLOODED_ELIGIBLE_M2": base["UNOSAT_FLOODED_ELIGIBLE_M2"],
            "UNOSAT_ANALYSIS_COVERAGE_PCT": base["UNOSAT_ANALYSIS_COVERAGE_PCT"],
            "UNOSAT_FLOOD_PCT_ANALYZED_LAND": base["UNOSAT_FLOOD_PCT_ANALYZED_LAND"],
            "UNOSAT_FLOOD_LABEL_95_5": label,
            "UNOSAT_REFERENCE_STATUS": ref_status,
            "B7_MAPPED_STATUS": B7_STATUS_LABEL,
        }
        b7_rows.append(b7_rec)

        m_rec = {col: base[col] for col in BASELINE_37_COLS}
        m_rec["R2_RIVER_TRIGGERED"] = r2_info["R2_RIVER_TRIGGERED"]
        m_rec["R2_MAPPING_STATUS"] = r2_info["R2_STATUS"]
        for extra_col in (
            "R2_STATION_NAME",
            "R2_MATCHED_RIVERS",
            "R2_PEAK_TIME_ICT",
            "R2_FIRST_BD3_BULLETIN_ISSUE_ICT",
            "R50_R1_R2_R3_TRIGGERED",
            "R50_R1_R2_R3_TRIGGER_TIME_ICT",
            "R50_R1_R2_R3_LAG_HOURS",
            "R50_R1_R2_R3_TIME_STATUS",
            "R50_R1_R2_R3_OUTCOME",
            "R50_RULES_ACTIVE_COUNT",
            "R64_R1_R2_R3_TRIGGERED",
            "R64_R1_R2_R3_TRIGGER_TIME_ICT",
            "R64_R1_R2_R3_LAG_HOURS",
            "R64_R1_R2_R3_TIME_STATUS",
            "R64_R1_R2_R3_OUTCOME",
            "R64_RULES_ACTIVE_COUNT",
            "R1_OR_R2_1TAP_TRIGGERED",
            "R1_OR_R2_1TAP_TRIGGER_TIME_ICT",
            "R1_OR_R2_1TAP_LAG_HOURS",
            "R1_OR_R2_1TAP_TIME_STATUS",
            "R1_OR_R2_1TAP_OUTCOME",
            "R3_ONLY_R50_WATCHLIST",
            "B7_MAPPED_STATUS",
        ):
            m_rec[extra_col] = b7_rec[extra_col]
        updated_master_rows.append(m_rec)

    with B7_OUT_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(b7_rows[0]))
        writer.writeheader()
        writer.writerows(b7_rows)

    with MASTER_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(updated_master_rows[0]))
        writer.writeheader()
        writer.writerows(updated_master_rows)

    # Hard verification assertions matching verified invariants
    r2_on = sum(1 for r in b7_rows if r["R2_RIVER_TRIGGERED"] == "1")
    r2_off = sum(1 for r in b7_rows if r["R2_RIVER_TRIGGERED"] == "0")
    st_counts = Counter(r["R2_STATION_NAME"] or "NONE" for r in b7_rows)
    s_r50 = summarize_stream(b7_rows, "R50_R1_R2_R3")
    s_r64 = summarize_stream(b7_rows, "R64_R1_R2_R3")
    s_1tap = summarize_stream(b7_rows, "R1_OR_R2_1TAP")
    wl_count = sum(1 for r in b7_rows if r["R3_ONLY_R50_WATCHLIST"] == "1")

    assert r2_on == 215 and r2_off == 2680
    assert st_counts["Dap Cau"] == 71
    assert st_counts["Yen Bai"] == 48
    assert st_counts["Pha Lai"] == 45
    assert st_counts["Phu Lang Thuong"] == 29
    assert st_counts["Vu Quang"] == 22
    assert st_counts["Ha Noi"] == 109
    assert (s_r50["tp"], s_r50["fp"], s_r50["fn"], s_r50["tn"], s_r50["unclass"]) == (
        655,
        1740,
        63,
        82,
        355,
    )
    assert s_r50["tp_known"] == 618 and s_r50["tp_med_lag"] == -1.5
    assert (s_1tap["tp"], s_1tap["fp"], s_1tap["fn"], s_1tap["tn"]) == (334, 918, 384, 904)
    assert s_1tap["triggered"] == 1338

    print("=== VERIFIED DATASET SUMMARY (2,895 COMMUNES) ===")
    print(f"R2 station breakdown: {dict(st_counts)}")
    print(f"R2=1: {r2_on} | R2=0: {r2_off}")
    print(f"Strict R50 (R1|R2|R3_R50): {s_r50}")
    print(f"Strict R64 (R1|R2|R3_R64): {s_r64}")
    print(f"Strict R1|R2 (1-Tap):      {s_1tap}")
    print(f"R3-only Watchlist (R50):   {wl_count}")

    for k in ("0", "1", "2", "3"):
        sub = [r for r in b7_rows if r["R50_RULES_ACTIVE_COUNT"] == k and r["UNOSAT_REFERENCE_STATUS"] == "CLASSIFIABLE"]
        c = Counter(r["R50_R1_R2_R3_OUTCOME"] for r in sub)
        tot = sum(c.values())
        tp = c["TP"]
        rate = (tp / tot * 100.0) if tot else 0.0
        print(f"  R50 active_rules={k}: TP={tp}, FP={c['FP']}, FN={c['FN']}, TN={c['TN']} (flood_rate={rate:.2f}%)")

    print("=== SENSITIVITY SWEEPS ===")
    for label, yb_t, pl_t, dp_st in (
        ("YB=19:00 | PL=21:00 | DP=PLT", "2024-09-08 19:00:00", "2024-09-11 21:00:00", "Phu Lang Thuong"),
        ("YB=21:00 | PL=21:00 | DP=PLT", "2024-09-08 21:00:00", "2024-09-11 21:00:00", "Phu Lang Thuong"),
        ("YB=21:47 | PL=21:00 | DP=PLT", "2024-09-08 21:47:00", "2024-09-11 21:00:00", "Phu Lang Thuong"),
        ("YB=22:38 | PL=21:00 | DP=PLT", "2024-09-08 22:38:00", "2024-09-11 21:00:00", "Phu Lang Thuong"),
        ("YB=21:00 | PL=15:30(prov) | DP=PLT", "2024-09-08 21:00:00", "2024-09-11 15:30:00", "Phu Lang Thuong"),
        ("YB=21:00 | PL=21:00 | DP=DapCau", "2024-09-08 21:00:00", "2024-09-11 21:00:00", "Dap Cau"),
    ):
        res = run_sensitivity(master_rows, crosswalk_by_id, peaks, bulletins, yb_t, pl_t, dp_st)
        print(f"  {label}:")
        print(f"    R50 : n={res['R50']['tp_known']}, med={res['R50']['tp_med_lag']}h, <=72h={res['R50']['tp_le72h']}")
        print(f"    R64 : n={res['R64']['tp_known']}, med={res['R64']['tp_med_lag']}h, <=72h={res['R64']['tp_le72h']}")
        print(f"    1Tap: n={res['R1R2']['tp_known']}, med={res['R1R2']['tp_med_lag']}h, <=72h={res['R1R2']['tp_le72h']}, range=[{res['R1R2']['tp_min_lag']}, {res['R1R2']['tp_max_lag']}]h")


if __name__ == "__main__":
    main()


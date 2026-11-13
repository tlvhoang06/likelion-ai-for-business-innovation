"""Create a compact, geometry-free copy of the verified Earth Engine CSV."""

import csv
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "B6_GADM41_Yagi_S1_metrics_UNSPIDER_dB_ALL_ORBITS_v2_raw.csv"
OUTPUT = HERE / "B6_GADM41_Yagi_S1_metrics_UNSPIDER_dB_ALL_ORBITS_v2.csv"
FIELDS = [
    "GID_3",
    "NAME_3",
    "NAME_1",
    "ELIGIBLE_M2",
    "DESCENDING_COVERAGE_PCT",
    "DESCENDING_FLOOD_PCT_VALID_LAND",
    "DESCENDING_ELIGIBLE_LAND_M2",
    "DESCENDING_VALID_LAND_M2",
    "DESCENDING_FLOODED_LAND_M2",
    "DESCENDING_FLOOD_LABEL_95_5",
    "DESCENDING_FLOOD_LABEL_ANY_COVERAGE_SENSITIVITY",
]

with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
    reader = csv.DictReader(stream)
    missing = set(FIELDS) - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"Missing export fields: {sorted(missing)}")
    rows = list(reader)

gids = [row["GID_3"] for row in rows]
if len(rows) != 2895 or len(set(gids)) != len(rows):
    raise ValueError(f"Expected 2,895 unique GID_3 rows; got {len(rows)} rows")

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows({field: row.get(field, "") for field in FIELDS} for row in rows)

print(f"Wrote {len(rows)} unique communes to {OUTPUT.name}")

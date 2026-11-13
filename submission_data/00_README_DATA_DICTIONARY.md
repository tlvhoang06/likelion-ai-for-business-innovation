# ResiLend — Empirical Dataset & Reproducibility Package (Typhoon Yagi Backtest)

**Project:** ResiLend — Shared Parametric Trigger and AI-Assisted Triage Infrastructure for Post-Disaster Agricultural Debt Relief  
**Team:** EK15 (Trần Văn Nhân · Lê Hoài Tuấn Khang · Trương Lê Vũ Hoàng · Nguyễn Đức Nguyên)  
**Interactive Web MVP:** https://resilend-demo.vercel.app  
**Google Colab Pipeline (R1 Rainfall & R3 Wind):** https://colab.research.google.com/drive/10927s5nI2yybFuMyMTwYHnHxJmNZh-Sc?usp=sharing  
**Spatial Scope:** 2,895 Communes (`GID_3`, GADM v4.1 pre-2025 administrative boundaries) across 12 Northern Vietnamese Provinces (`Bắc Giang`, `Bắc Ninh`, `Hà Nội`, `Hải Dương`, `Hải Phòng`, `Hưng Yên`, `Lào Cai`, `Ninh Bình`, `Phú Thọ`, `Quảng Ninh`, `Thái Nguyên`, `Yên Bái`).  
**Temporal Window:** Typhoon Yagi (06–15 September 2024; Vietnam landfall baseline `2024-09-07 13:30 ICT`).

---

## 1. Directory Contents & File Overview

| File Name | Rows | Description & Primary Source |
| :--- | :---: | :--- |
| **`01_ResiLend_Yagi_Master_2895_Communes.csv`** | **2,895** | **Unified Master Commune Table** joining `R1` extreme rainfall triggers, `R3` (`R50`/`R64`) typhoon wind triggers, `UNOSAT 3966` flood benchmark metrics, and `Sentinel-1 SAR` flood screen metrics across all 2,895 communes. |
| **`02_R1_Extreme_Rain_Triggered_Communes_1169.csv`** | **1,169** | Communes triggered by **`R1` Extreme Rainfall** (`>200 mm/24h` or `≥3 consecutive days ≥100 mm/day` under **Art. 44, Decision 18/2021/QĐ-TTg**), computed on hourly `JAXA GSMaP v8` with a +4h operational feed latency (`40.4%` of 2,895 communes). |
| **`03_R1_Sensitivity_100mm_Communes_2886.csv`** | **2,886** | Lower-bound sensitivity test at `>100 mm/24h` (`99.7%` of 2,895 communes), demonstrating why `100 mm/24h` is too broad and justifying the statutory `200 mm/24h` threshold. |
| **`03b_R1_Sensitivity_300mm_Communes_0.csv`** | **0** | Upper-bound sensitivity test at `>300 mm/24h` (`0%` of 2,895 communes triggered on the `0.1°` `GSMaP v8` grid), demonstrating why `300 mm/24h` is overly restrictive on satellite-averaged grid cells. |
| **`04_R2_NCHMF_River_Station_Peaks_11.csv`** | **11** | Official **NCHMF River Gauge Peaks** from the *Viet Nam Member Report 2024 to ESCAP/WMO Typhoon Committee (Table 1.4)* evaluated against **Alert Level 3 (`BĐ3`, Decision 05/2020/QĐ-TTg)**. `10 / 11` gauges exceeded `BĐ3` (`59.5–126.5h` post-landfall); Hanoi peaked at `11.30m` (`0.20m` below `11.50m` `BĐ3`). |
| **`05_R3_Wind_R50_Triggered_Communes_2622.csv`** | **2,622** | Communes intersected by the asymmetric 4-quadrant **`R50` (`≥50 kt`)** wind swath from `NOAA IBTrACS v04r01` (`90.6%` of 2,895 communes), with exact UTC+7 trigger timestamps. |
| **`06_R3_Wind_R64_Triggered_Communes_1879.csv`** | **1,879** | Communes intersected by the **`R64` (`≥64 kt`)** inner hurricane-force wind core (`64.9%` of 2,895 communes), used as a lower-bound sensitivity test for wind-averaging scale differences (1-min JTWC vs. 10-min Vietnam standard). |
| **`07_UNOSAT_3966_Flood_Benchmark_2895_Communes.csv`** | **2,895** | Primary **UNOSAT Product 3966** (`12 Sep 2024` Red River Delta) commune-level flood benchmark over eligible agricultural (`40`) and built-up (`50`) land (`ESA WorldCover 2021`, slope `≤5°`, excluding permanent water). Contains **2,540 classifiable communes** (`≥95%` coverage: **718 flooded `≥5%`**, **1,822 `<5%`**) and **355 communes outside scan footprint**. |
| **`08_Sentinel1_SAR_Flood_Screen_2895_Communes.csv`** | **2,895** | Supplementary **Copernicus Sentinel-1 SAR** (`VH` descending pass, `20 Aug–07 Sep` vs. `08–21 Sep 2024`, `after/before > 1.25`) flood screen across all 2,895 communes (**2,774 communes `≥95%` coverage**: **101 flood-flagged**, **2,673 below cutoff**, **121 low coverage**). |
| **`UNOSAT_3966_AnalysisExtent_RedRiverDelta_20240912.zip`** | Shapefile | Official UNOSAT Product 3966 Red River Delta analysis extent shapefile archive (`EPSG:4326`) used to separate inside-footprint (`2,540`) from outside-footprint (`355`) communes. |
| **`scripts/ResiLend_R1_R3_Colab_Pipeline.ipynb`** | Notebook | End-to-end Google Colab Jupyter Notebook ingesting `GADM v4.1` boundaries (`2,895` communes), modeling 4-quadrant `IBTrACS` wind swaths (`R50`/`R64`), and computing `GSMaP v8` rolling rainfall triggers (`R1`) across `307` grid cells. |
| **`scripts/gee_unosat_3966_commune_benchmark.js`** | Code | Google Earth Engine script producing `07_UNOSAT_3966_Flood_Benchmark_2895_Communes.csv`. |
| **`scripts/gee_sentinel1_sar_commune_flood_screen.js`** | Code | Google Earth Engine script producing `08_Sentinel1_SAR_Flood_Screen_2895_Communes.csv`. |
| **`scripts/prepare_unosat_3966_shapefiles.py`** | Code | Python (`GeoPandas` + `Shapely`) script repairing the 35,036-part UNOSAT flood multipolygon while preserving area invariance (`< 10⁻⁶` relative delta). |
| **`scripts/normalize_sentinel1_gee_export.py`** | Code | Python script normalizing raw Google Earth Engine CSV exports (stripping `.geo` and `system:index` columns). |

---

## 2. Key Schema & Column Definitions (`01_ResiLend_Yagi_Master_2895_Communes.csv`)

- **`GID_3`, `NAME_3`, `NAME_2`, `NAME_1`:** GADM v4.1 unique commune identifier, commune name, district name, and province name.
- **`LON`, `LAT`, `GRID_CELL_ID`:** Commune centroid coordinates (`EPSG:4326`) and matched `0.1° × 0.1°` `GSMaP v8` grid cell ID.
- **`MAX_24H_RAIN_MM`:** Peak rolling 24-hour rainfall accumulation (mm) during 06–12 September 2024 (`GSMaP v8`).
- **`R1_PRIMARY_TRIGGERED`, `R1_TRIGGER_REASON`, `R1_OBS_TIME_ICT`, `R1_TRIGGER_TIME_ICT`, `R1_LAG_HOURS`:** Boolean trigger flag under Art. 44 Decision 18/2021/QĐ-TTg (`>200 mm/24h` or `3d ≥100 mm/day`), meteorological observation time, operational trigger time (+4h latency), and hours elapsed relative to landfall (`2024-09-07 13:30 ICT`).
- **`R3_R50_TRIGGERED`, `R3_R50_TRIGGER_TIME_ICT`, `R3_R50_LAG_HOURS`:** Boolean flag and first intersection timestamp for the 4-quadrant `R50` (`≥50 kt`) storm-force wind footprint (`IBTrACS`).
- **`R3_R64_TRIGGERED`, `R3_R64_TRIGGER_TIME_ICT`, `R3_R64_LAG_HOURS`:** Boolean flag and first intersection timestamp for the 4-quadrant `R64` (`≥64 kt`) hurricane-force wind core (`IBTrACS`).
- **`ANY_R1_OR_R3_R50_TRIGGERED` / `ANY_R1_OR_R3_R64_TRIGGERED`:** Combined deterministic trigger status (`2,622 / 2,895 = 90.6%` under `R1 ∪ R3_R50`; `2,047 / 2,895 = 70.7%` under `R1 ∪ R3_R64`).
- **`R2_RIVER_TRIGGERED`, `R2_MAPPING_STATUS`:** Left blank at the commune level (`STATION_LEVEL_ONLY_PENDING_GID3_CROSSWALK`); gauge-level records are provided in `04_R2_NCHMF_River_Station_Peaks_11.csv` to avoid unverified administrative distance heuristics.
- **`ELIGIBLE_LAND_ALL_M2`, `UNOSAT_ANALYZED_ELIGIBLE_M2`, `UNOSAT_FLOODED_ELIGIBLE_M2`:** Total eligible cropland + built-up area ($m^2$, slope $\le 5^\circ$, excluding permanent water), eligible area covered by the UNOSAT 3966 analysis footprint, and eligible area mapped as flooded by UNOSAT 3966.
- **`UNOSAT_ANALYSIS_COVERAGE_PCT`, `UNOSAT_FLOOD_PCT_ANALYZED_LAND`, `UNOSAT_FLOOD_LABEL_95_5`, `UNOSAT_REFERENCE_STATUS`:** Share of eligible land inside the UNOSAT analysis footprint, flooded share of analyzed eligible land, binary flood benchmark (`1` if coverage $\ge 95\%$ and flood share $\ge 5\%$; `0` if coverage $\ge 95\%$ and flood share $< 5\%$; blank if coverage $< 95\%$), and coverage classification (`CLASSIFIABLE` vs. `PARTIAL_OR_NO_ANALYSIS_COVERAGE`).
- **`S1_DESCENDING_COVERAGE_PCT`, `S1_FLOOD_PCT_VALID_LAND`, `S1_FLOOD_LABEL_95_5`:** Sentinel-1 SAR descending pass VH coverage percentage, flooded share of valid eligible land (`after/before > 1.25`), and binary flood screen flag (`1` if coverage $\ge 95\%$ and flood share $\ge 5\%$).

---

## 3. Summary Verification Statistics

1. **Total Monitored Communes:** `2,895` unique `GID_3` units (`12` Northern provinces).
2. **`R1` Extreme Rain (`>200 mm/24h`):** `1,169 / 2,895` communes (`40.4%`), triggered from `-2.5h` to `+118.5h` relative to landfall.
3. **`R3` Typhoon Wind (`IBTrACS`):** `2,622 / 2,895` communes (`90.6%`) under `R50`; `1,879 / 2,895` (`64.9%`) under `R64`.
4. **`R2` Hydrological Gauges (`Decision 05/2020/QĐ-TTg`):** `10 / 11` gauges exceeded `BĐ3` (`59.5h–126.5h` post-landfall); Hanoi peaked at `11.30m` (`BĐ2`, `0.20m` below `11.50m` `BĐ3`).
5. **`UNOSAT 3966` Benchmark (`12 Sep 2024`):** `2,540` classifiable communes (`718` flooded `≥5%`, `1,822` `<5%`) + `355` outside scan footprint (preserved as *Unknown*).
6. **`Sentinel-1 SAR` Screen (`08–21 Sep 2024`):** `2,774` communes with `≥95%` coverage (`101` flood-flagged, `2,673` below cutoff) + `121` low/zero coverage (`5` partial, `116` zero).

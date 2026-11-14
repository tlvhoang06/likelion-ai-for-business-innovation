# ResiLend — Internal Provenance & B7 Retrospective Evaluation Report

**Scope:** Internal engineering provenance audit and reproducible closure of the ResiLend Typhoon Yagi (`06–15 Sep 2024`, landfall baseline `2024-09-07 13:30:00 ICT`) preliminary retrospective evaluation across `2,895` GADM v4.1 communes (`12` Northern provinces of Viet Nam). *(External submission prose retains "preliminary retrospective test" / "chạy thử sơ bộ" rather than presenting dataset artifacts as independently certified.)*  
**Primary Generator Script:** [scripts/build_b7_verified_dataset.py](https://drive.google.com/file/d/1vnxgW9FkmpmgSfVkkX7q8XexPPdohwdO/view) *(Drive folder: [Check của Nguyên/](https://drive.google.com/drive/folders/1i7rZqmkjR9kVSBcwPH6opKgXnEa-M-eq) · [scripts/](https://drive.google.com/drive/folders/1TbJ1hxc2Vjgwse_MfCxGPz38roCz-SKH))*  
**Evaluation Outputs & Core Inputs:**
- [10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv](https://drive.google.com/file/d/1k7iUwfKI9pzjAa8XxDDkADW-uS4rP0O4/view) (`2,895` rows — retrospective B7 R1/R2/R3 + UNOSAT join)
- [01_ResiLend_Yagi_Master_2895_Communes.csv](https://drive.google.com/file/d/1Q6RyKhBPiSVBL0evgXfABptUJzC85GAg/view) (`2,895` rows — original untouched 37-column baseline preserved by default; pass `--update-master` to overwrite in place)
- [04b_R2_Bulletin_Trigger_Evidence_11.csv](https://drive.google.com/file/d/1Kmuwi40VEoZqh_XJu2N5UXw25dfUBE7V/view) (`11` NCHMF stations)
- [09_R2_GADM41_Commune_Crosswalk_2895.csv](https://drive.google.com/file/d/1hSK_vY1PSg9Xztyj-1dxZPuiqZOE69dQ/view) (`2,895` communes, `0` unresolved multi-river confluences)

---

## 1. Execution Provenance & Checksums

| Pipeline Stage | Verification Source | Key Provenance Evidence | SHA-256 / Metrics |
| :--- | :--- | :--- | :--- |
| **B6 UNOSAT 3966 Benchmark** | Google Earth Engine (`projects/resilend`) + [scripts/gee_unosat_3966_commune_benchmark.js](https://drive.google.com/file/d/10N-GVHlc3cR9M4EDeU9K2lmHn2RPUXXq/view) | GEE Tasks `TFLUMEYJJWHJN7UTQJQ5GGCN` (`Completed`, `2m`, `started 2026-11-11 13:42:14 +0700`, `Attempt #1`, `36366.8242 EECU-s`) and `NYJMI2IASYGTL5WGXAIHLYBR` (`Completed`, `1m`, `started 2026-11-11 13:22:00 +0700`, `28750.9883 EECU-s`). Assets: `communes_gadm41_12prov`, `UNOSAT_3966_AnalysisExtent_RedRiverDelta_20240912`, `UNOSAT_3966_FloodExtent_RedRiverDelta_20240912_valid`. | `07_UNOSAT_3966_Flood_Benchmark_2895_Communes.csv`: `b5e96523ed3062d79674b2f1b36c8c62e64a74fd2a9bff5ba617fc00dc023177`; `2,540` classifiable (`718` flooded $\ge 5\%$, `1,822` $< 5\%$), `355` unclassifiable (`PARTIAL_OR_NO_ANALYSIS_COVERAGE`). |
| **R1 Rainfall (Art. 44 Decision 18/2021/QĐ-TTg)** | [scripts/ResiLend_R1_R3_Colab_Pipeline.ipynb](https://drive.google.com/file/d/1OZr7dfAWzZGt-0AKzI_a0Qe9HtAyCpLP/view) (Cell 9 saved output) | `JAXA/GPM_L3/GSMaP/v8/operational`, `240` hourly images (`20240904_1200` UTC start), `307 NATIVE GRID CELLS`, `0 NaNs`, `105` triggered grid cells (`0` mixed-outcome cells). Both statutory branches executed: `24h Branch (>200mm): 1,169` and `3-Day Branch (>=100mm/d): 0`. | `02_R1_Extreme_Rain_Triggered_Communes_1169.csv`: `1f6bbbdaf9c2f1e1c37a281f7aeb446d27805c3ed324c0071cdab8b5439b2d53`; `1,169 / 2,895` (`40.4%`), median lag `+17.5h` (`range [+4.5, +72.5]h`). |
| **R3 Wind Swaths** | `IBTrACS v04r01` in [scripts/ResiLend_R1_R3_Colab_Pipeline.ipynb](https://drive.google.com/file/d/1OZr7dfAWzZGt-0AKzI_a0Qe9HtAyCpLP/view) | Asymmetric 4-quadrant wind swath intersection per `GID_3`. | `R3_R50`: `2,622 / 2,895` (`90.6%`), lag `[-12.5, +15.5]h`; `R3_R64`: `1,879 / 2,895` (`64.9%`), lag `[-7.5, +10.5]h`. |
| **R2 HAND Screening** | [scripts/gee_r2_hand_gadm41_screen.js](https://drive.google.com/file/d/1jSLS7prSzwB5tFjmiH3B7N9-2nL9R7mL/view) | `MERIT/Hydro/v1_0_1` (`hnd <= 10 m`, `92.77 m` scale) over `projects/resilend/assets/communes_gadm41_12prov`. | Joined via [09_R2_GADM41_Commune_Crosswalk_2895.csv](https://drive.google.com/file/d/1hSK_vY1PSg9Xztyj-1dxZPuiqZOE69dQ/view). |

---

## 2. R2 Crosswalk Resolution (Confluences)

Following the exact approved `REVIEWED_NEAREST_STATION_ON_INTERSECTING_RIVER` rule previously applied to `Bến Gót` (`VNM.44.12.2_1` $\rightarrow$ `Vu Quang`, `38.3 km`), the remaining `2` multi-river confluences in `09_R2_GADM41_Commune_Crosswalk_2895.csv` were resolved using official Vietnamese hydrological coordinates (`Quyết định 16/2007/QĐ-TTg` and Bộ Nông nghiệp & Môi trường report `1_Baocaotonghop.pdf` Tables 1-2 & 1-3):

1. **`VNM.3.9.2_1` (`Đồng Phúc`, Bắc Giang):** Intersects `Sông Cầu` (`1.9600 km`, representative point `21.1326°N, 106.2813°E`) and `Sông Thương` (`1.8076 km`, representative point `21.1282°N, 106.3051°E`).
   - Distance to **`Phủ Lạng Thương`** (`Sông Thương`): **`21.375 km`** using `QĐ 16/2007/QĐ-TTg` (`21°17'N, 106°11'E`), or `22.439 km` using `MAE Report Table 1-3` (`21°17'N, 106°10'E`).
   - Distance to **`Đáp Cầu`** (`Sông Cầu`): `23.484 km` using `MAE Report Table 1-3` (`21°12'N, 106°04'E`), or `22.081 km` using `MAE Report Table 1-2` meteorology coordinate (`21°12'30"N, 106°05'04"E`).
   - **Assigned:** **`Phu Lang Thuong`** (`21.375 km`), matching both hydrological reference tables (`QĐ 16/2007` and `MAE Table 1-3`) and Bắc Giang jurisdiction. Because `Đồng Phúc` already triggered `R3_R50` on `2024-09-07 11:00:00`, its `R50` and `R64` trigger times are invariant; its `R2_RIVER_TRIGGERED` moves from `blank` to `1` (`TP` under UNOSAT).
2. **`VNM.5.4.7_1` (`Đức Long`, Bắc Ninh):** Intersects `Sông Thái Bình` (`1.6691 km`, `21.1152°N, 106.2947°E`), `Sông Cầu` (`1.0939 km`), and `Sông Thương` (`0.0942 km`).
   - Distance to **`Phả Lại`** (`Sông Thái Bình`): **`0.327 km`** using `MAE Report Table 1-2` (`21°06'57"N, 106°17'52"E`), or `2.061 km` using `QĐ 16/2007/QĐ-TTg` (`21°06'N, 106°17'E`) — vs. `>20 km` to `Đáp Cầu` or `Phủ Lạng Thương`.
   - **Assigned:** **`Pha Lai`** (`0.327 km`). Already triggered `R3_R50` on `2024-09-07 11:00:00` (`FP` under UNOSAT).

**Final R2 Station Assignment Distribution across `2,895` Communes:**
- `R2_RIVER_TRIGGERED = 1` (**`215`** communes): `Dap Cau: 71`, `Yen Bai: 48`, `Pha Lai: 45`, `Phu Lang Thuong: 29`, `Vu Quang: 22`.
- `R2_RIVER_TRIGGERED = 0` (**`2,680`** communes): `Ha Noi: 109` (`11.30 m < 11.50 m BĐ3` peak), `NONE / no selected named-river intersection: 2,571`.
- Unresolved `MULTIPLE_RIVERS_REVIEW`: **`0`**.

---

## 3. R2 First-BĐ3 Bulletin Evidence Updates

In [04b_R2_Bulletin_Trigger_Evidence_11.csv](https://drive.google.com/file/d/1Kmuwi40VEoZqh_XJu2N5UXw25dfUBE7V/view), `R2_FIRST_BD3_BULLETIN_ISSUE_ICT` timestamps were documented with explicit provenance status (direct bulletin verification vs. schedule inference vs. bounded unknown):

1. **`Vu Quang` (`Sông Lô`, BĐ3 `20.50 m`) $\rightarrow$ Inferred from NCHMF bulletin schedule `2024-09-11 03:30:00 ICT`** (`+86.0h` post-landfall; `INFERRED_FROM_0330_BULLETIN_SCHEDULE` in `04b` / `ASSIGNED_BD3_INFERRED_BULLETIN_SCHEDULE` in `10_B7`)
   - Below BĐ3: `2024-09-10 19:00:00` obs = `20.28 m` (`-0.22 m` below BĐ3) in NCHMF `21:00 10/09` bulletin (cited by `danviet.vn/...-d1183472.html`, `tuoitre.vn/...2024091022231979.htm`, `muctim.tuoitre.vn/...101240910214727997.htm`).
   - Above BĐ3: `2024-09-11 01:00:00` obs = `20.71 m` (`+0.21 m` above BĐ3). `thanhnien.vn/...185240911053422461.htm` prints the complete `1 giờ ngày 11.9` table (`Đáp Cầu 6,99 m`, `Vụ Quang 20,71 m`) without stating a bulletin release timestamp, while `tuoitre.vn/nld/...196240911115524832.htm` mentions `"hồi 3 giờ 30 phút ngày 11-9"` ambiguously (water observation vs. bulletin issue time). Because the raw NCHMF `2024-09-11 03:30` PDF was not directly opened, `03:30` is explicitly flagged as **inferred from NCHMF bulletin schedule**, not directly verified. All `22` `Vu Quang` communes have `R1 = 0` and exhibit `+86.0h` (`> 72h`) regardless of whether `03:30` or peak `07:00` is used.
2. **`Pha Lai` (`Sông Thái Bình`, BĐ3 `6.00 m`) $\rightarrow$ Verified `2024-09-11 21:00:00 ICT`** (`+103.5h` post-landfall under NCHMF national stream)
   - Below BĐ3 (NCHMF): `2024-09-11 13:00:00` obs = `5.98 m` (`-0.02 m` below BĐ3) in NCHMF `15:30 11/09` bulletin (`daidoanket.vn/...-10290016.html`, `hanoimoi.vn/...-1285730.html`).
   - Above BĐ3 (NCHMF): `2024-09-11 19:00:00` obs = `6.13 m` (`+0.13 m` above BĐ3) in NCHMF **`21:00 11/09`** bulletin (`dbqg_lulu_20240911_2100.pdf` and `tuoitre.vn/plo/...109809728.htm`).
   - **Transparency Note & Invariance:** Hai Duong provincial hydrometeorological bulletin separately reported `15h = 6.01 m` at `15:30 11/09`, and MARD reported `17h = 6.05 m` (`bnews.vn/.../346728.html`). However, all `45 / 45` Pha Lai communes had already triggered `R3_R50` on `2024-09-07`, and `44 / 45` had triggered `R1` by `2024-09-08` (the single commune without `R1` is newly assigned confluence `Đức Long`, `VNM.5.4.7_1`, which has `R1 = 0`, triggered `R3_R50` on `2024-09-07`, and is `FP` under UNOSAT). Therefore, switching `Pha Lai` between `15:30` and `21:00` causes **zero change** in `R50`, `R64`, or `R1|R2` trigger flags, UNOSAT outcomes, or `TP` lag statistics.
3. **`Yen Bai` (`Sông Thao`, BĐ3 `32.00 m`) $\rightarrow$ Blank in strict CSV, Tightly Bounded in `[2024-09-08 19:00, 2024-09-08 21:47] ICT`**
   - Below BĐ3: `2024-09-08 15:00:00` obs = `31.40 m` (`-0.60 m` below BĐ3; `daidoanket.vn/...-10289651.html`).
   - First above BĐ3: `2024-09-08 19:00:00` obs = `32.50 m` (`+0.50 m` above BĐ3; `nhandan.vn/...-post829418.html` `2024-09-08T22:38:59+07:00`, `congthuong.vn/...-344402.html`). Furthermore, `danviet.vn/...-20240908213539921-d1183040.html` (`2024-09-08 21:47:00 ICT`) already reported an NCHMF emergency bulletin above BĐ3.
   - **Zero-Guessing Compliance:** Because the raw `kttv.gov.vn` `2024-09-08` PDF cannot be downloaded directly (WAF 403 / Wayback HTTP 429) to confirm the exact header issue minute within `[19:00, 21:47]`, `FIRST_BD3_BULLETIN_ISSUE_ICT` remains strictly blank (`""`) in `04b` and `10_B7`.
   - **Peak Time Field (`FIRST_OBSERVED_BD3_ICT` in `04`):** Remains intentionally blank across all 11 stations because `Typhoon Committee Member Report Table 1.4` provides peaks only (`trigger_time_ict = peak_time`), not first-crossing timestamps.

---

## 4. Retrospective Evaluation Metrics & Dual-Track Comparison (`2,540` Classifiable UNOSAT Communes)

*(Note: `355` out-of-footprint communes remain `UNCLASSIFIABLE_UNOSAT` in all confusion matrices; `R50` active counts total `2,895` = `2,540` classifiable + `355` unclassifiable.)*

| Trigger Stream | Triggered (`/ 2,895`) | `TP` | `FP` | `FN` | `TN` | Precision | Recall | Strict Known `TP` Lag | Headline Median Lag (`YB [19:00..22:38]` Invariant) | `<= 72h` (`YB` sensitivity) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`R50` (`R1 \| R2 \| R3_R50`)** | `2,692` (`93.0%`) | `655` | `1,740` | `63` | `82` | `27.35%` | `91.23%` | `618 / 655` (`94.35%`) | **`-1.50h`** (`655/655`) | `638 / 655` (`97.4%`) |
| **`R64` (`R1 \| R2 \| R3_R64`)** | `2,154` (`74.4%`) | `517` | `1,483` | `201` | `339` | `25.85%` | `72.01%` | `480 / 517` (`92.84%`) | **`+3.50h`** (`517/517`) | `492 / 517` (`95.2%`) |
| **Track 1: `R1 \| R2` (`1-Tap Action`)** | `1,338` (`46.2%`) | `334` | `918` | `384` | `904` | `26.68%` | `46.52%` | `297 / 334` (`88.92%`) | **`+22.50h`** (`334/334`) | `288 / 334` (`86.2%`) |
| **Track 2: `R3_R50`-only Watchlist** | `1,354` (`46.8%`) | — | — | — | — | — | — | — | Routes wind-only communes to human/bank triage | — |

*(Note on `TP` median lag: Because strict CSV evaluation keeps `FIRST_BD3_BULLETIN_ISSUE_ICT` blank for `Yen Bai`, `combine_triggers` omits strict earliest timestamp on `37` `Yen Bai` `TP` communes even when an `R3` wind signal exists or when `R2` occurred within the bounded `[19:00..22:38] 08/09` window. Evaluating the full `TP` cohort across the bounded `Yen Bai` window yields exact invariant medians **`-1.50h`** (`R50`), **`+3.50h`** (`R64`), and **`+22.50h`** (`1-Tap`) across `100%` of `TP`s; strict-subset medians are therefore not reported as competing headlines.)*

### Multi-Rule Convergence (`R50_RULES_ACTIVE_COUNT`)
- **`3` rules (`R1 & R2 & R3_R50`):** `46` communes (`46` classifiable, `0` unclassifiable) $\rightarrow$ **`31 TP / 15 FP`** (`67.39%` UNOSAT flood rate)
- **`2` rules:** `1,222` communes (`1,141` classifiable, `81` unclassifiable) $\rightarrow$ **`250 TP / 891 FP`** (`21.91%`)
- **`1` rule:** `1,424` communes (`1,208` classifiable, `216` unclassifiable) $\rightarrow$ **`374 TP / 834 FP`** (`30.96%`)
- **`0` rules:** `203` communes (`145` classifiable, `58` unclassifiable) $\rightarrow$ **`63 FN / 82 TN`** (`43.45%` flood rate among untriggered communes)

---

## 5. Remaining Documented Scientific Limits

1. **Yên Bái raw bulletin minute (`[19:00, 21:47] 08/09`):** Because `kttv.gov.vn` `2024-09-08` PDFs returned WAF 403 and Wayback Machine returned HTTP 429, exact minute precision for Yên Bái stays blank in CSV columns while its bounded sensitivity proves `-1.50h` (`R50`), `+3.50h` (`R64`), and `+22.50h` (`R1|R2`) medians are mathematically invariant across the entire `[19:00, 22:38]` window.
2. **`Vụ Quang` `03:30 11/09` schedule inference (`INFERRED_FROM_0330_BULLETIN_SCHEDULE`):** Cited news sources (`Thanh Niên`, `Tuổi Trẻ/NLĐ`) confirm `01:00` obs = `20.71 m` (`> BĐ3 20.50 m`) without unambiguous direct access to the raw NCHMF `03:30` PDF header, so `03:30` is explicitly labeled schedule-inferred rather than verified; all `22` communes remain `+86.0h` (`> 72h`) regardless of whether `03:30` or peak `07:00` is used.
3. **Peak vs. First-BĐ3 distinction (`04` vs `04b`):** Peak water level time in `04` is never substituted for bulletin issue time in `04b` / `10_B7`.
4. **UNOSAT `355` outside-scan communes:** Never relabeled to `0` or imputed; strictly preserved as `UNCLASSIFIABLE_UNOSAT`.
5. **Straight-line river-station assignment (`09_R2_GADM41_Commune_Crosswalk_2895.csv`):** Communes intersecting selected rivers are linked by straight-line Euclidean distance (`NEAREST_DISTANCE_KM`, EPSG:3405) to the closest gauge on an intersecting river (`REVIEWED_NEAREST_STATION_ON_INTERSECTING_RIVER`). Extreme assignments reach **`63.23 km`** for `Yên Bái` (`n = 48`) and **`110.44 km`** for `Hà Nội` (`n = 109`) (with `Vụ Quang` up to `38.30 km` and `Phủ Lạng Thương` up to `21.38 km`), which can span upstream/downstream tributary attenuation and local dike differences.
6. **R1 spatial resolution:** `GSMaP v8` operates on `307` `0.1°` native grid cells (`~11 km`) over `2,895` communes; storm-core attenuation + resolution mismatch explains part of `FN = 63` in the `R50` stream (`FN = 384` in the flood-only `R1|R2` stream without `R3` wind).


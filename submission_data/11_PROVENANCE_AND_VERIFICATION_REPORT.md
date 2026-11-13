# ResiLend — Internal Provenance, Verification & B7 Closure Report

**Scope:** Strict audit and reproducible closure of the ResiLend Typhoon Yagi (`06–15 Sep 2024`, landfall baseline `2024-09-07 13:30:00 ICT`) empirical evaluation across `2,895` GADM v4.1 communes (`12` Northern provinces of Viet Nam).  
**Primary Generator Script:** [build_b7_verified_dataset.py](file:///d:/hackathon/hack-a-venture/submission_data/scripts/build_b7_verified_dataset.py)  
**Verified Master Outputs:**
- [10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv](file:///d:/hackathon/hack-a-venture/submission_data/10_B7_UNOSAT_R1_R2_R3_Verified_2895_Communes.csv) (`2,895` rows)
- [01_ResiLend_Yagi_Master_2895_Communes.csv](file:///d:/hackathon/hack-a-venture/submission_data/01_ResiLend_Yagi_Master_2895_Communes.csv) (`2,895` rows, original 37-column prefix preserved + R2/B7 verified columns updated/appended)
- [04b_R2_Bulletin_Trigger_Evidence_11.csv](file:///d:/hackathon/hack-a-venture/submission_data/04b_R2_Bulletin_Trigger_Evidence_11.csv) (`11` NCHMF stations)
- [09_R2_GADM41_Commune_Crosswalk_2895.csv](file:///d:/hackathon/hack-a-venture/submission_data/09_R2_GADM41_Commune_Crosswalk_2895.csv) (`2,895` communes, `0` unresolved multi-river confluences)

---

## 1. Execution Provenance & Checksums

| Pipeline Stage | Verification Source | Key Provenance Evidence | SHA-256 / Metrics |
| :--- | :--- | :--- | :--- |
| **B6 UNOSAT 3966 Benchmark** | Google Earth Engine (`projects/resilend`) + [gee_unosat_3966_commune_benchmark.js](file:///d:/hackathon/hack-a-venture/submission_data/scripts/gee_unosat_3966_commune_benchmark.js) | GEE Tasks `TFLUMEYJJWHJN7UTQJQ5GGCN` (`Completed`, `2m`, `started 2026-11-11 13:42:14 +0700`, `Attempt #1`, `36366.8242 EECU-s`) and `NYJMI2IASYGTL5WGXAIHLYBR` (`Completed`, `1m`, `started 2026-11-11 13:22:00 +0700`, `28750.9883 EECU-s`). Assets: `communes_gadm41_12prov`, `UNOSAT_3966_AnalysisExtent_RedRiverDelta_20240912`, `UNOSAT_3966_FloodExtent_RedRiverDelta_20240912_valid`. | `07_UNOSAT_3966_Flood_Benchmark_2895_Communes.csv`: `b5e96523ed3062d79674b2f1b36c8c62e64a74fd2a9bff5ba617fc00dc023177`; `2,540` classifiable (`718` flooded $\ge 5\%$, `1,822` $< 5\%$), `355` unclassifiable (`PARTIAL_OR_NO_ANALYSIS_COVERAGE`). |
| **R1 Rainfall (Art. 44 Decision 18/2021/QĐ-TTg)** | [ResiLend_R1_R3_Colab_Pipeline.ipynb](file:///d:/hackathon/hack-a-venture/submission_data/scripts/ResiLend_R1_R3_Colab_Pipeline.ipynb) (Cell 9 saved output) | `JAXA/GPM_L3/GSMaP/v8/operational`, `240` hourly images (`20240904_1200` UTC start), `307 NATIVE GRID CELLS`, `0 NaNs`, `105` triggered grid cells (`0` mixed-outcome cells). Both statutory branches executed: `24h Branch (>200mm): 1,169` and `3-Day Branch (>=100mm/d): 0`. | `02_R1_Extreme_Rain_Triggered_Communes_1169.csv`: `1f6bbbdaf9c2f1e1c37a281f7aeb446d27805c3ed324c0071cdab8b5439b2d53`; `1,169 / 2,895` (`40.4%`), median lag `+17.5h` (`range [+4.5, +72.5]h`). |
| **R3 Wind Swaths** | `IBTrACS v04r01` in [ResiLend_R1_R3_Colab_Pipeline.ipynb](file:///d:/hackathon/hack-a-venture/submission_data/scripts/ResiLend_R1_R3_Colab_Pipeline.ipynb) | Asymmetric 4-quadrant wind swath intersection per `GID_3`. | `R3_R50`: `2,622 / 2,895` (`90.6%`), lag `[-12.5, +15.5]h`; `R3_R64`: `1,879 / 2,895` (`64.9%`), lag `[-7.5, +10.5]h`. |
| **R2 HAND Screening** | [gee_r2_hand_gadm41_screen.js](file:///d:/hackathon/hack-a-venture/submission_data/scripts/gee_r2_hand_gadm41_screen.js) | `MERIT/Hydro/v1_0_1` (`hnd <= 10 m`, `92.77 m` scale) over `projects/resilend/assets/communes_gadm41_12prov`. | Joined via `09_R2_GADM41_Commune_Crosswalk_2895.csv`. |

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

In [04b_R2_Bulletin_Trigger_Evidence_11.csv](file:///d:/hackathon/hack-a-venture/submission_data/04b_R2_Bulletin_Trigger_Evidence_11.csv), previously pending `R2_FIRST_BD3_BULLETIN_ISSUE_ICT` fields were resolved strictly where direct NCHMF bulletin citation sequences verified the exact crossing:

1. **`Vu Quang` (`Sông Lô`, BĐ3 `20.50 m`) $\rightarrow$ Verified `2024-09-11 03:30:00 ICT`** (`+86.0h` post-landfall)
   - Below BĐ3: `2024-09-10 19:00:00` obs = `20.28 m` (`-0.22 m` below BĐ3) in NCHMF `21:00 10/09` bulletin (cited by `danviet.vn/...-d1183472.html`, `tuoitre.vn/...2024091022231979.htm`, `muctim.tuoitre.vn/...101240910214727997.htm`).
   - Above BĐ3: `2024-09-11 01:00:00` obs = `20.71 m` (`+0.21 m` above BĐ3) in NCHMF **`03:30 11/09`** bulletin (`tuoitre.vn/nld/...196240911115524832.htm` explicitly quotes `"hồi 3 giờ 30 phút ngày 11-9"` from the same `Đáp Cầu 6,99 m` bulletin; `thanhnien.vn/...185240911053422461.htm` prints the complete `1 giờ ngày 11.9` table with `Đáp Cầu 6,99 m` and `Vụ Quang 20,71 m`).
2. **`Pha Lai` (`Sông Thái Bình`, BĐ3 `6.00 m`) $\rightarrow$ Verified `2024-09-11 21:00:00 ICT`** (`+103.5h` post-landfall under NCHMF national stream)
   - Below BĐ3 (NCHMF): `2024-09-11 13:00:00` obs = `5.98 m` (`-0.02 m` below BĐ3) in NCHMF `15:30 11/09` bulletin (`daidoanket.vn/...-10290016.html`, `hanoimoi.vn/...-1285730.html`).
   - Above BĐ3 (NCHMF): `2024-09-11 19:00:00` obs = `6.13 m` (`+0.13 m` above BĐ3) in NCHMF **`21:00 11/09`** bulletin (`dbqg_lulu_20240911_2100.pdf` and `tuoitre.vn/plo/...109809728.htm`).
   - **Transparency Note & Invariance:** Hai Duong provincial hydrometeorological bulletin separately reported `15h = 6.01 m` at `15:30 11/09`, and MARD reported `17h = 6.05 m` (`bnews.vn/.../346728.html`). However, because all `45 / 45` Pha Lai communes had already triggered `R3_R50` on `2024-09-07` and `R1` by `2024-09-08`, using `15:30` vs. `21:00` causes **zero change** in `R50`, `R64`, or `R1|R2` trigger flags or lag statistics.
3. **`Yen Bai` (`Sông Thao`, BĐ3 `32.00 m`) $\rightarrow$ Blank in strict CSV, Tightly Bounded in `[2024-09-08 19:00, 2024-09-08 21:47] ICT`**
   - Below BĐ3: `2024-09-08 15:00:00` obs = `31.40 m` (`-0.60 m` below BĐ3; `daidoanket.vn/...-10289651.html`).
   - First above BĐ3: `2024-09-08 19:00:00` obs = `32.50 m` (`+0.50 m` above BĐ3; `nhandan.vn/...-post829418.html` `2024-09-08T22:38:59+07:00`, `congthuong.vn/...-344402.html`). Furthermore, `danviet.vn/...-20240908213539921-d1183040.html` (`2024-09-08 21:47:00 ICT`) already reported an NCHMF emergency bulletin above BĐ3.
   - **Zero-Guessing Compliance:** Because the raw `kttv.gov.vn` `2024-09-08` PDF cannot be downloaded directly (WAF 403 / Wayback HTTP 429) to confirm the exact header issue minute within `[19:00, 21:47]`, `FIRST_BD3_BULLETIN_ISSUE_ICT` remains strictly blank (`""`) in `04b` and `10_B7`.
   - **Peak Time Field (`FIRST_OBSERVED_BD3_ICT` in `04`):** Remains intentionally blank across all 11 stations because `Typhoon Committee Member Report Table 1.4` provides peaks only (`trigger_time_ict = peak_time`), not first-crossing timestamps.

---

## 4. Verified Metrics & Dual-Track Comparison (`2,540` Classifiable UNOSAT Communes)

*(Note: `355` out-of-footprint communes remain `UNCLASSIFIABLE_UNOSAT` in all confusion matrices; `R50` active counts total `2,895` = `2,540` classifiable + `355` unclassifiable.)*

| Trigger Stream | Triggered (`/ 2,895`) | `TP` | `FP` | `FN` | `TN` | Precision | Recall | Strict Known `TP` Lag | Median Lag (Strict) | Sensitivity Median Lag (`YB [19:00..22:38]`) | `<= 72h` (`YB` sensitivity) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`R50` (`R1 \| R2 \| R3_R50`)** | `2,692` (`93.0%`) | `655` | `1,740` | `63` | `82` | `27.35%` | `91.23%` | `618 / 655` (`94.35%`) | **`-1.50h`** | **`-1.50h`** (`655/655`, invariant) | `638 / 655` (`97.4%`) |
| **`R64` (`R1 \| R2 \| R3_R64`)** | `2,154` (`74.4%`) | `517` | `1,483` | `201` | `339` | `25.85%` | `72.01%` | `480 / 517` (`92.84%`) | **`+2.50h`** | **`+3.50h`** (`517/517`, invariant) | `492 / 517` (`95.2%`) |
| **Track 1: `R1 \| R2` (`1-Tap Action`)** | `1,338` (`46.2%`) | `334` | `918` | `384` | `904` | `26.68%` | `46.52%` | `297 / 334` (`88.92%`) | **`+20.50h`** | **`+22.50h`** (`334/334`, invariant) | `288 / 334` (`86.2%`) |
| **Track 2: `R3_R50`-only Watchlist** | `1,354` (`46.8%`) | — | — | — | — | — | — | — | — | Routes wind-only communes to human/bank triage | — |

### Multi-Rule Convergence (`R50_RULES_ACTIVE_COUNT`)
- **`3` rules (`R1 & R2 & R3_R50`):** `46` communes (`46` classifiable, `0` unclassifiable) $\rightarrow$ **`31 TP / 15 FP`** (`67.39%` UNOSAT flood rate)
- **`2` rules:** `1,222` communes (`1,141` classifiable, `81` unclassifiable) $\rightarrow$ **`250 TP / 891 FP`** (`21.91%`)
- **`1` rule:** `1,424` communes (`1,208` classifiable, `216` unclassifiable) $\rightarrow$ **`374 TP / 834 FP`** (`30.96%`)
- **`0` rules:** `203` communes (`145` classifiable, `58` unclassifiable) $\rightarrow$ **`63 FN / 82 TN`** (`43.45%` flood rate among untriggered communes)

---

## 5. Remaining Documented Scientific Limits

1. **Yên Bái raw bulletin minute (`[19:00, 21:47] 08/09`):** Because `kttv.gov.vn` `2024-09-08` PDFs returned WAF 403 and Wayback Machine returned HTTP 429, exact minute precision for Yên Bái stays blank in CSV columns while its bounded sensitivity proves `-1.50h` (`R50`) and `+22.50h` (`R1|R2`) medians are mathematically invariant across the entire `[19:00, 22:38]` window.
2. **Peak vs. First-BĐ3 distinction (`04` vs `04b`):** Peak water level time in `04` is never substituted for bulletin issue time in `04b` / `10_B7`.
3. **UNOSAT `355` outside-scan communes:** Never relabeled to `0` or imputed; strictly preserved as `UNCLASSIFIABLE_UNOSAT`.
4. **R1 spatial resolution:** `GSMaP v8` operates on `307` `0.1°` native grid cells (`~11 km`) over `2,895` communes; storm-core attenuation + resolution mismatch explains part of `FN = 63` in the `R50` stream (`FN = 384` in the flood-only `R1|R2` stream without `R3` wind).


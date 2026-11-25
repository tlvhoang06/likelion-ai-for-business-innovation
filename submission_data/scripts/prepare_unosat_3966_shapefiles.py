"""Prepare Earth Engine upload ZIPs from the official UNOSAT 3966 SHP.

The downloaded source ZIP is never modified. The flood geometry is made valid
in a separate working directory, preserving the original feature attributes.
"""

from pathlib import Path
import zipfile

import geopandas as gpd
import shapely


HERE = Path(__file__).resolve().parent
SOURCE_DIR = HERE / "UNOSAT_3966_SHP_extracted" / "TC20240910VNM_SHP"
WORK_DIR = HERE / "UNOSAT_3966_upload_working"
ANALYSIS_SOURCE = SOURCE_DIR / "ST1_20240912_AnalysisExtent_RedRiverDelta.shp"
FLOOD_SOURCE = SOURCE_DIR / "ST1_20240912_FloodExtent_RedRiverDelta.shp"
ANALYSIS_NAME = "UNOSAT_3966_AnalysisExtent_RedRiverDelta_20240912"
FLOOD_NAME = "UNOSAT_3966_FloodExtent_RedRiverDelta_20240912_valid"


def write_zip(shapefile: Path, zip_path: Path) -> None:
    components = [".shp", ".shx", ".dbf", ".prj", ".cpg"]
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for suffix in components:
            component = shapefile.with_suffix(suffix)
            if component.exists():
                archive.write(component, arcname=component.name)


WORK_DIR.mkdir(exist_ok=True)

analysis = gpd.read_file(ANALYSIS_SOURCE)
if not analysis.geometry.is_valid.all():
    raise ValueError("UNOSAT analysis extent unexpectedly contains invalid geometry")
analysis_out = WORK_DIR / f"{ANALYSIS_NAME}.shp"
analysis.to_file(analysis_out, driver="ESRI Shapefile", encoding="UTF-8", index=False)
analysis_zip = HERE / f"{ANALYSIS_NAME}.zip"
write_zip(analysis_out, analysis_zip)

flood = gpd.read_file(FLOOD_SOURCE)
source_area_m2 = float(flood.to_crs(6933).geometry.area.sum())
flood.geometry = flood.geometry.map(shapely.make_valid)
if not flood.geometry.is_valid.all():
    raise ValueError("Could not repair the UNOSAT flood extent geometry")
repaired_area_m2 = float(flood.to_crs(6933).geometry.area.sum())
relative_area_change = abs(repaired_area_m2 - source_area_m2) / source_area_m2
if relative_area_change > 1e-6:
    raise ValueError(f"Geometry repair changed area by {relative_area_change:.8%}")
flood_out = WORK_DIR / f"{FLOOD_NAME}.shp"
flood.to_file(flood_out, driver="ESRI Shapefile", encoding="UTF-8", index=False)
flood_zip = HERE / f"{FLOOD_NAME}.zip"
write_zip(flood_out, flood_zip)

print(f"Analysis upload: {analysis_zip.name} ({analysis_zip.stat().st_size:,} bytes)")
print(f"Flood upload: {flood_zip.name} ({flood_zip.stat().st_size:,} bytes)")
print(f"Flood geometry valid: {flood.geometry.is_valid.all()}; components: {len(flood.geometry.iloc[0].geoms)}")
print(f"Flood area before/after repair: {source_area_m2:.2f} / {repaired_area_m2:.2f} m²")

// UNOSAT 3966 is the primary B6 reference; Sentinel-1 metrics remain a separate proxy.
// Upload the analysis and valid flood extent ZIPs under the asset IDs below first.

var COMMUNES_ASSET = 'projects/resilend/assets/communes_gadm41_12prov';
var ANALYSIS_ASSET = 'projects/resilend/assets/UNOSAT_3966_AnalysisExtent_RedRiverDelta_20240912';
var FLOOD_ASSET = 'projects/resilend/assets/UNOSAT_3966_FloodExtent_RedRiverDelta_20240912_valid';
var LAND_COVER_YEAR = 2021;
var MIN_ANALYSIS_COVERAGE_PCT = 95;
var FLOOD_LAND_CUTOFF_PCT = 5;

var communes = ee.FeatureCollection(COMMUNES_ASSET);
var analysisExtent = ee.FeatureCollection(ANALYSIS_ASSET);
var floodExtent = ee.FeatureCollection(FLOOD_ASSET);
// var analysisGeometry = analysisExtent.geometry();
// var floodGeometry = floodExtent.geometry();
var worldCover = ee.Image('ESA/WorldCover/v200/' + LAND_COVER_YEAR).select('Map');
var eligible = worldCover.eq(40).or(worldCover.eq(50));
var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('seasonality').gte(11);
var slopeDegrees = ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003'));
eligible = eligible.and(permanentWater.not()).and(slopeDegrees.lte(5));

var inAnalysis = ee.Image().paint(analysisExtent, 1).selfMask();
var inFlood = ee.Image().paint(floodExtent, 1).selfMask();
var pixelArea = ee.Image.pixelArea();

var areaBands = pixelArea.updateMask(eligible).rename('ELIGIBLE_LAND_ALL_M2')
  .addBands(pixelArea.updateMask(eligible).updateMask(inAnalysis)
    .rename('UNOSAT_ANALYZED_ELIGIBLE_M2'))
  .addBands(pixelArea.updateMask(eligible).updateMask(inAnalysis).updateMask(inFlood)
    .rename('UNOSAT_FLOODED_ELIGIBLE_M2'));

var sums = areaBands.reduceRegions({
  collection: communes,
  reducer: ee.Reducer.sum(),
  crs: worldCover.projection(),
  scale: 10,
  tileScale: 16,
  maxPixelsPerRegion: 100000000
});

function nOrZero(value) {
  return ee.Number(ee.Algorithms.If(ee.Algorithms.IsEqual(value, null), 0, value));
}

var results = sums.map(function(feature) {
  var totalEligible = nOrZero(feature.get('ELIGIBLE_LAND_ALL_M2'));
  var analyzedEligible = nOrZero(feature.get('UNOSAT_ANALYZED_ELIGIBLE_M2'));
  var floodedEligible = nOrZero(feature.get('UNOSAT_FLOODED_ELIGIBLE_M2'));
  var coveragePct = ee.Number(ee.Algorithms.If(
    totalEligible.gt(0), analyzedEligible.divide(totalEligible).multiply(100), 0));
  var floodPct = ee.Number(ee.Algorithms.If(
    analyzedEligible.gt(0), floodedEligible.divide(analyzedEligible).multiply(100), -9999));
  // Conservative rule: a partial UNOSAT footprint cannot label uncovered land as dry.
  var label = ee.Algorithms.If(
    coveragePct.gte(MIN_ANALYSIS_COVERAGE_PCT),
    ee.Algorithms.If(analyzedEligible.gt(0),
      ee.Algorithms.If(floodPct.gte(FLOOD_LAND_CUTOFF_PCT), 1, 0), null),
    null);
  return feature.set({
    UNOSAT_ANALYSIS_COVERAGE_PCT: coveragePct,
    UNOSAT_FLOOD_PCT_ANALYZED_LAND: ee.Algorithms.If(analyzedEligible.gt(0), floodPct, null),
    UNOSAT_FLOOD_LABEL_95_5: label,
    UNOSAT_REFERENCE_STATUS: ee.Algorithms.If(
      coveragePct.gte(MIN_ANALYSIS_COVERAGE_PCT), 'CLASSIFIABLE', 'PARTIAL_OR_NO_ANALYSIS_COVERAGE')
  });
});

Map.centerObject(analysisExtent, 7);
Map.addLayer(analysisExtent, {color: 'ffff00'}, 'UNOSAT analysis extent');
Map.addLayer(floodExtent, {color: 'ff0000'}, 'UNOSAT mapped flood extent');
Map.addLayer(communes.style({color: '777777', fillColor: '00000000', width: 1}), {}, 'GADM v4.1 communes');
print('GADM feature count (must equal 2895)', communes.size());
print('UNOSAT analysis feature count', analysisExtent.size());
print('UNOSAT flood feature count', floodExtent.size());

Export.table.toDrive({
  collection: results.select([
    'GID_3', 'NAME_3', 'NAME_1',
    'ELIGIBLE_LAND_ALL_M2', 'UNOSAT_ANALYZED_ELIGIBLE_M2',
    'UNOSAT_FLOODED_ELIGIBLE_M2', 'UNOSAT_ANALYSIS_COVERAGE_PCT',
    'UNOSAT_FLOOD_PCT_ANALYZED_LAND', 'UNOSAT_FLOOD_LABEL_95_5',
    'UNOSAT_REFERENCE_STATUS'
  ]),
  description: 'B6_UNOSAT_GADM41_Yagi_20240912_reference_by_commune',
  folder: 'EK15_B5_B7',
  fileNamePrefix: 'B6_UNOSAT_GADM41_Yagi_20240912_reference_by_commune',
  fileFormat: 'CSV'
});

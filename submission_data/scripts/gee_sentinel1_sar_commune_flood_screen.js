// EK15 B6 — Typhoon Yagi flood reference, GADM v4.1 communes
// Method follows UN-SPIDER Sentinel-1 change detection; project cutoffs are
// 5% of cropland+built land and >=95% valid S1 coverage.
// The two pass directions are never mixed; descending is the primary output.
// Keep every relative orbit within that direction so the full commune AOI is
// covered; the paired valid mask requires both windows at each scored pixel.

var COMMUNES_ASSET = 'projects/resilend/assets/communes_gadm41_12prov';
var PRE_START = '2024-08-20';
var PRE_END = '2024-09-07';       // Earth Engine end date is exclusive
var POST_START = '2024-09-08';
var POST_END = '2024-09-21';      // Earth Engine end date is exclusive
var MAIN_PASS = 'DESCENDING';    // Primary pass; all relative orbits within it are kept
var LAND_COVER_YEAR = 2021;
var CHANGE_RATIO = 1.25;          // UN-SPIDER recommended-practice starting threshold
var FLOOD_LAND_CUTOFF_PCT = 5;
var COVERAGE_CUTOFF_PCT = 95;

var communes = ee.FeatureCollection(COMMUNES_ASSET);
var region = communes.geometry().bounds();
var worldCover = ee.Image('ESA/WorldCover/v200/' + LAND_COVER_YEAR).select('Map');
var eligibleLand = worldCover.eq(40).or(worldCover.eq(50)).rename('eligible');
var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('seasonality').gte(11);
var slopeDegrees = ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003'));
var flatLand = slopeDegrees.lte(5);
var pixelArea = ee.Image.pixelArea();

function smoothVH(image) {
  var vhDb = image.select('VH');
  // COPERNICUS/S1_GRD is in dB. UN-SPIDER smooths the dB mosaics and applies
  // after.divide(before) with its trial-and-error 1.25 cutoff; keep that recipe.
  return vhDb.focalMean(50, 'circle', 'meters')
    .updateMask(vhDb.mask())
    .rename('VH')
    .copyProperties(image, ['system:time_start', 'relativeOrbitNumber_start', 'orbitProperties_pass']);
}

function collectionFor(pass, start, end) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(region)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.eq('orbitProperties_pass', pass))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .select('VH');
}

function floodForPass(pass) {
  var beforeCollection = collectionFor(pass, PRE_START, PRE_END);
  var afterCollection = collectionFor(pass, POST_START, POST_END);
  print(pass + ' before/after image counts', beforeCollection.size(), afterCollection.size());
  print(pass + ' before acquisition dates', beforeCollection.aggregate_array('system:time_start')
    .map(function(t) { return ee.Date(t).format('YYYY-MM-dd HH:mm'); }));
  print(pass + ' after acquisition dates', afterCollection.aggregate_array('system:time_start')
    .map(function(t) { return ee.Date(t).format('YYYY-MM-dd HH:mm'); }));

  var before = beforeCollection.map(smoothVH).median();
  var after = afterCollection.map(smoothVH).median();
  var valid = before.mask().and(after.mask()).and(eligibleLand);
  var ratio = after.divide(before);
  var candidate = ratio.gt(CHANGE_RATIO)
    .and(flatLand)
    .and(permanentWater.not())
    .updateMask(valid);
  var connected = candidate.selfMask().connectedPixelCount(100, true);
  var flood = candidate.and(connected.gte(8)).unmask(0).updateMask(valid).rename(pass + '_FLOOD');

  var validArea = pixelArea.updateMask(valid).rename(pass + '_VALID_M2');
  var floodArea = pixelArea.multiply(flood).updateMask(valid).rename(pass + '_FLOOD_M2');
  return {
    before: before,
    after: after,
    valid: valid,
    flood: flood,
    validArea: validArea,
    floodArea: floodArea
  };
}

var descending = floodForPass('DESCENDING');
var eligibleArea = pixelArea.updateMask(eligibleLand).rename('ELIGIBLE_M2');
var areaBands = eligibleArea
  .addBands(descending.validArea)
  .addBands(descending.floodArea);

var sums = areaBands.reduceRegions({
  collection: communes,
  reducer: ee.Reducer.sum(),
  scale: 10,
  tileScale: 8,
  maxPixelsPerRegion: 100000000
});

function nOrZero(value) {
  return ee.Number(ee.Algorithms.If(ee.Algorithms.IsEqual(value, null), 0, value));
}

function addPassMetrics(feature, pass) {
  // reduceRegions with a single-output reducer keeps each input band name.
  var eligible = nOrZero(feature.get('ELIGIBLE_M2'));
  var valid = nOrZero(feature.get(pass + '_VALID_M2'));
  var flood = nOrZero(feature.get(pass + '_FLOOD_M2'));
  var coveragePct = ee.Number(ee.Algorithms.If(
    eligible.gt(0), valid.divide(eligible).multiply(100), 0));
  var floodPct = ee.Number(ee.Algorithms.If(
    valid.gt(0), flood.divide(valid).multiply(100), -9999));
  var label95 = ee.Algorithms.If(
    coveragePct.gte(COVERAGE_CUTOFF_PCT),
    ee.Algorithms.If(floodPct.gte(FLOOD_LAND_CUTOFF_PCT), 1, 0),
    null
  );
  var sensitivityLabel = ee.Algorithms.If(
    valid.gt(0), ee.Algorithms.If(floodPct.gte(FLOOD_LAND_CUTOFF_PCT), 1, 0), null);
  var props = {};
  props[pass + '_COVERAGE_PCT'] = coveragePct;
  props[pass + '_FLOOD_PCT_VALID_LAND'] = ee.Algorithms.If(valid.gt(0), floodPct, null);
  props[pass + '_ELIGIBLE_LAND_M2'] = eligible;
  props[pass + '_VALID_LAND_M2'] = valid;
  props[pass + '_FLOODED_LAND_M2'] = flood;
  props[pass + '_FLOOD_LABEL_95_5'] = label95;
  props[pass + '_FLOOD_LABEL_ANY_COVERAGE_SENSITIVITY'] = sensitivityLabel;
  return feature.set(props);
}

var results = sums.map(function(feature) {
  return addPassMetrics(feature, 'DESCENDING');
});

// Do not synchronously aggregate coverage/label counts in the Code Editor:
// those requests time out over 2,895 complex commune geometries. The single
// table export below computes the same per-commune measures asynchronously;
// calculate counts from its downloaded CSV instead.
print('ASCENDING images (diagnostic only)',
  collectionFor('ASCENDING', PRE_START, PRE_END).size(),
  collectionFor('ASCENDING', POST_START, POST_END).size());
print('GADM feature count (must equal 2895)', communes.size());

var mainFlood = descending.flood;
var mainBefore = descending.before;
var mainAfter = descending.after;
Map.centerObject(communes, 7);
Map.addLayer(mainBefore, {min: -25, max: 0}, MAIN_PASS + ' pre-event VH dB');
Map.addLayer(mainAfter, {min: -25, max: 0}, MAIN_PASS + ' post-event VH dB');
Map.addLayer(mainFlood.selfMask(), {palette: ['#1769ff']}, MAIN_PASS + ' potential flood mask');
Map.addLayer(communes.style({color: '777777', fillColor: '00000000', width: 1}), {}, 'GADM v4.1 commune boundaries');

var outputProperties = [
  'GID_3', 'NAME_3', 'NAME_1',
  'ELIGIBLE_M2',
  'DESCENDING_COVERAGE_PCT', 'DESCENDING_FLOOD_PCT_VALID_LAND',
  'DESCENDING_ELIGIBLE_LAND_M2', 'DESCENDING_VALID_LAND_M2', 'DESCENDING_FLOODED_LAND_M2',
  'DESCENDING_FLOOD_LABEL_95_5', 'DESCENDING_FLOOD_LABEL_ANY_COVERAGE_SENSITIVITY'
];

Export.table.toDrive({
  collection: results.select(outputProperties),
  description: 'B6_GADM41_Yagi_S1_metrics_UNSPIDER_dB_ALL_ORBITS_v2',
  folder: 'EK15_B5_B7',
  fileNamePrefix: 'B6_GADM41_Yagi_S1_metrics_UNSPIDER_dB_ALL_ORBITS_v2',
  fileFormat: 'CSV'
});


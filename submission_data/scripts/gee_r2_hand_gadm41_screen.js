// R2 HAND screening for the project's 2,895 GADM v4.1 communes.
// Run in the Earth Engine Code Editor.
//
// Project rule (runbook): R2 needs BOTH a lowland commune (HAND <= 10 m)
// and its representative station on the same river above Alarm Level 3.
// Nguyên selected the implementation detail that a commune is HAND-eligible
// when at least one valid MERIT/Hydro pixel with hnd <= 10 m intersects it.
// The export records HAND area and share so small edge overlaps are visible.
//
// This script only screens HAND. It intentionally does NOT assign stations or
// set R2_RIVER_TRIGGERED. That requires the separately validated same-river
// commune-to-station crosswalk and verified first BĐ3 bulletin times.

var communes = ee.FeatureCollection(
  'projects/resilend/assets/communes_gadm41_12prov'
);
var merit = ee.Image('MERIT/Hydro/v1_0_1');
var hand = merit.select('hnd');
var handThresholdM = 10;
var nominalScaleM = 92.77;

print('GADM commune count (expected 2,895)', communes.size());
print('MERIT/Hydro hnd projection', hand.projection());

var handLe10 = hand.lte(handThresholdM);
var handArea = ee.Image.pixelArea()
  .updateMask(handLe10)
  .rename('HAND_LE10_AREA_M2');
var meritValidArea = ee.Image.pixelArea()
  .updateMask(hand.mask())
  .rename('MERIT_VALID_AREA_M2');

var sums = ee.Image.cat([handArea, meritValidArea]).reduceRegions({
  collection: communes,
  reducer: ee.Reducer.sum(),
  crs: hand.projection(),
  scale: nominalScaleM,
  tileScale: 8
});

function sumValue(feature, bandName) {
  var properties = feature.toDictionary();
  var suffixedName = bandName + '_sum';
  var raw = ee.Algorithms.If(
    properties.contains(suffixedName),
    properties.get(suffixedName),
    properties.get(bandName)
  );
  return ee.Number(ee.Algorithms.If(raw, raw, 0));
}

var output = sums.map(function(feature) {
  var lowlandAreaM2 = sumValue(feature, 'HAND_LE10_AREA_M2');
  var validAreaM2 = sumValue(feature, 'MERIT_VALID_AREA_M2');
  var communeAreaM2 = feature.geometry().area(1);
  var hasValidMerit = validAreaM2.gt(0);

  // The area reducer weights pixels by their overlap with the commune boundary.
  // Any positive HAND<=10 overlap qualifies under the chosen rule.
  var handEligible = ee.Algorithms.If(
    hasValidMerit,
    ee.Algorithms.If(lowlandAreaM2.gt(0), 1, 0),
    null
  );
  var lowlandSharePct = ee.Algorithms.If(
    communeAreaM2.gt(0),
    lowlandAreaM2.divide(communeAreaM2).multiply(100),
    null
  );
  var validSharePct = ee.Algorithms.If(
    communeAreaM2.gt(0),
    validAreaM2.divide(communeAreaM2).multiply(100),
    null
  );

  return feature.set({
    HAND_THRESHOLD_M: handThresholdM,
    MERIT_NOMINAL_SCALE_M: nominalScaleM,
    COMMUNE_AREA_KM2: communeAreaM2.divide(1e6),
    HAND_LE10_AREA_KM2: lowlandAreaM2.divide(1e6),
    HAND_LE10_SHARE_COMMUNE_PCT: lowlandSharePct,
    MERIT_VALID_AREA_KM2: validAreaM2.divide(1e6),
    MERIT_VALID_SHARE_COMMUNE_PCT: validSharePct,
    R2_HAND_ELIGIBLE: handEligible,
    HAND_RULE: 'At least one valid MERIT/Hydro hnd<=10m pixel overlap',
    R2_STATUS: 'HAND_SCREEN_ONLY_STATION_JOIN_NOT_DONE'
  });
});

print('HAND screening preview', output.limit(5));

Export.table.toDrive({
  collection: output,
  description: 'R2_HAND_GADM41_candidate_metrics',
  fileNamePrefix: 'R2_HAND_GADM41_candidate_metrics',
  fileFormat: 'CSV',
  selectors: [
    'GID_3',
    'NAME_3',
    'NAME_1',
    'HAND_THRESHOLD_M',
    'MERIT_NOMINAL_SCALE_M',
    'COMMUNE_AREA_KM2',
    'HAND_LE10_AREA_KM2',
    'HAND_LE10_SHARE_COMMUNE_PCT',
    'MERIT_VALID_AREA_KM2',
    'MERIT_VALID_SHARE_COMMUNE_PCT',
    'R2_HAND_ELIGIBLE',
    'HAND_RULE',
    'R2_STATUS'
  ]
});

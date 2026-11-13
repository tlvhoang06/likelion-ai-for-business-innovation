export interface CommuneYagiStatus {
  gid_3: string;
  name: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  rain_mm: number;
  r1: boolean;
  r1_low: boolean;
  r1_time: string | null;
  r2: number | null;
  r2_station?: string | null;
  r2_river?: string | null;
  r2_first_bulletin_ict?: string | null;
  r2_peak_time_ict?: string | null;
  r2_status?: string;
  r2_distance_km?: number | null;
  r2_hand_le10_pct?: number | null;
  r3_r50: boolean;
  r3_r64: boolean;
  r3_time: string | null;
  trigger_date: string | null;
  sources_matched: number;
  unosat_status: string;
  unosat_cov_pct: number;
  unosat_elig_ha: number;
  unosat_flood_ha: number;
  unosat_flood_pct: number | null;
  unosat_label: number | null;
  s1_flood_pct: number | null;
  s1_label: number | null;
  sim_loans: number;
  sim_debt_m_vnd: number;
}

export interface RiverStationR2 {
  station: string;
  river: string;
  province: string;
  peak_m: number;
  warning_level: string;
  bd3_m: number;
  peak_time_ict: string;
  first_bd3_bulletin_ict?: string | null;
  bulletin_evidence_status?: string;
  mapped_communes?: number;
  lag_hours: number;
  r2_triggered: number;
  note: string;
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: {
    gid_3: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface CommunesGeoJson {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface LayerToggles {
  r1: boolean;
  r2: boolean;
  r3: boolean;
  useR64: boolean;
  unosat: boolean;
  s1: boolean;
}

export type Lang = 'vi' | 'en';

export type DrawerTab = 'bank' | 'ai' | 'ubnd' | 'exceptions' | 'stations' | 'api';


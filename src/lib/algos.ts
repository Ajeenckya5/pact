/**
 * Documented Pact formulas. Tests in `algos.test.ts` and `plate-vision.test.ts`
 * prove the identities. Wearable numbers come from a paired device. Meals come from what you log.
 */

export const ATWATER = { protein: 4, carbs: 4, fat: 9 } as const;

/** USDA Atwater factors: kcal ≈ 4P + 4C + 9F. */
export function atwaterKcal(protein: number, carbs: number, fat: number) {
  return Math.round(ATWATER.protein * protein + ATWATER.carbs * carbs + ATWATER.fat * fat);
}

export const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres (haversine, mean Earth radius 6371 km). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Weights sum to 1. Pact score is a desk grade, not VO2 or a medical index. */
export const PACT_WEIGHTS = {
  recovery: 0.24,
  sleep: 0.2,
  fuelProtein: 0.2,
  hydro: 0.12,
  move: 0.14,
  checkins: 0.1,
} as const;

export function combinePactScore(parts: {
  recovery: number;
  sleepScore: number;
  fuel: number;
  protein: number;
  hydro: number;
  move: number;
  pactDone: number;
}) {
  const w = PACT_WEIGHTS;
  return Math.round(
    parts.recovery * w.recovery +
      parts.sleepScore * w.sleep +
      ((parts.fuel + parts.protein) / 2) * w.fuelProtein +
      parts.hydro * w.hydro +
      parts.move * w.move +
      parts.pactDone * w.checkins,
  );
}

/**
 * Live strain (0–21) may rise from a real BLE heart-rate or power sample.
 * Unpaired, it stays at the Pact-log baseline.
 *   strain = min(21, max(baseline, baseline + max(0, HR − RHR − 28) / 10, baseline + W / 45))
 */
export function strainFromBle(
  baseline: number,
  rhr: number,
  hr?: number | null,
  power?: number | null,
) {
  let strain = baseline;
  if (hr != null) strain = Math.max(strain, baseline + Math.max(0, hr - rhr - 28) / 10);
  if (power != null) strain = Math.max(strain, baseline + power / 45);
  return Math.min(21, Math.round(strain * 10) / 10);
}

/** Pantry scale: macros_logged = per100 × grams / 100. */
export function scalePer100(per100: number, grams: number) {
  return Math.round((grams / 100) * per100);
}

export function cosine(a: number[], b: number[]) {
  let d = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  return den === 0 ? 0 : d / den;
}

export function softmax(xs: number[], temperature = 0.42) {
  if (!xs.length) return [];
  const m = Math.max(...xs);
  const ex = xs.map((x) => Math.exp((x - m) / temperature));
  const z = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((e) => e / z);
}

export function rgbToHsv(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

import {
  mealRecordToKitchen,
  pactRecipesToKitchen,
  type KitchenRecipe,
} from "./kitchen";
import { muscleFromWger, type MuscleId } from "./muscles";

const UA = "PactAccountability/1.0 (local fitness app; OSM/OFF/Open-Meteo)";

export type LiveWeather = {
  tempC: number;
  feelsC: number;
  humidity: number;
  windKmh: number;
  code: number;
  label: string;
  aqi: number | null;
  uv: number | null;
  sunrise: string | null;
  sunset: string | null;
  source: "open-meteo";
};

export type LivePlace = {
  id: string;
  name: string;
  kind: "gym" | "grocery";
  lat: number;
  lng: number;
  area: string;
  hours: string;
  rating: number;
  tags: string[];
  live: true;
};

export type LiveFood = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  photo?: string;
  source: "open-food-facts";
};

export type LiveRecipe = {
  id: string;
  name: string;
  minutes: number;
  kcal: number;
  protein: number;
  ingredients: string[];
  steps: string[];
  photo: string;
  youtubeId?: string;
  source: "themealdb";
};

export type LiveExercise = {
  id: string;
  wgerId: number;
  name: string;
  category: string;
  equipment: string[];
  cue: string;
  image?: string;
  primary: MuscleId[];
  secondary: MuscleId[];
  source: "wger";
};

export type GeoHit = {
  name: string;
  lat: number;
  lng: number;
  country: string;
};

async function getJson(url: string, init?: RequestInit) {
  const browser = typeof window !== "undefined";
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(browser ? {} : { "User-Agent": UA }),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(24_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  const type = res.headers.get("content-type") ?? "";
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!type.includes("json") && !looksJson) {
    throw new Error(`not json ${res.status} ${url}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`invalid json ${url}`);
  }
}

export function weatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunder";
  return "Mixed";
}

export async function fetchWeather(lat: number, lng: number): Promise<LiveWeather> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=uv_index_max,sunrise,sunset&timezone=auto`;
  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
    `&current=us_aqi,pm2_5`;

  const [forecast, air] = await Promise.all([
    getJson(forecastUrl) as Promise<{
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: { uv_index_max?: number[]; sunrise?: string[]; sunset?: string[] };
    }>,
    getJson(airUrl)
      .catch(() => null)
      .then((x) => x as { current?: { us_aqi?: number } } | null),
  ]);

  const cur = forecast.current ?? {};
  const code = cur.weather_code ?? 0;
  return {
    tempC: Math.round(cur.temperature_2m ?? 0),
    feelsC: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    windKmh: Math.round(cur.wind_speed_10m ?? 0),
    code,
    label: weatherLabel(code),
    aqi: air?.current?.us_aqi != null ? Math.round(air.current.us_aqi) : null,
    uv: forecast.daily?.uv_index_max?.[0] != null ? Math.round(forecast.daily.uv_index_max[0]) : null,
    sunrise: forecast.daily?.sunrise?.[0] ?? null,
    sunset: forecast.daily?.sunset?.[0] ?? null,
    source: "open-meteo",
  };
}

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const placesInflight = new Map<string, Promise<LivePlace[]>>();

export function fetchPlaces(lat: number, lng: number, kind: "all" | "gym" | "grocery" = "all"): Promise<LivePlace[]> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)},${kind}`;
  const hit = placesInflight.get(key);
  if (hit) return hit;
  const work = loadPlaces(lat, lng, kind).finally(() => {
    placesInflight.delete(key);
  });
  placesInflight.set(key, work);
  return work;
}

async function loadPlaces(lat: number, lng: number, kind: "all" | "gym" | "grocery"): Promise<LivePlace[]> {
  const r = 6000;
  const gym =
    `nwr["leisure"="fitness_centre"](around:${r},${lat},${lng});` +
    `nwr["leisure"="sports_centre"](around:${r},${lat},${lng});` +
    `nwr["leisure"="fitness_station"](around:${r},${lat},${lng});` +
    `nwr["amenity"="gym"](around:${r},${lat},${lng});`;
  const grocery =
    `nwr["shop"="supermarket"](around:${r},${lat},${lng});` +
    `nwr["shop"="grocery"](around:${r},${lat},${lng});` +
    `nwr["shop"="greengrocer"](around:${r},${lat},${lng});` +
    `nwr["shop"="organic"](around:${r},${lat},${lng});` +
    `nwr["shop"="convenience"](around:${r},${lat},${lng});`;
  const inner = kind === "gym" ? gym : kind === "grocery" ? grocery : gym + grocery;
  const query = `[out:json][timeout:22];(${inner});out center 48;`;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  type OverpassDump = {
    elements?: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  const attempts = endpoints.map(
    (endpoint) =>
      getJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
      }) as Promise<OverpassDump>,
  );
  const settled = await Promise.allSettled(attempts);
  const filled = settled.find((s) => s.status === "fulfilled" && (s.value.elements?.length ?? 0) > 0);
  const data =
    filled && filled.status === "fulfilled"
      ? filled.value
      : settled.find((s): s is PromiseFulfilledResult<OverpassDump> => s.status === "fulfilled")?.value;
  if (!data?.elements?.length) return [];

  const seen = new Set<string>();
  const places: LivePlace[] = [];
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;
    const latlng = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
    if (!latlng) continue;
    const id = `osm-${el.type}-${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const shop = tags.shop ?? "";
    const isGrocery = ["supermarket", "grocery", "greengrocer", "organic", "convenience"].includes(shop);
    places.push({
      id,
      name,
      kind: isGrocery ? "grocery" : "gym",
      lat: latlng.lat,
      lng: latlng.lon,
      area: tags["addr:suburb"] || tags["addr:city"] || tags["addr:street"] || "Nearby",
      hours: tags.opening_hours || "Hours unknown",
      rating: 0,
      tags: [shop || tags.leisure || "osm"].filter(Boolean),
      live: true,
    });
  }
  const origin = { lat, lng };
  places.sort((a, b) => kmBetween(origin, { lat: a.lat, lng: a.lng }) - kmBetween(origin, { lat: b.lat, lng: b.lng }));
  return places.slice(0, 40);
}

export async function fetchFoods(q: string): Promise<LiveFood[]> {
  try {
    const data = (await getJson(
      `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&page_size=12&fields=code,product_name,product_name_en,nutriments`,
    )) as {
      hits?: Array<{
        code?: string;
        product_name?: string;
        product_name_en?: string;
        nutriments?: Record<string, number | string | undefined>;
      }>;
      products?: Array<{
        code?: string;
        product_name?: string;
        product_name_en?: string;
        nutriments?: Record<string, number | string | undefined>;
      }>;
    };
    const foods = (data.products ?? data.hits ?? [])
      .map((p) => {
        const name = p.product_name || p.product_name_en;
        if (!name) return null;
        const n = p.nutriments ?? {};
        const kcal = num(n["energy-kcal_100g"]) || num(n["energy-kcal"]) || 0;
        return {
          id: `off-${p.code ?? name}`,
          name,
          kcal: Math.round(kcal),
          protein: Math.round(num(n.proteins_100g) || 0),
          carbs: Math.round(num(n.carbohydrates_100g) || 0),
          fat: Math.round(num(n.fat_100g) || 0),
          source: "open-food-facts" as const,
        };
      })
      .filter((p): p is LiveFood => p != null && p.kcal > 0)
      .slice(0, 10);
    if (foods.length) return foods;
  } catch {
    /* classic CGI search as backup */
  }

  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=12`;
  const data = (await getJson(url)) as {
    products?: Array<{
      code?: string;
      product_name?: string;
      image_front_small_url?: string;
      image_url?: string;
      nutriments?: Record<string, number | string | undefined>;
    }>;
  };
  return (data.products ?? [])
    .filter((p) => p.product_name)
    .map((p) => {
      const n = p.nutriments ?? {};
      const kcal = num(n["energy-kcal_serving"]) || num(n["energy-kcal_100g"]) || num(n["energy-kcal"]) || 0;
      return {
        id: `off-${p.code ?? p.product_name}`,
        name: String(p.product_name),
        kcal: Math.round(kcal),
        protein: Math.round(num(n.proteins_serving) || num(n.proteins_100g) || 0),
        carbs: Math.round(num(n.carbohydrates_serving) || num(n.carbohydrates_100g) || 0),
        fat: Math.round(num(n.fat_serving) || num(n.fat_100g) || 0),
        photo: p.image_front_small_url || p.image_url,
        source: "open-food-facts" as const,
      };
    })
    .filter((p) => p.kcal > 0)
    .slice(0, 10);
}

export async function fetchRecipes(ingredient: string): Promise<LiveRecipe[]> {
  const filter = (await getJson(
    `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
  )) as { meals?: Array<{ idMeal: string }> | null };
  const ids = (filter.meals ?? []).slice(0, 6).map((m) => m.idMeal);
  const detailed = await Promise.all(
    ids.map(async (id): Promise<LiveRecipe | null> => {
      const lookup = (await getJson(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)) as {
        meals?: Array<Record<string, string | null>> | null;
      };
      const meal = lookup.meals?.[0];
      if (!meal) return null;
      const kitchen = mealRecordToKitchen(meal);
      const ingredients: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`]?.trim();
        if (ing) ingredients.push(ing.toLowerCase());
      }
      const youtube = meal.strYoutube ?? "";
      const yt = youtube.match(/v=([\w-]+)/)?.[1];
      const steps = (meal.strInstructions ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 8)
        .slice(0, 8);
      return {
        id: `mealdb-${meal.idMeal}`,
        name: meal.strMeal ?? "Recipe",
        minutes: 30,
        kcal: kitchen?.kcal ?? 0,
        protein: kitchen?.protein ?? 0,
        ingredients,
        steps: steps.length ? steps : ["See source on TheMealDB."],
        photo: meal.strMealThumb ?? "",
        youtubeId: yt,
        source: "themealdb",
      };
    }),
  );
  return detailed.filter((x): x is LiveRecipe => x != null);
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
let catalogCache: { at: number; recipes: KitchenRecipe[]; ver: number } | null = null;
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const CATALOG_VER = 2;

export async function fetchRecipeCatalog(): Promise<{ recipes: KitchenRecipe[]; live: number; cached: boolean }> {
  if (catalogCache && catalogCache.ver === CATALOG_VER && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return { recipes: catalogCache.recipes, live: catalogCache.recipes.filter((r) => r.source === "themealdb").length, cached: true };
  }

  const recipes = pactRecipesToKitchen();
  const seen = new Set(recipes.map((r) => r.id));

  for (let i = 0; i < LETTERS.length; i += 8) {
    const chunk = LETTERS.slice(i, i + 8);
    const parts = await Promise.all(
      chunk.map(async (letter) => {
        try {
          const data = (await getJson(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`)) as {
            meals?: Array<Record<string, string | null>> | null;
          };
          return (data.meals ?? [])
            .map((m) => mealRecordToKitchen(m))
            .filter((r): r is KitchenRecipe => Boolean(r));
        } catch {
          return [] as KitchenRecipe[];
        }
      }),
    );
    for (const recipe of parts.flat()) {
      if (seen.has(recipe.id)) continue;
      seen.add(recipe.id);
      recipes.push(recipe);
    }
  }

  catalogCache = { at: Date.now(), recipes, ver: CATALOG_VER };
  return {
    recipes,
    live: recipes.filter((r) => r.source === "themealdb").length,
    cached: false,
  };
}

export async function fetchRecipesSearch(q: string): Promise<KitchenRecipe[]> {
  const data = (await getJson(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`,
  )) as { meals?: Array<Record<string, string | null>> | null };
  return (data.meals ?? [])
    .map((m) => mealRecordToKitchen(m))
    .filter((r): r is KitchenRecipe => Boolean(r));
}

export async function fetchExercises(q?: string, id?: string): Promise<LiveExercise[]> {
  if (id) {
    const numeric = id.replace(/^wger-/, "");
    const data = (await getJson(`https://wger.de/api/v2/exerciseinfo/${numeric}/`)) as WgerInfo;
    const mapped = mapWger(data);
    return mapped.name && mapped.name !== "Exercise" ? [mapped] : [];
  }

  const needle = q?.toLowerCase().trim();
  if (needle && needle.length >= 2) {
    const ids = await searchWgerExerciseIds(needle);
    const rows = await Promise.all(
      ids.slice(0, 16).map(async (eid) => {
        try {
          return mapWger((await getJson(`https://wger.de/api/v2/exerciseinfo/${eid}/`)) as WgerInfo);
        } catch {
          return null;
        }
      }),
    );
    return rows.filter((ex): ex is LiveExercise => Boolean(ex && ex.name && ex.name !== "Exercise"));
  }

  const cats = [11, 12, 9, 13, 8, 10, 14, 15];
  const pages = await Promise.all(
    cats.map(
      (c) =>
        getJson(`https://wger.de/api/v2/exerciseinfo/?limit=5&language=2&category=${c}`) as Promise<{
          results?: WgerInfo[];
        }>,
    ),
  );
  const out: LiveExercise[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const row of page.results ?? []) {
      const ex = mapWger(row);
      if (!ex.name || ex.name === "Exercise" || seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(ex);
    }
  }
  return out.slice(0, 36);
}

type TranslationRow = { name?: string; language?: number; exercise?: number };

let translationIndex: { at: number; rows: TranslationRow[] } | null = null;

async function searchWgerExerciseIds(needle: string): Promise<number[]> {
  const rows = await loadTranslationIndex();
  const hits: number[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (row.language !== 2) continue;
    const name = (row.name ?? "").toLowerCase();
    if (!name.includes(needle)) continue;
    const eid = row.exercise;
    if (!eid || seen.has(eid)) continue;
    seen.add(eid);
    hits.push(eid);
    if (hits.length >= 16) break;
  }
  return hits;
}

async function loadTranslationIndex(): Promise<TranslationRow[]> {
  if (translationIndex && Date.now() - translationIndex.at < 180_000) return translationIndex.rows;
  const offsets = [0, 200, 400, 600, 800];
  const batches = await Promise.all(
    offsets.map(
      (offset) =>
        getJson(`https://wger.de/api/v2/exercise-translation/?limit=200&offset=${offset}`) as Promise<{
          results?: TranslationRow[];
        }>,
    ),
  );
  const rows = batches.flatMap((b) => b.results ?? []);
  translationIndex = { at: Date.now(), rows };
  return rows;
}

type WgerInfo = {
  id: number;
  category?: { name?: string };
  equipment?: Array<{ name?: string }>;
  images?: Array<{ image?: string }>;
  muscles?: Array<{ id?: number }>;
  muscles_secondary?: Array<{ id?: number }>;
  translations?: Array<{ language?: number; name?: string; description?: string }>;
};

function mapWger(ex: WgerInfo): LiveExercise {
  const tr =
    ex.translations?.find((t) => t.language === 2 && t.name) ??
    ex.translations?.find((t) => t.name);
  const name = tr?.name ?? "Exercise";
  const cue = stripHtml(tr?.description ?? "").slice(0, 280);
  const primary = (ex.muscles ?? []).map((m) => muscleFromWger(m.id ?? 0)).filter((id): id is MuscleId => Boolean(id));
  const secondary = (ex.muscles_secondary ?? [])
    .map((m) => muscleFromWger(m.id ?? 0))
    .filter((id): id is MuscleId => Boolean(id));
  return {
    id: `wger-${ex.id}`,
    wgerId: ex.id,
    name,
    category: ex.category?.name ?? "Strength",
    equipment: (ex.equipment ?? []).map((e) => e.name ?? "").filter(Boolean),
    cue: cue || "Move with control. Full range, honest reps.",
    image: ex.images?.[0]?.image,
    primary,
    secondary,
    source: "wger",
  };
}

export async function geocode(q: string): Promise<GeoHit[]> {
  const data = (await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
  )) as {
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string; admin1?: string }>;
  };
  return (data.results ?? []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lng: r.longitude,
    country: r.country ?? "",
  }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const data = (await getJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    )) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
    const label = [data.city || data.locality, data.principalSubdivision, data.countryName].filter(Boolean).join(", ");
    if (label) return label;
  } catch {
    /* nominatim fallback */
  }
  const nom = (await getJson(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`,
  )) as { address?: Record<string, string>; display_name?: string };
  const a = nom.address ?? {};
  const label = [a.neighbourhood || a.suburb || a.city || a.town || a.village, a.state, a.country]
    .filter(Boolean)
    .join(", ");
  return label || nom.display_name || "Your area";
}

function num(v: number | string | undefined) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number.parseFloat(v) || 0;
  return 0;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

import {
  fetchExercises,
  fetchFoods,
  fetchPlaces,
  fetchRecipeCatalog,
  fetchRecipes,
  fetchRecipesSearch,
  fetchWeather,
  geocode,
  reverseGeocode,
} from "@/lib/free-apis";
import { pactRecipesToKitchen } from "@/lib/kitchen";

export async function clientWeather(lat: number, lng: number) {
  return { weather: await fetchWeather(lat, lng) };
}

export async function clientPlaces(lat: number, lng: number, kind: "all" | "gym" | "grocery") {
  return { places: await fetchPlaces(lat, lng, kind) };
}

export async function clientFoods(q: string) {
  if (q.trim().length < 2) return { foods: [] };
  return { foods: await fetchFoods(q) };
}

export async function clientGeocode(q: string) {
  if (q.trim().length < 2) return { hits: [] };
  return { hits: await geocode(q) };
}

export async function clientReverse(lat: number, lng: number) {
  return { label: await reverseGeocode(lat, lng) };
}

export async function clientExercises(q?: string, id?: string) {
  return { exercises: await fetchExercises(q, id?.replace(/^wger-/, "")) };
}

export async function clientRecipeCatalog() {
  try {
    const dump = await fetchRecipeCatalog();
    return { recipes: dump.recipes, live: dump.live, cached: dump.cached };
  } catch {
    return { recipes: pactRecipesToKitchen(), live: 0 };
  }
}

export async function clientRecipes(opts: { q?: string; ingredient?: string }) {
  if (opts.q) return { recipes: await fetchRecipesSearch(opts.q) };
  return { recipes: await fetchRecipes(opts.ingredient || "chicken") };
}

const FEED_PROBES = [
  {
    id: "open-meteo",
    name: "Open-Meteo",
    use: "Weather, UV, sunrise, air quality",
    url: "https://api.open-meteo.com",
    key: false,
    probe: "https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m",
  },
  {
    id: "overpass",
    name: "OpenStreetMap Overpass",
    use: "Gyms and grocery stores",
    url: "https://overpass-api.de",
    key: false,
    probe: "https://overpass-api.de/api/status",
  },
  {
    id: "off",
    name: "Open Food Facts",
    use: "Calorie search",
    url: "https://world.openfoodfacts.org",
    key: false,
    probe: "https://search.openfoodfacts.org/search?q=oats&page_size=1",
  },
  {
    id: "mealdb",
    name: "TheMealDB",
    use: "Recipes from ingredients",
    url: "https://www.themealdb.com",
    key: false,
    probe: "https://www.themealdb.com/api/json/v1/1/search.php?s=chicken",
  },
  {
    id: "wger",
    name: "wger",
    use: "Exercise directory",
    url: "https://wger.de/api/v2",
    key: false,
    probe: "https://wger.de/api/v2/exerciseinfo/?limit=1",
  },
  {
    id: "geocode",
    name: "Open-Meteo Geocoding",
    use: "Place search",
    url: "https://geocoding-api.open-meteo.com",
    key: false,
    probe: "https://geocoding-api.open-meteo.com/v1/search?name=San%20Francisco&count=1",
  },
  {
    id: "osm",
    name: "OpenStreetMap tiles",
    use: "Map rendering · no API key",
    url: "https://tile.openstreetmap.org",
    key: false,
    probe: "https://tile.openstreetmap.org/0/0/0.png",
  },
] as const;

export type ClientFeed = {
  id: string;
  name: string;
  use: string;
  url: string;
  key: boolean;
  ok: boolean;
  ms: number;
};

export async function clientFeeds(): Promise<{ feeds: ClientFeed[] }> {
  const feeds = await Promise.all(
    FEED_PROBES.map(async (feed) => {
      const started = Date.now();
      try {
        const res = await fetch(feed.probe, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        return { id: feed.id, name: feed.name, use: feed.use, url: feed.url, key: feed.key, ok: res.ok, ms: Date.now() - started };
      } catch {
        return { id: feed.id, name: feed.name, use: feed.use, url: feed.url, key: feed.key, ok: false, ms: Date.now() - started };
      }
    }),
  );
  return { feeds };
}

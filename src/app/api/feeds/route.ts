import { jsonOk } from "@/app/api/_util";

const FEEDS = [
  { id: "open-meteo", name: "Open-Meteo", use: "Weather, UV, sunrise, air quality", url: "https://api.open-meteo.com", key: false },
  { id: "overpass", name: "OpenStreetMap Overpass", use: "Gyms near you", url: "https://overpass-api.de", key: false },
  { id: "off", name: "Open Food Facts", use: "Calorie search", url: "https://world.openfoodfacts.org", key: false },
  { id: "mealdb", name: "TheMealDB", use: "Recipes from ingredients", url: "https://www.themealdb.com", key: false },
  { id: "wger", name: "wger", use: "Exercise directory", url: "https://wger.de/api/v2", key: false },
  { id: "geocode", name: "Open-Meteo Geocoding", use: "Place search", url: "https://geocoding-api.open-meteo.com", key: false },
  { id: "osm", name: "OpenStreetMap tiles", use: "Map rendering · no API key", url: "https://tile.openstreetmap.org", key: false },
];

export async function GET() {
  const checks = await Promise.all(
    FEEDS.map(async (feed) => {
      const started = Date.now();
      try {
        const probe =
          feed.id === "open-meteo"
            ? "https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m"
            : feed.id === "off"
              ? "https://world.openfoodfacts.org/api/v2/search?search_terms=oats&page_size=1"
              : feed.id === "mealdb"
                ? "https://www.themealdb.com/api/json/v1/1/search.php?s=chicken"
                : feed.id === "wger"
                  ? "https://wger.de/api/v2/exerciseinfo/?limit=1"
                  : feed.id === "geocode"
                    ? "https://geocoding-api.open-meteo.com/v1/search?name=San%20Francisco&count=1"
                  : feed.id === "osm"
                    ? "https://tile.openstreetmap.org/0/0/0.png"
                    : "https://overpass-api.de/api/status";
        const res = await fetch(probe, {
          headers: { "User-Agent": "PactAccountability/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        return { ...feed, ok: res.ok, ms: Date.now() - started };
      } catch {
        return { ...feed, ok: false, ms: Date.now() - started };
      }
    }),
  );
  return jsonOk({ feeds: checks }, 60);
}

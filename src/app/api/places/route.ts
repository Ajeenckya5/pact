import { jsonErr, jsonOk } from "@/app/api/_util";
import { fetchPlaces } from "@/lib/free-apis";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const kind = (url.searchParams.get("kind") ?? "all") as "all" | "gym" | "grocery";
  if (latRaw == null || lngRaw == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonErr("lat/lng required", 400);
  }
  try {
    const places = await fetchPlaces(lat, lng, kind);
    return jsonOk({ places, source: "openstreetmap-overpass" }, places.length ? 180 : 0);
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "places unavailable");
  }
}

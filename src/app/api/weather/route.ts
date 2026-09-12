import { jsonErr, jsonOk } from "@/app/api/_util";
import { fetchWeather } from "@/lib/free-apis";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latRaw = url.searchParams.get("lat");
  const lngRaw = url.searchParams.get("lng");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (latRaw == null || lngRaw == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonErr("lat/lng required", 400);
  }
  try {
    const weather = await fetchWeather(lat, lng);
    return jsonOk({ weather });
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "weather unavailable");
  }
}

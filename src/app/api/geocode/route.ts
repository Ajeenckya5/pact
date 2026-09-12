import { jsonErr, jsonOk } from "@/app/api/_util";
import { geocode } from "@/lib/free-apis";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return jsonOk({ hits: [] }, 30);
  try {
    const hits = await geocode(q);
    return jsonOk({ hits, source: "open-meteo-geocoding" }, 600);
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "geocode unavailable");
  }
}

import { jsonErr, jsonOk } from "@/app/api/_util";
import { fetchExercises } from "@/lib/free-apis";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const rawId = url.searchParams.get("id")?.trim();
  const id = rawId?.replace(/^wger-/, "");
  try {
    const exercises = await fetchExercises(q, id);
    return jsonOk({ exercises, source: "wger" }, 180);
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "exercises unavailable");
  }
}

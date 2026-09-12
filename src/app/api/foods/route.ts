import { jsonErr, jsonOk } from "@/app/api/_util";
import { fetchFoods } from "@/lib/free-apis";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return jsonOk({ foods: [] }, 30);
  try {
    const foods = await fetchFoods(q);
    return jsonOk({ foods, source: "open-food-facts" }, 120);
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "foods unavailable");
  }
}

import { jsonOk } from "@/app/api/_util";
import { fetchJson } from "@/lib/http";

function workerBase() {
  return (process.env.PACT_API || process.env.NEXT_PUBLIC_PACT_API || "http://127.0.0.1:8788").replace(/\/$/, "");
}

export async function GET(req: Request) {
  const query = new URL(req.url).search;
  const result = await fetchJson<{ foods?: unknown[] }>(`${workerBase()}/foods${query}`);
  if (!result.ok) return jsonOk({ foods: [] }, 0);
  return jsonOk({ foods: result.data.foods ?? [] }, 30);
}

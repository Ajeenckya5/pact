import { jsonOk } from "@/app/api/_util";
import { fetchJson } from "@/lib/http";

function workerBase() {
  return (process.env.PACT_API || process.env.NEXT_PUBLIC_PACT_API || "http://127.0.0.1:8788").replace(/\/$/, "");
}

export async function GET() {
  const result = await fetchJson<{ plates?: unknown[] }>(`${workerBase()}/plates`);
  if (!result.ok) return jsonOk({ plates: [] }, 0);
  return jsonOk({ plates: result.data.plates ?? [] }, 60);
}

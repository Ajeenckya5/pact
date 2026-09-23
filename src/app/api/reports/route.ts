import { forward } from "@pact/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin() {
  return process.env.PACT_API_ORIGIN ?? "http://127.0.0.1:8788";
}

export async function POST(request: Request) {
  const body = await request.text();
  let pactId = "";
  try {
    pactId = String((JSON.parse(body) as { pactId?: unknown }).pactId ?? "");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!pactId) return new Response("Rejected", { status: 400 });
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return forward(new Request(request.url, { method: "POST", headers, body }), `${origin()}/pacts/${encodeURIComponent(pactId)}/reports`);
}

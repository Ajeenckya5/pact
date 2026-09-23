import { forward } from "@pact/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin() {
  return process.env.PACT_API_ORIGIN ?? "http://127.0.0.1:8788";
}

export function POST(request: Request) {
  return forward(request, `${origin()}/push/subscribe`);
}

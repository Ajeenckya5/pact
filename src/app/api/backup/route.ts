import { forward } from "@pact/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin() {
  return (process.env.PACT_API || process.env.NEXT_PUBLIC_PACT_API || "http://127.0.0.1:8788").replace(/\/$/, "");
}

export function GET(request: Request) {
  return forward(request, `${origin()}/backup`);
}

export function POST(request: Request) {
  return forward(request, `${origin()}/backup`);
}

import { forward } from "@pact/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin() {
  return process.env.PACT_API_ORIGIN ?? "http://127.0.0.1:8788";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward(request, `${origin()}/pacts/${encodeURIComponent(id)}/blocks`);
}

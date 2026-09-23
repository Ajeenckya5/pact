import { roomFor } from "../../../../../../workers/api/src/index";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return Response.json({ messages: roomFor(id).messages });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  try {
    roomFor(id).post(body);
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return new Response("Rejected", { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  roomFor(id).wipe();
  return new Response(null, { status: 204 });
}

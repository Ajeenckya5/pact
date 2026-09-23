import { PactRoom, assertCiphertextOnly, type CipherEnvelope } from "./guard";

/**
 * Cloudflare Worker entry. One room per pact id.
 * Deploy with Wrangler when the free-plan account exists.
 * This module stays free of platform types so unit tests can import the room.
 */
const rooms = new Map<string, PactRoom>();

export function roomFor(pactId: string) {
  const existing = rooms.get(pactId);
  if (existing) return existing;
  const room = new PactRoom();
  rooms.set(pactId, room);
  return room;
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/health") return Response.json({ ok: true });
  const match = url.pathname.match(/^\/pacts\/([^/]+)\/messages$/);
  if (!match) return new Response("Not found", { status: 404 });
  const pactId = decodeURIComponent(match[1]);
  if (request.method === "DELETE") {
    rooms.delete(pactId);
    return new Response(null, { status: 204 });
  }
  if (request.method === "GET") {
    const messages: CipherEnvelope[] = roomFor(pactId).messages;
    return Response.json({ messages });
  }
  if (request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    try {
      const saved = roomFor(pactId).post(body);
      assertCiphertextOnly(saved);
      return Response.json({ ok: true }, { status: 201 });
    } catch {
      return new Response("Rejected", { status: 400 });
    }
  }
  return new Response("Method not allowed", { status: 405 });
}

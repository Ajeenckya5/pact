import { PactRoom } from "./durable";
import { signedRequest } from "./room";
import { applyFlag, countEvent, normalizeFlags, type Flags } from "../../../packages/core/src/wire";

export type Env = {
  PACT_ROOM: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
  PACT_CONFIG: {
    get(key: string, type: "json"): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
  };
};

export { PactRoom };

async function loadFlags(env: Env): Promise<Flags> {
  return normalizeFlags(await env.PACT_CONFIG.get("flags", "json"));
}

async function loadCounts(env: Env) {
  const raw = await env.PACT_CONFIG.get("counts", "json");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as Record<string, number>;
  return raw as Record<string, number>;
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true });
    if (url.pathname === "/live") {
      const flags = await loadFlags(env);
      if (flags.realtime === "off") return Response.json({ url: null, realtime: false });
      const host = request.headers.get("host") ?? "127.0.0.1:8788";
      return Response.json({ url: `ws://${host}`, realtime: true });
    }
    if (url.pathname === "/config") return config(request, env);
    if (url.pathname === "/events") return events(request, env);
    const match = url.pathname.match(/^\/pacts\/([^/]+)(?:\/|$)/);
    if (!match) return new Response("Not found", { status: 404 });
    const stub = env.PACT_ROOM.get(env.PACT_ROOM.idFromName(decodeURIComponent(match[1] ?? "")));
    return stub.fetch(request);
  },
};

async function config(request: Request, env: Env) {
  if (request.method === "GET") return Response.json({ flags: await loadFlags(env), counts: await loadCounts(env) });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = await request.text();
  const auth = await signedRequest(request, body);
  if (!auth) return new Response("Rejected", { status: 401 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!parsed || typeof parsed !== "object") return new Response("Rejected", { status: 400 });
  const record = parsed as { name?: unknown; value?: unknown };
  try {
    const flags = applyFlag(await loadFlags(env), String(record.name ?? ""), String(record.value ?? ""));
    await env.PACT_CONFIG.put("flags", JSON.stringify(flags));
    return Response.json({ flags });
  } catch {
    return new Response("Rejected", { status: 400 });
  }
}

async function events(request: Request, env: Env) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  try {
    const next = countEvent(await loadCounts(env), body);
    await env.PACT_CONFIG.put("counts", JSON.stringify(next.counts));
    return Response.json({ name: next.name, count: next.count }, { status: 202 });
  } catch {
    return new Response("Rejected", { status: 400 });
  }
}

export default worker;

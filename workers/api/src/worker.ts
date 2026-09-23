import { PactRoom } from "./durable";
import { originAllowed } from "./origin";
import { notifyPartners, saveSubscription } from "./push";
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
  PACT_DB: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        run(): Promise<unknown>;
        all<T>(): Promise<{ results: T[] }>;
      };
    };
  };
  VAPID_PUBLIC?: string;
  VAPID_PRIVATE?: string;
  VAPID_SUBJECT?: string;
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

function allowedOrigin(origin: string) {
  return originAllowed(origin);
}

function withCors(request: Request, response: Response) {
  if (response.status === 101) return response;
  const origin = allowedOrigin(request.headers.get("origin") ?? "");
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-headers", "content-type, x-pact-pk, x-pact-ts, x-pact-sig, x-pact-offset");
  headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  headers.set("vary", "origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    if (request.method === "OPTIONS") return withCors(request, new Response(null, { status: 204 }));
    const url = new URL(request.url);
    if (url.pathname === "/health") return withCors(request, Response.json({ ok: true }));
    if (url.pathname === "/live") return withCors(request, await live(request, env));
    if (url.pathname === "/config") return withCors(request, await config(request, env));
    if (url.pathname === "/events") return withCors(request, await events(request, env));
    if (url.pathname === "/push/vapid") return withCors(request, Response.json({ publicKey: env.VAPID_PUBLIC ?? "" }));
    if (url.pathname === "/push/subscribe") return withCors(request, await subscribe(request, env));
    const match = url.pathname.match(/^\/pacts\/([^/]+)(?:\/|$)/);
    if (!match) return withCors(request, new Response("Not found", { status: 404 }));
    const pactId = decodeURIComponent(match[1] ?? "");
    const bodyText = request.method === "POST" ? await request.clone().text() : "";
    const stub = env.PACT_ROOM.get(env.PACT_ROOM.idFromName(pactId));
    const response = await stub.fetch(request);
    if (response.status === 201 && url.pathname.endsWith("/messages")) {
      ctx.waitUntil(maybeNotify(env, pactId, bodyText));
    }
    return withCors(request, response);
  },
};

async function live(request: Request, env: Env) {
  const flags = await loadFlags(env);
  if (flags.realtime === "off") return Response.json({ url: null, realtime: false });
  const host = request.headers.get("host") ?? "127.0.0.1:8788";
  const secure = new URL(request.url).protocol === "https:" || host.endsWith(".workers.dev");
  return Response.json({ url: `${secure ? "wss" : "ws"}://${host}`, realtime: true });
}

async function maybeNotify(env: Env, pactId: string, bodyText: string) {
  try {
    const parsed = JSON.parse(bodyText) as { kind?: string; senderPk?: string };
    if (parsed.kind !== "nudge" || !parsed.senderPk) return;
    await notifyPartners(env as Parameters<typeof notifyPartners>[0], pactId, parsed.senderPk);
  } catch {
    /* a failed alert does not undo the nudge */
  }
}

async function subscribe(request: Request, env: Env) {
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
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => !["endpoint", "pactId", "p256dh", "auth"].includes(key))) return new Response("Rejected", { status: 400 });
  const endpoint = String(record.endpoint ?? "");
  const pactId = String(record.pactId ?? "");
  const p256dh = String(record.p256dh ?? "");
  const authKey = String(record.auth ?? "");
  if (!endpoint.startsWith("https://") || !pactId || p256dh.length < 20 || authKey.length < 10) {
    return new Response("Rejected", { status: 400 });
  }
  await saveSubscription(env as Parameters<typeof saveSubscription>[0], {
    endpoint,
    pactId,
    senderPk: auth.pk,
    p256dh,
    auth: authKey,
  });
  return Response.json({ ok: true }, { status: 201 });
}

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

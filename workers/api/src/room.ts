import { assertReport, type ReportEnvelope } from "./guard";
import {
  assertEnvelope,
  localEpoch,
  localHour,
  nudgeDecision,
  readableHealth,
  retained,
  verifyEd25519,
  verifyRequest,
  envelopeCanon,
  type Flags,
  type PactEnvelope,
} from "../../../packages/core/src/wire";

export type RoomStorage = {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list<T>(options?: { prefix?: string }): Promise<Map<string, T>>;
  setAlarm?(scheduledTime: number): Promise<void>;
};

export type RoomSocket = { send(data: string): void };

export type RoomCtx = {
  storage: RoomStorage;
  getWebSockets(): RoomSocket[];
};

export type Clock = { now(): number };

const DEFAULT_CLOCK: Clock = { now: () => Date.now() };

function pactIdFrom(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("pacts");
  return index >= 0 ? decodeURIComponent(parts[index + 1] ?? "") : "";
}

function readSigned(request: Request, url: URL) {
  const pick = (name: string) => request.headers.get(name) ?? url.searchParams.get(name);
  const pk = pick("x-pact-pk");
  const tsRaw = pick("x-pact-ts");
  const sig = pick("x-pact-sig");
  const offsetRaw = pick("x-pact-offset");
  if (!pk || !tsRaw || !sig || offsetRaw == null || offsetRaw === "") return null;
  return { pk, ts: Number(tsRaw), sig, offsetMin: Number(offsetRaw) };
}

export async function signedRequest(request: Request, body: string, clock: Clock = DEFAULT_CLOCK) {
  const url = new URL(request.url);
  const signed = readSigned(request, url);
  if (!signed) return null;
  const ok = await verifyRequest({
    ...signed,
    method: request.method,
    path: url.pathname,
    body,
    now: clock.now(),
  });
  return ok ? { ...signed, pactId: pactIdFrom(url) } : null;
}

async function logEntries(storage: RoomStorage) {
  const listed = await storage.list<PactEnvelope>({ prefix: "log:" });
  return [...listed.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function retain(storage: RoomStorage, today = localEpoch(Date.now(), 0)) {
  for (const [key, value] of await logEntries(storage)) {
    if (!value || typeof value.epoch !== "number" || !retained(value.epoch, today)) await storage.delete(key);
  }
  const left = await logEntries(storage);
  const extra = left.length - 500;
  for (let i = 0; i < extra; i += 1) {
    const row = left[i];
    if (row) await storage.delete(row[0]);
  }
}

function transmit(ctx: RoomCtx, envelope: PactEnvelope, realtime: boolean) {
  if (!realtime) return;
  const raw = JSON.stringify(envelope);
  if (readableHealth(raw)) throw new Error("plaintext or health field");
  for (const socket of ctx.getWebSockets()) socket.send(raw);
}

async function blocked(storage: RoomStorage, senderPk: string) {
  const listed = await storage.list<{ target?: string }>({ prefix: "block:" });
  return [...listed.values()].some((row) => row?.target === senderPk);
}

export async function roomFetch(ctx: RoomCtx, request: Request, flags: Flags, clock: Clock = DEFAULT_CLOCK): Promise<Response> {
  const url = new URL(request.url);
  const body = request.method === "GET" || request.method === "DELETE" || request.method === "HEAD" ? "" : await request.text();
  const auth = await signedRequest(request, body, clock);
  if (!auth) return new Response("Rejected", { status: 401 });

  if (request.method === "GET" && url.pathname.endsWith("/messages")) {
    const viewer = url.searchParams.get("viewer");
    const hidden = new Set<string>();
    if (viewer) {
      const blocks = await ctx.storage.list<{ by?: string; target?: string }>({ prefix: "block:" });
      for (const row of blocks.values()) {
        if (row?.by === viewer && row.target) hidden.add(row.target);
      }
    }
    const messages = (await logEntries(ctx.storage)).map(([, value]) => value).filter((message) => !hidden.has(message.senderPk));
    return Response.json({ messages });
  }

  if (request.method === "DELETE" && url.pathname.endsWith("/messages")) {
    for (const [key] of await logEntries(ctx.storage)) await ctx.storage.delete(key);
    return new Response(null, { status: 204 });
  }

  if (request.method === "POST" && url.pathname.endsWith("/blocks")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (!parsed || typeof parsed !== "object") return new Response("Rejected", { status: 400 });
    const record = parsed as { by?: unknown; target?: unknown };
    const by = String(record.by ?? "");
    const target = String(record.target ?? "");
    if (!by || !target || by === target || by !== auth.pk) return new Response("Rejected", { status: 400 });
    await ctx.storage.put(`block:${by}:${target}`, { by, target });
    return Response.json({ ok: true }, { status: 201 });
  }

  if (request.method === "POST" && url.pathname.endsWith("/reports")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    try {
      const report: ReportEnvelope = assertReport(parsed);
      if (report.pactId !== auth.pactId) return new Response("Rejected", { status: 400 });
      await ctx.storage.put(`report:${report.messageId}`, report);
      return Response.json({ ok: true, messageId: report.messageId }, { status: 201 });
    } catch {
      return new Response("Rejected", { status: 400 });
    }
  }

  if (request.method === "GET") return Response.json({ ok: true });
  if (request.method !== "POST" || !url.pathname.endsWith("/messages")) return new Response("Not found", { status: 404 });
  if (flags.sync === "off") return new Response("Sync off", { status: 409 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  try {
    const envelope = assertEnvelope(parsed);
    if (envelope.pactId !== auth.pactId || envelope.senderPk !== auth.pk) throw new Error("rejected");
    if (envelope.epoch !== localEpoch(auth.ts * 1000, auth.offsetMin)) throw new Error("rejected");
    const signed = await verifyEd25519(envelope.senderPk, envelope.sig, envelopeCanon(envelope));
    if (!signed) throw new Error("rejected");
    if (await blocked(ctx.storage, envelope.senderPk)) throw new Error("blocked");
    if (envelope.kind === "nudge") {
      const hour = localHour(auth.ts * 1000, auth.offsetMin);
      const sentToday = (await logEntries(ctx.storage)).filter(([, event]) => event.kind === "nudge" && event.senderPk === envelope.senderPk && event.epoch === envelope.epoch).length;
      const decision = nudgeDecision({ sentToday, hour });
      if (decision === "quiet") return new Response("Quiet hours", { status: 403 });
      if (decision === "cap") return new Response("Nudge cap", { status: 429 });
    }
    const seq = ((await ctx.storage.get<number>("seq")) ?? 0) + 1;
    await ctx.storage.put("seq", seq);
    await ctx.storage.put(`log:${String(seq).padStart(8, "0")}`, envelope);
    transmit(ctx, envelope, flags.realtime === "on");
    await retain(ctx.storage, localEpoch(clock.now(), 0));
    if (ctx.storage.setAlarm) await ctx.storage.setAlarm(clock.now() + 24 * 60 * 60 * 1000);
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "blocked") return new Response("Blocked", { status: 403 });
    return new Response("Rejected", { status: 400 });
  }
}

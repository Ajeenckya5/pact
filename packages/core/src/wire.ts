/** Spec envelope. The server may store and forward these fields only. */

export const ENVELOPE_FIELDS = ["v", "pactId", "epoch", "senderPk", "kind", "nonce", "ct", "sig"] as const;

const ALLOWED = new Set<string>(ENVELOPE_FIELDS);
const KINDS = new Set(["boxes", "chat", "nudge", "seen"]);

export const NUDGE_CAP = 3;
export const QUIET_START = 22;
export const QUIET_END = 7;

const READABLE = /"(sleep|water|box|value|time|heartRate|heart_rate|protein|recovery|strain|hrv|steps|kcal|text|message|sender)"\s*:/;

export type EnvelopeKind = "boxes" | "chat" | "nudge" | "seen";

export type PactEnvelope = {
  v: 1;
  pactId: string;
  epoch: number;
  senderPk: string;
  kind: EnvelopeKind;
  nonce: string;
  ct: string;
  sig: string;
};

export type FlagName = "realtime" | "moments" | "sync";
export type Flags = Record<FlagName, "on" | "off">;

export const DEFAULT_FLAGS: Flags = { realtime: "on", moments: "on", sync: "on" };

export function bytesToB64Url(bytes: Uint8Array) {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64UrlToBytes(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replaceAll("-", "+").replaceAll("_", "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function localHour(unixMs: number, offsetMin: number) {
  return new Date(unixMs + offsetMin * 60_000).getUTCHours();
}

export function localEpoch(unixMs: number, offsetMin: number) {
  const local = new Date(unixMs + offsetMin * 60_000);
  return local.getUTCFullYear() * 10000 + (local.getUTCMonth() + 1) * 100 + local.getUTCDate();
}

export function epochUtcMs(epoch: number) {
  const year = Math.floor(epoch / 10000);
  const month = Math.floor((epoch % 10000) / 100);
  const day = epoch % 100;
  return Date.UTC(year, month - 1, day);
}

/** Messages stay 180 days. Check-ins stay 400, which is the spec window. */
export function retentionDays(kind: string) {
  return kind === "boxes" ? 400 : 180;
}

export function retained(epoch: number, today: number, days = 180) {
  if (!Number.isInteger(epoch) || epoch < 19700101) return false;
  return epochUtcMs(today) - epochUtcMs(epoch) <= days * 86_400_000;
}

export function nudgeDecision(input: { sentToday: number; hour: number }) {
  if (input.hour >= QUIET_START || input.hour < QUIET_END) return "quiet" as const;
  if (input.sentToday >= NUDGE_CAP) return "cap" as const;
  return "ok" as const;
}

export function shouldSendReceipt(seenReceipts: boolean | undefined) {
  return seenReceipts !== false;
}

export function normalizeFlags(value: unknown): Flags {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const pick = (name: FlagName) => (record[name] === "off" ? "off" : "on");
  return { realtime: pick("realtime"), moments: pick("moments"), sync: pick("sync") };
}

export function applyFlag(flags: Flags, name: string, value: string): Flags {
  if (name !== "realtime" && name !== "moments" && name !== "sync") throw new Error("rejected");
  if (value !== "on" && value !== "off") throw new Error("rejected");
  return { ...flags, [name]: value };
}

const EVENT_NAMES = new Set(["checkin", "nudge", "seen", "sync", "boxes"]);

export function countEvent(counts: Record<string, number>, body: unknown) {
  if (!body || typeof body !== "object") throw new Error("rejected");
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "name" || typeof record.name !== "string" || !EVENT_NAMES.has(record.name)) {
    throw new Error("rejected");
  }
  const next = { ...counts, [record.name]: (counts[record.name] ?? 0) + 1 };
  return { counts: next, name: record.name, count: next[record.name] ?? 1 };
}

export function foreignFields(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => foreignFields(item));
  const found: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED.has(key)) found.push(key);
    if (child && typeof child === "object") found.push(...foreignFields(child));
  }
  return found;
}

export function readableHealth(raw: string) {
  return READABLE.test(raw);
}

export function socketCanon(nonce: string, pactId: string, pk: string) {
  return `${nonce}.${pactId}.${pk}`;
}

export function envelopeCanon(envelope: Omit<PactEnvelope, "sig">) {
  return [envelope.v, envelope.pactId, envelope.epoch, envelope.senderPk, envelope.kind, envelope.nonce, envelope.ct].join(".");
}

export function assertEnvelope(body: unknown): PactEnvelope {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("rejected");
  if (foreignFields(body).length > 0 || readableHealth(JSON.stringify(body))) throw new Error("plaintext or health field");
  const record = body as Record<string, unknown>;
  if (ENVELOPE_FIELDS.some((key) => !(key in record)) || Object.keys(record).length !== ENVELOPE_FIELDS.length) {
    throw new Error("rejected");
  }
  if (record.v !== 1 || typeof record.pactId !== "string" || !record.pactId.trim()) throw new Error("rejected");
  if (typeof record.epoch !== "number" || !Number.isInteger(record.epoch)) throw new Error("rejected");
  if (typeof record.senderPk !== "string" || record.senderPk.length < 20) throw new Error("rejected");
  if (typeof record.kind !== "string" || !KINDS.has(record.kind)) throw new Error("rejected");
  if (typeof record.nonce !== "string" || record.nonce.length < 20) throw new Error("rejected");
  if (typeof record.ct !== "string" || record.ct.length < 20) throw new Error("rejected");
  if (typeof record.sig !== "string" || record.sig.length < 40) throw new Error("rejected");
  return record as PactEnvelope;
}

export async function sha256B64(body: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return bytesToB64Url(new Uint8Array(digest));
}

export async function requestCanon(input: { ts: number; method: string; path: string; offsetMin: number; body: string }) {
  const hash = await sha256B64(input.body);
  return `${input.ts}.${input.method.toUpperCase()}.${input.path}.${input.offsetMin}.${hash}`;
}

export async function verifyEd25519(pk: string, sig: string, message: string) {
  try {
    const key = await crypto.subtle.importKey("raw", b64UrlToBytes(pk), { name: "Ed25519" }, false, ["verify"]);
    return crypto.subtle.verify({ name: "Ed25519" }, key, b64UrlToBytes(sig), new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

export async function verifyRequest(input: {
  pk: string;
  sig: string;
  ts: number;
  method: string;
  path: string;
  offsetMin: number;
  body: string;
  now: number;
}) {
  if (!input.pk || !input.sig || !Number.isFinite(input.ts) || !Number.isFinite(input.offsetMin)) return false;
  if (Math.abs(input.now / 1000 - input.ts) > 60) return false;
  if (!Number.isInteger(input.offsetMin) || input.offsetMin < -14 * 60 || input.offsetMin > 14 * 60) return false;
  const canon = await requestCanon(input);
  return verifyEd25519(input.pk, input.sig, canon);
}

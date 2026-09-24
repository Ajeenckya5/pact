export type FetchErrorKind = "http" | "timeout" | "network" | "parse";

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { kind: FetchErrorKind; status?: number; message: string } };

type FetchJsonInit = RequestInit & { timeoutMs?: number; retries?: number };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fixed origins. The fetch URL is built from one of these strings, not from the caller. */
function hostOrigin(hostname: string, protocol: string, port: string): string | null {
  if (protocol === "https:" && (port === "" || port === "443")) {
    if (hostname === "example.test") return "https://example.test";
    if (hostname === "pact-api.ajeenckya.workers.dev") return "https://pact-api.ajeenckya.workers.dev";
    if (hostname === "pact-aj.pages.dev") return "https://pact-aj.pages.dev";
    if (hostname === "ajeenckya5.github.io") return "https://ajeenckya5.github.io";
    if (hostname === "world.openfoodfacts.org") return "https://world.openfoodfacts.org";
    if (hostname === "search.openfoodfacts.org") return "https://search.openfoodfacts.org";
    if (hostname === "api.open-meteo.com") return "https://api.open-meteo.com";
    if (hostname === "air-quality-api.open-meteo.com") return "https://air-quality-api.open-meteo.com";
    if (hostname === "geocoding-api.open-meteo.com") return "https://geocoding-api.open-meteo.com";
    if (hostname === "overpass-api.de") return "https://overpass-api.de";
    if (hostname === "overpass.kumi.systems") return "https://overpass.kumi.systems";
    if (hostname === "wger.de") return "https://wger.de";
    if (hostname === "api.bigdatacloud.net") return "https://api.bigdatacloud.net";
    if (hostname === "tile.openstreetmap.org") return "https://tile.openstreetmap.org";
    if (hostname === "tiles.openfreemap.org") return "https://tiles.openfreemap.org";
    if (hostname === "i.ytimg.com") return "https://i.ytimg.com";
    if (hostname === "www.youtube.com") return "https://www.youtube.com";
    if (hostname === "images.unsplash.com") return "https://images.unsplash.com";
    if (hostname === "api.github.com") return "https://api.github.com";
    if (hostname === "github.com") return "https://github.com";
  }
  if (protocol === "http:" && hostname === "127.0.0.1" && port === "8788") return "http://127.0.0.1:8788";
  if (protocol === "http:" && hostname === "localhost" && port === "8788") return "http://localhost:8788";
  if (protocol === "http:" && hostname === "127.0.0.1" && port === "3099") return "http://127.0.0.1:3099";
  if (protocol === "http:" && hostname === "localhost" && port === "3099") return "http://localhost:3099";
  if (protocol === "http:" && hostname === "127.0.0.1" && port === "3101") return "http://127.0.0.1:3101";
  if (protocol === "http:" && hostname === "localhost" && port === "3101") return "http://localhost:3101";
  if (protocol === "http:" && hostname === "127.0.0.1" && (port === "" || port === "80")) return "http://127.0.0.1";
  if (protocol === "http:" && hostname === "localhost" && (port === "" || port === "80")) return "http://localhost";
  return null;
}

/** Same-origin paths, or a URL rebuilt from an allowlisted origin. */
export function allowedRequestUrl(input: string): string | null {
  if (input.startsWith("/") && !input.startsWith("//") && !input.includes("://") && !input.includes("\\")) return input;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const origin = hostOrigin(url.hostname, url.protocol, url.port);
  if (!origin) return null;
  return origin + url.pathname + url.search;
}

async function once<T>(url: string, init: FetchJsonInit | undefined, timeoutMs: number): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const parent = init?.signal;
  const rest: RequestInit = { ...(init ?? {}) };
  delete (rest as FetchJsonInit).timeoutMs;
  delete (rest as FetchJsonInit).retries;
  delete rest.signal;
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const target = allowedRequestUrl(url);
  if (!target) {
    clearTimeout(timer);
    return { ok: false, error: { kind: "network", message: "blocked url" } };
  }
  try {
    const res = await fetch(target, { ...rest, signal: controller.signal });
    if (!res.ok) {
      return { ok: false, error: { kind: "http", status: res.status, message: `${res.status} ${url}` } };
    }
    const text = await res.text();
    const type = res.headers.get("content-type") ?? "";
    const trimmed = text.trim();
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (!type.includes("json") && !looksJson) {
      return { ok: false, error: { kind: "parse", status: res.status, message: `not json ${res.status} ${url}` } };
    }
    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, error: { kind: "parse", status: res.status, message: `invalid json ${url}` } };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: { kind: "timeout", message: `timeout ${url}` } };
    }
    return { ok: false, error: { kind: "network", message: err instanceof Error ? err.message : "network" } };
  } finally {
    clearTimeout(timer);
  }
}

/** Status check for probes. Never throws. */
export async function fetchStatus(url: string, timeoutMs = 8_000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const target = allowedRequestUrl(url);
  if (!target) {
    clearTimeout(timer);
    return false;
  }
  try {
    const res = await fetch(target, { cache: "no-store", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON fetch that never throws. One retry on timeout, network, or 5xx. */
export async function fetchJson<T>(url: string, init?: FetchJsonInit): Promise<FetchResult<T>> {
  const retries = init?.retries ?? 1;
  const timeoutMs = init?.timeoutMs ?? 8_000;
  let last: FetchResult<T> = { ok: false, error: { kind: "network", message: "network" } };
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await delay(200 + Math.floor(Math.random() * 200));
    last = await once<T>(url, init, timeoutMs);
    if (last.ok) return last;
    const retryable =
      last.error.kind === "timeout" ||
      last.error.kind === "network" ||
      (last.error.kind === "http" && (last.error.status ?? 0) >= 500);
    if (!retryable) return last;
  }
  return last;
}

const FORWARDED = ["content-type", "x-pact-pk", "x-pact-ts", "x-pact-sig", "x-pact-offset"];

/** Proxy a signed browser request to the Worker. Fetch stays in this module. */
export async function forward(request: Request, url: string) {
  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const target = allowedRequestUrl(url);
  if (!target) return new Response("blocked url", { status: 400 });
  const res = await fetch(target, { method, headers, body, cache: "no-store" });
  const out = new Headers();
  const type = res.headers.get("content-type");
  if (type) out.set("content-type", type);
  return new Response(res.body, { status: res.status, headers: out });
}

export type FetchErrorKind = "http" | "timeout" | "network" | "parse";

export class FetchError extends Error {
  readonly kind: FetchErrorKind;
  readonly status?: number;
  readonly url: string;

  constructor(kind: FetchErrorKind, url: string, message: string, status?: number) {
    super(message);
    this.name = "FetchError";
    this.kind = kind;
    this.url = url;
    this.status = status;
  }
}

type FetchJsonInit = RequestInit & { timeoutMs?: number; retries?: number };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function once<T>(url: string, init: FetchJsonInit | undefined, timeoutMs: number): Promise<T> {
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
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) throw new FetchError("http", url, `${res.status} ${url}`, res.status);
    const text = await res.text();
    const type = res.headers.get("content-type") ?? "";
    const trimmed = text.trim();
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (!type.includes("json") && !looksJson) {
      throw new FetchError("parse", url, `not json ${res.status} ${url}`, res.status);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new FetchError("parse", url, `invalid json ${url}`, res.status);
    }
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new FetchError("timeout", url, `timeout ${url}`);
    throw new FetchError("network", url, err instanceof Error ? err.message : "network");
  } finally {
    clearTimeout(timer);
  }
}

/** One typed JSON fetch. Retries once on timeout, network, or 5xx. */
export async function fetchJson<T>(url: string, init?: FetchJsonInit): Promise<T> {
  const retries = init?.retries ?? 1;
  const timeoutMs = init?.timeoutMs ?? 12_000;
  let last: FetchError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await delay(200 * attempt);
    try {
      return await once<T>(url, init, timeoutMs);
    } catch (err) {
      last = err instanceof FetchError ? err : new FetchError("network", url, "network");
      const retryable = last.kind === "timeout" || last.kind === "network" || (last.kind === "http" && (last.status ?? 0) >= 500);
      if (!retryable || attempt === retries) throw last;
    }
  }
  throw last ?? new FetchError("network", url, "network");
}

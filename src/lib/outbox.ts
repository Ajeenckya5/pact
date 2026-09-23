import { pactHeaders, type PactEnvelope } from "@pact/core";
import { fetchJson } from "@/lib/http";
import { deviceIdentity } from "@/lib/identity";

export type OutItem = {
  id: string;
  body: PactEnvelope;
  status: "pending" | "failed";
};

export type OutSnapshot = { failed: number; pending: number };

const KEY = "pact.outbox";
const listeners = new Set<() => void>();
let snapshot: OutSnapshot = { failed: 0, pending: 0 };

function isEnvelope(value: unknown): value is PactEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PactEnvelope>;
  return record.v === 1 && typeof record.ct === "string" && typeof record.sig === "string" && typeof record.pactId === "string";
}

function read(): OutItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown[];
    return parsed.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Partial<OutItem>;
      if (item.id && isEnvelope(item.body)) return [{ id: item.id, body: item.body, status: item.status === "failed" ? "failed" as const : "pending" as const }];
      return [];
    });
  } catch {
    return [];
  }
}

function write(items: OutItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  snapshot = {
    failed: items.filter((item) => item.status === "failed").length,
    pending: items.filter((item) => item.status === "pending").length,
  };
  for (const listener of listeners) listener();
}

export function outboxSnapshot() {
  return snapshot;
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueOut(body: PactEnvelope) {
  const items = read().filter((item) => item.id !== body.nonce);
  const next: OutItem = { id: body.nonce, body, status: "pending" };
  write([...items, next]);
  return next;
}

export function applyFlush(items: OutItem[], ok: Record<string, boolean>) {
  const remaining = items.flatMap((item) => {
    if (ok[item.id] === true) return [];
    if (ok[item.id] === false) return [{ ...item, status: "failed" as const }];
    return [item];
  });
  return {
    items: remaining,
    failed: remaining.filter((item) => item.status === "failed").length,
  };
}

export async function flushOutbox() {
  const items = read();
  const keys = await deviceIdentity();
  const ok: Record<string, boolean> = {};
  for (const item of items) {
    const now = Date.now();
    const offsetMin = -new Date(now).getTimezoneOffset();
    const body = JSON.stringify(item.body);
    const path = `/pacts/${item.body.pactId}/messages`;
    const headers = await pactHeaders(keys, { method: "POST", path, body, now, offsetMin });
    const result = await fetchJson(`/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      retries: 0,
    });
    ok[item.id] = result.ok;
  }
  const next = applyFlush(items, ok);
  write(next.items);
  return next.failed === 0;
}

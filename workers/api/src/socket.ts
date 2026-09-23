import { socketCanon, verifyEd25519 } from "../../../packages/core/src/wire";

export const AUTH_MS = 5000;

export type SocketAuth = {
  nonce: string;
  openedAt: number;
  authed: boolean;
  pk?: string;
};

export type ReplayCache = {
  has(sig: string): boolean | Promise<boolean>;
  add(sig: string): void | Promise<void>;
};

export function beginSocket(now: number): SocketAuth {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const nonce = btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return { nonce, openedAt: now, authed: false };
}

export async function consumeSocketAuth(
  state: SocketAuth,
  raw: string,
  replay: ReplayCache,
  now: number,
  pactId: string,
) {
  if (state.authed) return "rejected" as const;
  if (now - state.openedAt > AUTH_MS) return "timeout" as const;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "rejected" as const;
  }
  if (!parsed || typeof parsed !== "object") return "rejected" as const;
  const record = parsed as { pk?: unknown; sig?: unknown };
  if (typeof record.pk !== "string" || typeof record.sig !== "string") return "rejected" as const;
  if (await replay.has(record.sig)) return "replay" as const;
  const ok = await verifyEd25519(record.pk, record.sig, socketCanon(state.nonce, pactId, record.pk));
  if (!ok) return "rejected" as const;
  await replay.add(record.sig);
  state.authed = true;
  state.pk = record.pk;
  return "ok" as const;
}

export function relayFrame(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown };
    return parsed.type === "hello" || parsed.type === "epoch";
  } catch {
    return false;
  }
}

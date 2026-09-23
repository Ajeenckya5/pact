import { parseInviteFragment } from "@pact/core";

export type LivePact = { pactId: string; secret: string };

export function tabId() {
  const existing = sessionStorage.getItem("pact.tab");
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem("pact.tab", next);
  return next;
}

const roomListeners = new Set<() => void>();
let roomCache: LivePact | null | undefined;

function publishRoom(next: LivePact | null) {
  roomCache = next;
  for (const listener of roomListeners) listener();
}

export function subscribeRoom(listener: () => void) {
  roomListeners.add(listener);
  return () => roomListeners.delete(listener);
}

export function roomSnapshot() {
  if (roomCache === undefined) roomCache = typeof window === "undefined" ? null : readPact();
  return roomCache;
}

export function rememberPact(pactId: string, secret: string) {
  sessionStorage.setItem(`pact.secret.${pactId}`, secret);
  sessionStorage.setItem("pact.live", JSON.stringify({ pactId }));
  publishRoom({ pactId, secret });
  window.dispatchEvent(new Event("pact-live"));
}

export function readPact(): LivePact | null {
  const fromHash = parseInviteFragment(window.location.hash);
  if (fromHash) {
    sessionStorage.setItem(`pact.secret.${fromHash.pactId}`, fromHash.inviteSecret);
    sessionStorage.setItem("pact.live", JSON.stringify({ pactId: fromHash.pactId }));
    return { pactId: fromHash.pactId, secret: fromHash.inviteSecret };
  }
  const raw = sessionStorage.getItem("pact.live");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { pactId?: string };
    if (!parsed.pactId) return null;
    const secret = sessionStorage.getItem(`pact.secret.${parsed.pactId}`);
    if (!secret) return null;
    return { pactId: parsed.pactId, secret };
  } catch {
    return null;
  }
}

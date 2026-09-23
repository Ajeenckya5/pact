import { inviteProof, parseInviteFragment } from "@pact/core";

export type LivePact = { pactId: string; epochKey: Uint8Array | null };

const secrets = new Map<string, string>();
const epochKeys = new Map<string, Uint8Array>();
const roomListeners = new Set<() => void>();
let roomCache: LivePact | null | undefined;

function publishRoom(next: LivePact | null) {
  roomCache = next;
  for (const listener of roomListeners) listener();
}

function browserStorage() {
  return window.sessionStorage;
}

function clearFragment() {
  if (!window.location.hash) return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(window.history.state, "", next);
}

export function tabId() {
  const existing = browserStorage().getItem("pact.tab");
  if (existing) return existing;
  const next = crypto.randomUUID();
  browserStorage().setItem("pact.tab", next);
  return next;
}

export function subscribeRoom(listener: () => void) {
  roomListeners.add(listener);
  return () => roomListeners.delete(listener);
}

export function roomSnapshot() {
  if (roomCache === undefined) roomCache = typeof window === "undefined" ? null : readPact();
  return roomCache;
}

export function heldInvite(pactId: string) {
  return secrets.get(pactId) ?? null;
}

export function rememberPact(pactId: string, secret: string) {
  secrets.set(pactId, secret);
  browserStorage().setItem("pact.live", JSON.stringify({ pactId }));
  clearFragment();
  publishRoom({ pactId, epochKey: epochKeys.get(pactId) ?? null });
  window.dispatchEvent(new Event("pact-live"));
}

export function readPact(): LivePact | null {
  const fromHash = parseInviteFragment(window.location.hash);
  if (fromHash) {
    secrets.set(fromHash.pactId, fromHash.inviteSecret);
    browserStorage().setItem("pact.live", JSON.stringify({ pactId: fromHash.pactId }));
    clearFragment();
    return { pactId: fromHash.pactId, epochKey: epochKeys.get(fromHash.pactId) ?? null };
  }
  const raw = browserStorage().getItem("pact.live");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { pactId?: string };
    if (!parsed.pactId) return null;
    return { pactId: parsed.pactId, epochKey: epochKeys.get(parsed.pactId) ?? null };
  } catch {
    return null;
  }
}

/** The MAC is what gets sent. The invite secret does not survive this call. */
export async function issueJoinMac(pactId: string) {
  const secret = secrets.get(pactId);
  if (!secret) return null;
  const mac = await inviteProof(secret, pactId);
  secrets.delete(pactId);
  return mac;
}

export function setEpochKey(pactId: string, epochKey: Uint8Array) {
  epochKeys.set(pactId, epochKey);
  const current = roomCache === undefined ? null : roomCache;
  if (current?.pactId === pactId) publishRoom({ pactId, epochKey });
}

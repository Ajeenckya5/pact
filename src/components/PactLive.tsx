"use client";

import { openEnvelope, pactHeaders, shouldSendReceipt, type Flags, type PactEnvelope } from "@pact/core";
import { pactApi } from "@/lib/api-origin";
import { queueEnvelope } from "@/lib/deliver";
import { tap } from "@/lib/experience";
import { readCachedFlags, refreshFlags } from "@/lib/flags";
import { fetchJson } from "@/lib/http";
import { deviceIdentity } from "@/lib/identity";
import { flushOutbox, outboxSnapshot, subscribeOutbox } from "@/lib/outbox";
import { roomSnapshot, subscribeRoom, type LivePact } from "@/lib/pact-session";
import { celebrationMode } from "@/lib/personal-today";
import { usePact } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

type Boxes = { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
type Party = "off" | "quiet" | "full";

const EMPTY: Boxes = { sleep: false, fuel: false, water: false, move: false };
const EMPTY_OUT = { failed: 0, pending: 0 };

type LiveApi = {
  flash: (message: string) => void;
  mark: (threadId: string, messageId: string, status: NonNullable<ChatMessage["status"]>) => void;
};

const liveApi: LiveApi & { pk: string; receipts: boolean; room: LivePact | null } = {
  flash() {},
  mark() {},
  pk: "",
  receipts: true,
  room: null,
};

let party: Party = "off";
const partyListeners = new Set<() => void>();

function subscribeParty(listener: () => void) {
  partyListeners.add(listener);
  return () => partyListeners.delete(listener);
}

function partySnapshot() {
  return party;
}

function startParty(mode: Party) {
  party = mode;
  for (const listener of partyListeners) listener();
  setTimeout(() => {
    party = "off";
    for (const listener of partyListeners) listener();
  }, 1400);
}

type PartnerState = {
  partner: Boxes;
  pulse: Partial<Record<keyof Boxes, number>>;
  live: "off" | "open";
};

const PartnerCtx = createContext<PartnerState>({ partner: EMPTY, pulse: {}, live: "off" });

export function usePartner() {
  return useContext(PartnerCtx);
}

export function PactLive({ children }: { children: ReactNode }) {
  const store = usePact();
  const room = useSyncExternalStore(subscribeRoom, roomSnapshot, () => null);
  const celebrate = useSyncExternalStore(subscribeParty, partySnapshot, () => "off" as const);
  const outbox = useSyncExternalStore(subscribeOutbox, outboxSnapshot, () => EMPTY_OUT);
  const [flags, setFlags] = useState<Flags>(() => readCachedFlags());
  const [partner, setPartner] = useState<{ boxes: Boxes; pulse: Partial<Record<keyof Boxes, number>>; live: "off" | "open" }>({
    boxes: EMPTY,
    pulse: {},
    live: "off",
  });
  const prevBoxes = useRef<string | null>(null);
  const prevAll = useRef(false);
  const partnerRef = useRef<Boxes>(EMPTY);

  useEffect(() => {
    liveApi.flash = store.flash;
    liveApi.mark = store.markMessage;
    liveApi.receipts = shouldSendReceipt(store.prefs.seenReceipts);
    liveApi.room = room;
  }, [store, room]);

  useEffect(() => {
    void refreshFlags().then((next) => setFlags(next));
  }, []);

  useEffect(() => {
    if (!room || flags.realtime === "off") return;
    let ws: WebSocket | null = null;
    let cancelled = false;
    const onFrame = (raw: string) => {
      let frame: PactEnvelope;
      try {
        frame = JSON.parse(raw) as PactEnvelope;
      } catch {
        return;
      }
      if (!frame.ct || frame.senderPk === liveApi.pk) return;
      void openEnvelope(room.secret, frame)
        .then((payload) => applyFrame(frame.kind, payload, partnerRef, setPartner))
        .catch(() => {});
    };
    void (async () => {
      const keys = await deviceIdentity();
      if (cancelled) return;
      liveApi.pk = keys.pk;
      const result = await fetchJson<{ url: string | null }>(pactApi("/live"), { retries: 0 });
      if (cancelled) return;
      const url = result.ok ? result.data.url : null;
      if (!url) return;
      const path = `/pacts/${room.pactId}`;
      const headers = await pactHeaders(keys, { method: "GET", path, body: "" });
      if (cancelled) return;
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(headers)) query.set(key.toLowerCase(), value);
      ws = new WebSocket(`${url}${path}?${query}`);
      ws.onopen = () => {
        setPartner((current) => ({ ...current, live: "open" }));
      };
      ws.onmessage = (event) => onFrame(String(event.data));
    })();
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [room, flags.realtime]);

  useEffect(() => {
    const signature = JSON.stringify(store.checkins);
    if (prevBoxes.current === null) {
      prevBoxes.current = signature;
      return;
    }
    if (prevBoxes.current === signature) return;
    prevBoxes.current = signature;
    if (!room || flags.sync === "off") return;
    void sendLive(room, "boxes", store.checkins);
  }, [store.checkins, room, flags.sync]);

  useEffect(() => {
    const onMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ threadId: string; id: string; text: string }>).detail;
      if (!room || flags.sync === "off") {
        liveApi.mark(detail.threadId, detail.id, "delivered");
        return;
      }
      void sendLive(room, "chat", { threadId: detail.threadId, messageId: detail.id, text: detail.text }).then((ok) => {
        liveApi.mark(detail.threadId, detail.id, ok ? "delivered" : "failed");
      });
    };
    const onNudge = () => {
      if (!room || flags.sync === "off") return;
      void sendLive(room, "nudge", {});
    };
    window.addEventListener("pact-message", onMessage);
    window.addEventListener("pact-nudge", onNudge);
    return () => {
      window.removeEventListener("pact-message", onMessage);
      window.removeEventListener("pact-nudge", onNudge);
    };
  }, [room, flags.sync]);

  const allIn = store.checkins.sleep && store.checkins.fuel && store.checkins.water && store.checkins.move;
  useEffect(() => {
    if (allIn && !prevAll.current) {
      const mode = celebrationMode(store.prefs.reducedMotion, flags.moments !== "off");
      if (mode === "full") tap(18);
      if (mode !== "off") {
        startParty(mode);
        liveApi.flash("All four boxes");
      }
    }
    prevAll.current = allIn;
  }, [allIn, store.prefs.reducedMotion, flags.moments]);

  return (
    <PartnerCtx.Provider value={{ partner: partner.boxes, pulse: partner.pulse, live: partner.live }}>
      {children}
      {outbox.failed > 0 ? (
        <button
          type="button"
          className="fixed bottom-24 left-1/2 z-50 min-h-11 -translate-x-1/2 rounded-full border border-heat bg-ink px-4 text-sm text-heat"
          onClick={() => void flushOutbox()}
        >
          Retry sync
        </button>
      ) : null}
      {celebrate === "full" ? <Confetti /> : null}
      <span className="sr-only" data-live={partner.live} data-celebrate={celebrate} />
    </PartnerCtx.Provider>
  );
}

function applyFrame(
  kind: string,
  payload: unknown,
  partnerRef: { current: Boxes },
  setPartner: (value: { boxes: Boxes; pulse: Partial<Record<keyof Boxes, number>>; live: "off" | "open" } | ((current: { boxes: Boxes; pulse: Partial<Record<keyof Boxes, number>>; live: "off" | "open" }) => { boxes: Boxes; pulse: Partial<Record<keyof Boxes, number>>; live: "off" | "open" })) => void,
) {
  const record = (payload && typeof payload === "object" ? payload : {}) as {
    sleep?: boolean;
    fuel?: boolean;
    water?: boolean;
    move?: boolean;
    threadId?: string;
    messageId?: string;
  };
  if (kind === "boxes") {
    const next: Boxes = {
      sleep: Boolean(record.sleep),
      fuel: Boolean(record.fuel),
      water: Boolean(record.water),
      move: Boolean(record.move),
    };
    const stamp = Date.now();
    const changed: Partial<Record<keyof Boxes, number>> = {};
    (Object.keys(next) as (keyof Boxes)[]).forEach((key) => {
      if (partnerRef.current[key] !== next[key]) changed[key] = stamp;
    });
    partnerRef.current = next;
    setPartner((current) => ({ ...current, boxes: next, pulse: { ...current.pulse, ...changed } }));
  } else if (kind === "nudge") {
    liveApi.flash("Your partner nudged you");
  } else if (kind === "seen" && record.threadId && record.messageId) {
    liveApi.mark(record.threadId, record.messageId, "seen");
  } else if (kind === "chat" && record.threadId && record.messageId && liveApi.receipts && liveApi.room) {
    void sendLive(liveApi.room, "seen", { threadId: record.threadId, messageId: record.messageId });
  }
}

async function sendLive(room: LivePact, kind: "boxes" | "chat" | "nudge" | "seen", payload: unknown) {
  const ok = await queueEnvelope(room.pactId, room.secret, kind, payload);
  const name = kind === "boxes" ? "boxes" : kind === "nudge" ? "nudge" : kind === "seen" ? "seen" : "sync";
  if (ok) {
    void fetchJson(pactApi("/events"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
      retries: 0,
    });
  }
  return ok;
}

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const colors = ["#d6ff3f", "#ff6b4a", "#5cc8ff", "#ffc857"];
    const bits = Array.from({ length: 48 }, () => ({
      x: width / 2,
      y: height * 0.3,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -8 - 2,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#d6ff3f",
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);
      for (const bit of bits) {
        bit.x += bit.vx;
        bit.y += bit.vy;
        bit.vy += 0.18;
        ctx.fillStyle = bit.color;
        ctx.fillRect(bit.x, bit.y, 6, 8);
      }
      if (frame < 70) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-40" aria-hidden="true" />;
}

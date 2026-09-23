import { DurableObject } from "cloudflare:workers";
import { originAllowed } from "./origin";
import { roomFetch, retain } from "./room";
import { beginSocket, consumeSocketAuth, relayFrame, type SocketAuth } from "./socket";
import { normalizeFlags, type Flags } from "../../../packages/core/src/wire";
import type { Env } from "./worker";

type Attachment = SocketAuth & { pactId: string };

/** One ordered log per pact. WebSocket hibernation fans ciphertext out to the other device. */
export class PactRoom extends DurableObject<Env> {
  async fetch(request: Request) {
    const flags = await flagsFor(this.env);
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      if (flags.realtime === "off") return new Response("Rejected", { status: 401 });
      if (!originAllowed(request.headers.get("origin") ?? "")) return new Response("Rejected", { status: 403 });
      const pactId = pactIdFrom(request);
      if (!pactId) return new Response("Rejected", { status: 400 });
      const pair = new WebSocketPair();
      const server = pair[1];
      const state: Attachment = { ...beginSocket(Date.now()), pactId };
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment(state);
      server.send(JSON.stringify({ type: "challenge", nonce: state.nonce }));
      setTimeout(() => {
        const current = server.deserializeAttachment() as Attachment | null;
        if (!current?.authed) {
          try {
            server.close(4001, "auth timeout");
          } catch {
            /* already closed */
          }
        }
      }, 5000);
      return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & { webSocket: WebSocket });
    }
    return roomFetch(this.ctx, request, flags);
  }

  async alarm() {
    await retain(this.ctx.storage);
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const state = ws.deserializeAttachment() as Attachment | null;
    if (!state) {
      ws.close(4001, "rejected");
      return;
    }
    if (!state.authed) {
      const result = await consumeSocketAuth(state, text, storageReplay(this.ctx.storage), Date.now(), state.pactId);
      if (result !== "ok") {
        ws.close(4001, result);
        return;
      }
      ws.serializeAttachment(state);
      return;
    }
    if (!relayFrame(text)) return;
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) other.send(text);
    }
  }

  async webSocketClose(ws: WebSocket) {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }

  async webSocketError(ws: WebSocket) {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  }
}

function pactIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = parts.indexOf("pacts");
  return index >= 0 ? decodeURIComponent(parts[index + 1] ?? "") : "";
}

function storageReplay(storage: DurableObject["ctx"]["storage"]) {
  return {
    async has(sig: string) {
      return (await storage.get(`replay:${sig}`)) === true;
    },
    async add(sig: string) {
      await storage.put(`replay:${sig}`, true);
    },
  };
}

async function flagsFor(env: Env): Promise<Flags> {
  try {
    return normalizeFlags(await env.PACT_CONFIG.get("flags", "json"));
  } catch {
    return normalizeFlags(null);
  }
}

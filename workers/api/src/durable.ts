import { DurableObject } from "cloudflare:workers";
import { roomFetch, retain, signedRequest } from "./room";
import { normalizeFlags, type Flags } from "../../../packages/core/src/wire";
import type { Env } from "./worker";

/** One ordered log per pact. WebSocket hibernation fans ciphertext out to the other device. */
export class PactRoom extends DurableObject<Env> {
  async fetch(request: Request) {
    const flags = await flagsFor(this.env);
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const auth = await signedRequest(request, "");
      if (!auth || flags.realtime === "off") return new Response("Rejected", { status: 401 });
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit & { webSocket: WebSocket });
    }
    return roomFetch(this.ctx, request, flags);
  }

  async alarm() {
    await retain(this.ctx.storage);
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
  }

  async webSocketMessage() {}

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

async function flagsFor(env: Env): Promise<Flags> {
  try {
    return normalizeFlags(await env.PACT_CONFIG.get("flags", "json"));
  } catch {
    return normalizeFlags(null);
  }
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

declare module "cloudflare:workers" {
  export abstract class DurableObject<E = unknown> {
    ctx: {
      storage: {
        get<T>(key: string): Promise<T | undefined>;
        put(key: string, value: unknown): Promise<void>;
        delete(key: string): Promise<void>;
        list<T>(options?: { prefix?: string }): Promise<Map<string, T>>;
        setAlarm(scheduledTime: number): Promise<void>;
      };
      acceptWebSocket(ws: WebSocket): void;
      getWebSockets(): WebSocket[];
    };
    env: E;
    constructor(ctx: DurableObject<E>["ctx"], env: E);
  }
}

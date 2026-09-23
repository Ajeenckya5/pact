import webpush from "web-push";

type WebPushApi = {
  generateRequestDetails(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: { vapidDetails: { subject: string; publicKey: string; privateKey: string }; TTL: number },
  ): { endpoint: string; headers: Record<string, string>; body?: Uint8Array };
};

/** Opaque nudge. No sleep, water, or other health fields. */
export const NUDGE_PUSH = { title: "Pact", body: "Your partner nudged you." };

type PushRow = { endpoint: string; p256dh: string; auth: string; sender_pk: string };

type PushDb = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

type PushEnv = {
  PACT_DB: PushDb;
  VAPID_PUBLIC: string;
  VAPID_PRIVATE: string;
  VAPID_SUBJECT: string;
};

export async function saveSubscription(
  env: PushEnv,
  row: { endpoint: string; pactId: string; senderPk: string; p256dh: string; auth: string },
) {
  await env.PACT_DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, pact_id, sender_pk, p256dh, auth, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(endpoint) DO UPDATE SET pact_id = ?2, sender_pk = ?3, p256dh = ?4, auth = ?5`,
  )
    .bind(row.endpoint, row.pactId, row.senderPk, row.p256dh, row.auth, Date.now())
    .run();
}

export async function notifyPartners(env: PushEnv, pactId: string, senderPk: string) {
  if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return;
  const listed = await env.PACT_DB.prepare(
    "SELECT endpoint, p256dh, auth, sender_pk FROM push_subscriptions WHERE pact_id = ?1",
  )
    .bind(pactId)
    .all<PushRow>();
  const payload = JSON.stringify(NUDGE_PUSH);
  await Promise.all(
    (listed.results ?? [])
      .filter((row) => row.sender_pk !== senderPk)
      .map(async (row) => {
        const details = (webpush as unknown as WebPushApi).generateRequestDetails(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload,
          {
            vapidDetails: {
              subject: env.VAPID_SUBJECT || "mailto:pact@users.noreply.github.com",
              publicKey: env.VAPID_PUBLIC,
              privateKey: env.VAPID_PRIVATE,
            },
            TTL: 60,
          },
        );
        const response = await fetch(details.endpoint, {
          method: "POST",
          headers: details.headers,
          body: details.body ? new Uint8Array(details.body) : undefined,
        });
        if (response.status === 404 || response.status === 410) {
          await env.PACT_DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?1").bind(row.endpoint).run();
        }
      }),
  );
}

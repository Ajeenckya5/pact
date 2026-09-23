const BANNED_KEYS = [
  "text",
  "message",
  "body",
  "recovery",
  "strain",
  "sleep",
  "sleepscore",
  "hrv",
  "heartrate",
  "heart_rate",
  "protein",
  "water",
  "kcal",
  "steps",
  "access_token",
  "refresh_token",
  "authorization",
];

export type CipherEnvelope = {
  v: 1;
  pactId: string;
  sender: string;
  box: string;
};

export function assertCiphertextOnly(body: unknown): CipherEnvelope {
  if (!body || typeof body !== "object") throw new Error("rejected");
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (BANNED_KEYS.includes(key.toLowerCase())) throw new Error("plaintext or health field");
  }
  const raw = JSON.stringify(body);
  if (/"recovery"\s*:/.test(raw) || /"heartRate"\s*:/.test(raw) || /"text"\s*:/.test(raw)) {
    throw new Error("plaintext or health field");
  }
  if (record.v !== 1 || typeof record.pactId !== "string" || typeof record.sender !== "string" || typeof record.box !== "string") {
    throw new Error("rejected");
  }
  if (record.box.length < 24) throw new Error("rejected");
  return { v: 1, pactId: record.pactId, sender: record.sender, box: record.box };
}

export class PactRoom {
  readonly messages: CipherEnvelope[] = [];
  post(body: unknown) {
    const envelope = assertCiphertextOnly(body);
    this.messages.push(envelope);
    return envelope;
  }
  wipe() {
    this.messages.length = 0;
  }
}

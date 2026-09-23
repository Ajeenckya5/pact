export type ReportEnvelope = {
  v: 1;
  pactId: string;
  reporter: string;
  messageId: string;
  reason: string;
  text: string;
};

const REPORT_KEYS = new Set(["v", "pactid", "reporter", "messageid", "reason", "text"]);
const BANNED_KEYS = [
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

/** A report is the one message the person chose to share. Health fields stay rejected. */
export function assertReport(body: unknown): ReportEnvelope {
  if (!body || typeof body !== "object") throw new Error("rejected");
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (!REPORT_KEYS.has(lower)) throw new Error("rejected");
    if (lower !== "text" && BANNED_KEYS.includes(lower)) throw new Error("plaintext or health field");
  }
  if (record.v !== 1 || typeof record.pactId !== "string" || !record.pactId.trim()) throw new Error("rejected");
  if (typeof record.reporter !== "string" || !record.reporter.trim()) throw new Error("rejected");
  if (typeof record.messageId !== "string" || typeof record.reason !== "string" || typeof record.text !== "string") {
    throw new Error("rejected");
  }
  const reason = record.reason.trim();
  const text = record.text.trim();
  if (!reason || reason.length > 280 || !text || text.length > 2000) throw new Error("rejected");
  return {
    v: 1,
    pactId: record.pactId,
    reporter: record.reporter,
    messageId: record.messageId,
    reason,
    text,
  };
}

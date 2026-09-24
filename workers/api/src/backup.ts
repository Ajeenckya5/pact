const CT_RE = /^[A-Za-z0-9_-]+$/;

/** Personal history is one sealed box. Anything else is rejected. */
export function backupCiphertext(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "ct") return null;
  const ct = record.ct;
  if (typeof ct !== "string" || ct.length < 16 || ct.length > 256_000) return null;
  if (!CT_RE.test(ct)) return null;
  return ct;
}

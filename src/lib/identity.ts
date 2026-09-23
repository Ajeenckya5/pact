import { createSigningKey } from "@pact/core";

const KEY = "pact.device-key";

export async function deviceIdentity() {
  const existing = localStorage.getItem(KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as { pk?: string; sk?: string };
      if (parsed.pk && parsed.sk) return { pk: parsed.pk, sk: parsed.sk };
    } catch {
      /* mint a new device key */
    }
  }
  const created = await createSigningKey();
  localStorage.setItem(KEY, JSON.stringify(created));
  return created;
}

import { openEnvelope, openSealedBox, pactHeaders, sealToBox, type PactEnvelope } from "@pact/core";
import { pactApi } from "./api-origin";
import { archiveHasRows, isHistorySlice, withoutPhotos, type HistorySlice } from "./device-history";
import { fetchJson } from "./http";
import { deviceIdentity } from "./identity";
import { roomSnapshot } from "./pact-session";

export async function uploadArchive(slice: HistorySlice): Promise<boolean> {
  if (!archiveHasRows(slice)) return true;
  const keys = await deviceIdentity();
  const ct = await sealToBox(withoutPhotos(slice), keys.boxPk);
  const body = JSON.stringify({ ct });
  const path = "/backup";
  const headers = await pactHeaders(keys, { method: "POST", path, body });
  const result = await fetchJson<{ ok?: boolean }>(pactApi(path), {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body,
    retries: 0,
  });
  return result.ok;
}

export async function loadArchives(): Promise<HistorySlice[]> {
  const keys = await deviceIdentity();
  const path = "/backup";
  const headers = await pactHeaders(keys, { method: "GET", path, body: "" });
  const result = await fetchJson<{ rows?: Array<{ ct?: string }> }>(pactApi(path), { headers, retries: 0 });
  if (!result.ok) return [];
  const slices: HistorySlice[] = [];
  for (const row of result.data.rows ?? []) {
    if (typeof row.ct !== "string") continue;
    try {
      const opened = await openSealedBox(row.ct, keys.boxPk, keys.boxSk);
      if (isHistorySlice(opened)) slices.push(opened);
    } catch {
      /* a row this device cannot open stays sealed */
    }
  }
  return slices;
}

export async function loadRoomMessages(): Promise<Array<{ id: string; at: string; text: string }>> {
  const room = roomSnapshot();
  if (!room?.pactId || !room.epochKey) return [];
  const keys = await deviceIdentity();
  const path = `/pacts/${encodeURIComponent(room.pactId)}/messages`;
  const headers = await pactHeaders(keys, { method: "GET", path, body: "" });
  const result = await fetchJson<{ messages?: PactEnvelope[] }>(`${pactApi(path)}?viewer=${encodeURIComponent(keys.pk)}`, {
    headers,
    retries: 0,
  });
  if (!result.ok) return [];
  const lines = [];
  for (const message of result.data.messages ?? []) {
    try {
      const payload = (await openEnvelope(room.epochKey, message)) as { text?: string };
      lines.push({
        id: message.nonce,
        at: String(message.epoch),
        text: typeof payload.text === "string" ? payload.text : message.kind,
      });
    } catch {
      /* skip a message this epoch key cannot open */
    }
  }
  return lines;
}

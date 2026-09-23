import { DEFAULT_FLAGS, normalizeFlags, type Flags } from "@pact/core";
import { fetchJson } from "@/lib/http";

const KEY = "pact.flags";

export function readCachedFlags(): Flags {
  if (typeof localStorage === "undefined") return DEFAULT_FLAGS;
  try {
    return normalizeFlags(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function writeCachedFlags(flags: Flags) {
  localStorage.setItem(KEY, JSON.stringify(normalizeFlags(flags)));
}

export async function refreshFlags() {
  const result = await fetchJson<{ flags?: Flags }>("/api/config", { retries: 0 });
  if (result.ok && result.data.flags) {
    const flags = normalizeFlags(result.data.flags);
    writeCachedFlags(flags);
    return flags;
  }
  return readCachedFlags();
}

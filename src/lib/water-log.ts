export type WaterSip = {
  id: string;
  ml: number;
  at: string;
  createdAt?: string;
  deviceId?: string;
  source?: "demo" | "log";
};

export function totalWater(log: WaterSip[]) {
  return Math.max(0, Math.round(log.reduce((sum, sip) => sum + sip.ml, 0)));
}

export function pushSip(log: WaterSip[], sip: WaterSip): WaterSip[] {
  if (!sip.ml) return log;
  return [...log, sip];
}

/** Remove the newest sip by timestamp, not the first button on the screen. */
export function undoLatestSip(log: WaterSip[]): { log: WaterSip[]; removed: WaterSip | null } {
  if (!log.length) return { log, removed: null };
  const latest = [...log].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)).at(-1);
  if (!latest) return { log, removed: null };
  return { log: log.filter((sip) => sip.id !== latest.id), removed: latest };
}

export function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

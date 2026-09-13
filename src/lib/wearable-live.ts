import type { BleLink } from "./bluetooth-fitness";
import { strainFromBle } from "./algos";
import { WEARABLES } from "./data";
import type { Wearable } from "./types";

export type DeviceReading = {
  id: string;
  name: string;
  kind: Wearable["kind"];
  at: number;
  recovery?: number;
  strain?: number;
  sleepScore?: number;
  sleepMin?: number;
  hrv?: number;
  hr?: number;
  rhr?: number;
  steps?: number;
  spo2?: number;
  tempDelta?: number;
};

export type LiveBaseline = {
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin: number;
  hrv: number;
  rhr: number;
  steps: number;
};

export type LiveAuthority = {
  recovery: string;
  strain: string;
  sleep: string;
  hrv: string;
  hr: string | null;
};

export type BleLive = {
  hr: number | null;
  hrv: number | null;
  cadence: number | null;
  power: number | null;
  speedKmh: number | null;
  name: string | null;
  links: number;
};

export type LiveBody = {
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin: number;
  hrv: number;
  rhr: number;
  hr: number | null;
  cadence: number | null;
  power: number | null;
  steps: number;
  spo2: number | null;
  tempDelta: number | null;
  at: number;
  ticking: boolean;
  devices: DeviceReading[];
  authority: LiveAuthority;
  ble: BleLive;
};

export const ALL_WEARABLE_IDS = WEARABLES.map((w) => w.id);

const OLD_DEFAULT = ["healthkit", "apple-watch", "oura"];
const LOG = "Pact log";

export function migrateConnectedWearables(stored: string[] | undefined) {
  if (stored == null || !stored.length) return [];
  if (stored.length >= ALL_WEARABLE_IDS.length - 1) return [];
  const isOld = stored.length === OLD_DEFAULT.length && OLD_DEFAULT.every((id) => stored.includes(id));
  if (isOld) return [];
  return stored.filter((id) => WEARABLES.some((w) => w.id === id));
}

function round(n: number, d = 0) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function readingFromLink(link: BleLink): DeviceReading {
  return {
    id: link.wearableId ?? `ble-${link.id}`,
    name: link.name,
    kind: "band",
    at: link.sample.at || Date.now(),
    hr: link.sample.hr,
    hrv: link.sample.hrv,
    spo2: link.sample.spo2,
    tempDelta: link.sample.tempC != null ? round(link.sample.tempC, 2) : undefined,
  };
}

export function fuseLive(input: { baseline: LiveBaseline; now: number; bleLinks?: BleLink[] }): LiveBody {
  const links = (input.bleLinks ?? []).filter((l) => l.connected);
  const devices = links.map(readingFromLink);
  const primary = links.find((l) => l.sample.hr != null) ?? links[0];
  const bleHr = primary?.sample.hr ?? null;
  const bleHrv = primary?.sample.hrv ?? null;
  const bleCadence = primary?.sample.cadence ?? null;
  const blePower = primary?.sample.power ?? null;
  const liveName = primary?.name ?? null;

  const strain = strainFromBle(input.baseline.strain, input.baseline.rhr, bleHr, blePower);

  return {
    recovery: input.baseline.recovery,
    strain,
    sleepScore: input.baseline.sleepScore,
    sleepMin: input.baseline.sleepMin,
    hrv: Math.round(bleHrv ?? input.baseline.hrv),
    rhr: input.baseline.rhr,
    hr: bleHr,
    cadence: bleCadence,
    power: blePower,
    steps: input.baseline.steps,
    spo2: primary?.sample.spo2 ?? null,
    tempDelta: primary?.sample.tempC != null ? round(primary.sample.tempC, 2) : null,
    at: input.now || Date.now(),
    ticking: links.length > 0 && input.now > 0,
    devices,
    authority: {
      recovery: LOG,
      strain: bleHr != null || blePower != null ? liveName ?? LOG : LOG,
      sleep: LOG,
      hrv: bleHrv != null ? liveName ?? LOG : LOG,
      hr: bleHr != null ? liveName : null,
    },
    ble: {
      hr: bleHr,
      hrv: bleHrv,
      cadence: bleCadence,
      power: blePower,
      speedKmh: primary?.sample.speedKmh ?? null,
      name: liveName,
      links: links.length,
    },
  };
}

export function liveOrLog(name: string | null | undefined) {
  if (!name || name === LOG) return LOG;
  return `Live · ${name}`;
}

export function liveSourceLine(body: LiveBody) {
  if (!body.ble.links) {
    return `Pact log · recovery ${body.recovery} · strain ${body.strain.toFixed(1)} · sleep ${body.sleepScore}`;
  }
  const bits = [`Bluetooth ${body.ble.name ?? "device"}`];
  if (body.hr != null) bits.push(`${body.hr} bpm`);
  if (body.hrv != null && body.authority.hrv !== LOG) bits.push(`HRV ${body.hrv} ms`);
  if (body.cadence != null) bits.push(`${body.cadence} rpm`);
  if (body.power != null) bits.push(`${body.power} W`);
  bits.push(`Pact log recovery ${body.recovery}`);
  return `Live · ${bits.join(" · ")}`;
}

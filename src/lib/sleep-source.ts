/**
 * Where last night's sleep came from. "user" is a manual entry or a correction, "demo" is sample
 * data, and anything else is a device id from the wearables list ("healthkit", "oura", "whoop", ...)
 * or "strap" for a paired Bluetooth strap.
 */
export type SleepSource = string;

export const SLEEP_GOAL_MIN = 7 * 60;
export const SLEEP_DEFAULT_HOURS = 7;

const SHORT_NAMES: Record<string, string> = {
  healthkit: "Apple Health",
  "health-connect": "Health Connect",
  "apple-watch": "Apple Watch",
  garmin: "Garmin",
  oura: "Oura",
  whoop: "WHOOP",
  fitbit: "Fitbit",
  samsung: "Samsung Health",
  polar: "Polar",
  strap: "your strap",
};

export function sleepSourceLabel(source: SleepSource | null | undefined) {
  if (!source) return "Not logged yet";
  if (source === "user") return "Logged by you";
  if (source === "demo") return "Sample data";
  return `From ${SHORT_NAMES[source] ?? "your device"}`;
}

/** True when a device (or sample data) supplied tonight's number and the user has not corrected it. */
export function isDeviceSleep(source: SleepSource | null | undefined, sleepMin: number) {
  return !!source && source !== "user" && sleepMin > 0;
}

export function hoursFromMinutes(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * What a save from the sleep form stores. Device hours saved as shown keep the device as the
 * source; any change is the user's correction and is stored as "user".
 */
export function resolveSleepSave(input: {
  sleepMin: number;
  sleepSource: SleepSource | null | undefined;
  hours: number;
}): { minutes: number; source: SleepSource } | null {
  const { hours } = input;
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 16) return null;
  if (isDeviceSleep(input.sleepSource, input.sleepMin) && Math.round(hours * 10) / 10 === hoursFromMinutes(input.sleepMin)) {
    return { minutes: input.sleepMin, source: input.sleepSource as SleepSource };
  }
  return { minutes: Math.round(hours * 60), source: "user" };
}

type SleepSlice = {
  sleepMin: number;
  sleepSource?: SleepSource | null;
  checkins: { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
};

export function applySleep<S extends SleepSlice>(s: S, minutes: number, source: SleepSource): S {
  const safe = Math.max(0, Math.round(minutes));
  return {
    ...s,
    sleepMin: safe,
    sleepSource: source,
    checkins: { ...s.checkins, sleep: safe >= SLEEP_GOAL_MIN },
  };
}

/** A device sync never overwrites a correction the user made for the same night. */
export function applyDeviceSleep<S extends SleepSlice>(s: S, minutes: number, source: SleepSource): S {
  if (source === "user") return applySleep(s, minutes, source);
  if (s.sleepSource === "user" && s.sleepMin > 0) return s;
  return applySleep(s, minutes, source);
}

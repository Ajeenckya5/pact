import type { Goal, Prefs, PrivacySettings } from "./types";
import type { DayPoint } from "./types";

export function restSeconds(rest?: string) {
  if (!rest) return 90;
  const range = rest.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
  if (range) return Math.round(((Number(range[1]) + Number(range[2])) / 2) * 60);
  const min = rest.match(/(\d+)\s*min/i);
  if (min) return Number(min[1]) * 60;
  const sec = rest.match(/(\d+)\s*s\b/i);
  if (sec) return Number(sec[1]);
  return 90;
}

export function clockRest(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatWater(ml: number, units: Prefs["units"]) {
  if (units === "imperial") return { value: Math.round(ml / 29.5735), unit: "oz" as const };
  return { value: Math.round(ml), unit: "ml" as const };
}

export function waterAdds(units: Prefs["units"]) {
  if (units === "imperial") {
    return [8, 12, 16, 20].map((oz) => ({ label: `+${oz} oz`, ml: Math.round(oz * 29.5735) }));
  }
  return [200, 250, 350, 500, 750, 1000].map((ml) => ({ label: `+${ml} ml`, ml }));
}

export function extraWaterForHeat(tempC: number) {
  if (tempC >= 32) return 750;
  if (tempC >= 29) return 500;
  if (tempC >= 26) return 250;
  return 0;
}

export function formatTemp(tempC: number, units: Prefs["units"]) {
  if (units === "imperial") return `${Math.round(tempC * (9 / 5) + 32)}°F`;
  return `${tempC}°C`;
}

export function remainingMacros(
  totals: { kcal: number; protein: number },
  goal: Pick<Goal, "kcal" | "protein">,
) {
  return {
    kcal: Math.round(goal.kcal - totals.kcal),
    protein: Math.round(goal.protein - totals.protein),
  };
}

export function pactShareText(input: {
  name: string;
  checkins: { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
  protein: number;
  proteinGoal: number;
  waterMl: number;
  waterGoal: number;
  trained: boolean;
  privacy: PrivacySettings;
}) {
  const bit = (ok: boolean, label: string) => `${ok ? "x" : " "} ${label}`;
  const calNote = input.privacy.calories === "private" ? "Calories stay private." : "";
  return [
    `${input.name}'s pact today`,
    bit(input.checkins.sleep, "Sleep 7h+"),
    bit(input.checkins.fuel || input.protein >= input.proteinGoal, `Protein ${Math.round(input.protein)}/${input.proteinGoal}g`),
    bit(input.checkins.water || input.waterMl >= input.waterGoal, `Water ${input.waterMl}/${input.waterGoal} ml`),
    bit(input.checkins.move || input.trained, "Train today"),
    calNote,
  ]
    .filter(Boolean)
    .join("\n");
}

export function weekRecap(history: DayPoint[], week: { sessions: number; minutes: number }, boxes: number) {
  const n = history.length || 1;
  const avg = (key: keyof DayPoint) => Math.round(history.reduce((s, h) => s + Number(h[key]), 0) / n);
  return {
    sleep: avg("sleepScore"),
    recovery: avg("recovery"),
    sessions: week.sessions,
    minutes: week.minutes,
    boxes,
  };
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function tap(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* desktop */
  }
}

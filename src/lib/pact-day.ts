import { pactDateKey } from "../../packages/core/src/streak";
import { totalWater, type WaterSip } from "./water-log";

/** The viewer's own time zone. Falls back to UTC where Intl has no zone. */
export function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Today's pact day. It runs 03:00 to 03:00 local, so a 1 a.m. glass counts toward the night before. */
export function pactToday(now = new Date(), timeZone = localZone()) {
  return pactDateKey(now, timeZone);
}

export function onPactDay<T extends { at: string }>(rows: readonly T[], day: string, timeZone = localZone()): T[] {
  return rows.filter((row) => {
    const at = new Date(row.at);
    return !Number.isNaN(at.getTime()) && pactDateKey(at, timeZone) === day;
  });
}

export type DaySlice = {
  day?: string;
  demo?: boolean;
  meals: Array<{ at: string; protein: number }>;
  waterLog?: WaterSip[];
  workoutLogs: Array<{ at: string; minutes?: number }>;
  waterMl: number;
  strain: number;
  readingMin?: number;
  sleepMin: number;
  sleepSource?: string | null;
  checkins: { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
};

/**
 * Carry an account into a new pact day. Older rows stay in history; today's four boxes are
 * rebuilt from today's rows. Sample data keeps its fixed day. Returns the same object when the
 * day has not changed, so React can skip the render.
 */
export function rollPactDay<S extends DaySlice>(
  s: S,
  goals: { waterMl: number; protein: number },
  now = new Date(),
  timeZone = localZone(),
): S {
  if (s.demo) return s;
  const today = pactToday(now, timeZone);
  if (s.day === today) return s;
  const waterMl = totalWater(onPactDay(s.waterLog ?? [], today, timeZone));
  const protein = onPactDay(s.meals, today, timeZone).reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const trained = onPactDay(s.workoutLogs, today, timeZone);
  const moved = trained.length > 0;
  const trainedMin = trained.reduce((sum, row) => sum + (row.minutes || 0), 0);
  // Accounts saved before days were tracked: sleep and a manual move box cannot be dated, so keep them once.
  const undated = s.day === undefined;
  return {
    ...s,
    day: today,
    waterMl,
    // Strain and reading are daily too: rebuilt from today's sessions, same formula as a logged workout.
    strain: undated ? s.strain : Number(Math.min(21, trainedMin / 20).toFixed(1)),
    readingMin: undated ? s.readingMin : 0,
    sleepMin: undated ? s.sleepMin : 0,
    sleepSource: undated ? (s.sleepSource ?? (s.sleepMin > 0 ? "user" : null)) : null,
    checkins: {
      sleep: undated ? s.checkins.sleep : false,
      fuel: protein >= goals.protein,
      water: waterMl >= goals.waterMl,
      move: moved || (undated && s.checkins.move),
    },
  };
}

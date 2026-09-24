import type { ChatMessage, CoachMessage, DayPoint, MealLog, WorkoutLog } from "./types";
import type { WaterSip } from "./water-log";

export const DEVICE_HISTORY_DAYS = 30;
const DAY_MS = 86_400_000;

export type HistorySlice = {
  meals: MealLog[];
  waterLog: WaterSip[];
  workoutLogs: WorkoutLog[];
  messages: Record<string, ChatMessage[]>;
  coachMessages: CoachMessage[];
  history: DayPoint[];
};

export function historyCutoff(now = Date.now()) {
  return now - DEVICE_HISTORY_DAYS * DAY_MS;
}

function stamp(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function dayStamp(date: string) {
  return stamp(`${date}T12:00:00`);
}

function keepByTime<T extends { at: string }>(rows: T[], cutoff: number) {
  const kept: T[] = [];
  const older: T[] = [];
  for (const row of rows) {
    const t = stamp(row.at);
    if (t != null && t < cutoff) older.push(row);
    else kept.push(row);
  }
  return { kept, older };
}

export function splitDeviceHistory(slice: HistorySlice, now = Date.now()): { kept: HistorySlice; older: HistorySlice } {
  const cutoff = historyCutoff(now);
  const meals = keepByTime(slice.meals, cutoff);
  const waterLog = keepByTime(slice.waterLog, cutoff);
  const workoutLogs = keepByTime(slice.workoutLogs, cutoff);
  const coachMessages = keepByTime(slice.coachMessages, cutoff);
  const messages: Record<string, ChatMessage[]> = {};
  const olderMessages: Record<string, ChatMessage[]> = {};
  for (const [thread, rows] of Object.entries(slice.messages)) {
    const split = keepByTime(rows, cutoff);
    if (split.kept.length) messages[thread] = split.kept;
    if (split.older.length) olderMessages[thread] = split.older;
  }
  const history: DayPoint[] = [];
  const olderHistory: DayPoint[] = [];
  for (const day of slice.history) {
    const t = dayStamp(day.date);
    if (t != null && t < cutoff) olderHistory.push(day);
    else history.push(day);
  }
  return {
    kept: { meals: meals.kept, waterLog: waterLog.kept, workoutLogs: workoutLogs.kept, messages, coachMessages: coachMessages.kept, history },
    older: {
      meals: meals.older,
      waterLog: waterLog.older,
      workoutLogs: workoutLogs.older,
      messages: olderMessages,
      coachMessages: coachMessages.older,
      history: olderHistory,
    },
  };
}

export function archiveHasRows(slice: HistorySlice) {
  return (
    slice.meals.length > 0 ||
    slice.waterLog.length > 0 ||
    slice.workoutLogs.length > 0 ||
    slice.coachMessages.length > 0 ||
    slice.history.length > 0 ||
    Object.values(slice.messages).some((rows) => rows.length > 0)
  );
}

export function withoutPhotos(slice: HistorySlice): HistorySlice {
  return {
    ...slice,
    meals: slice.meals.map((meal) => {
      const copy = { ...meal };
      delete copy.photo;
      return copy;
    }),
  };
}

export function dropArchived<T extends HistorySlice>(state: T, archived: HistorySlice): T {
  const mealIds = new Set(archived.meals.map((row) => row.id));
  const waterIds = new Set(archived.waterLog.map((row) => row.id));
  const workoutIds = new Set(archived.workoutLogs.map((row) => row.id));
  const coachIds = new Set(archived.coachMessages.map((row) => row.id));
  const dayIds = new Set(archived.history.map((row) => row.date));
  const messages: Record<string, ChatMessage[]> = {};
  for (const [thread, rows] of Object.entries(state.messages)) {
    const gone = new Set((archived.messages[thread] ?? []).map((row) => row.id));
    const kept = rows.filter((row) => !gone.has(row.id));
    if (kept.length) messages[thread] = kept;
  }
  return {
    ...state,
    meals: state.meals.filter((row) => !mealIds.has(row.id)),
    waterLog: state.waterLog.filter((row) => !waterIds.has(row.id)),
    workoutLogs: state.workoutLogs.filter((row) => !workoutIds.has(row.id)),
    coachMessages: state.coachMessages.filter((row) => !coachIds.has(row.id)),
    history: state.history.filter((row) => !dayIds.has(row.date)),
    messages,
  };
}

export function isHistorySlice(value: unknown): value is HistorySlice {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HistorySlice>;
  return Array.isArray(row.meals) && Array.isArray(row.waterLog) && Array.isArray(row.workoutLogs) && Array.isArray(row.history);
}

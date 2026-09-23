import { pactDateKey } from "../../packages/core/src/streak";

export type UndoEntry =
  | { kind: "water"; id: string; ml: number; createdAt: string }
  | { kind: "food"; id: string; name: string; createdAt: string };

export function latestUndo(entries: UndoEntry[]): UndoEntry | null {
  return [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).at(-1) ?? null;
}

export function withoutEntry(entries: UndoEntry[], id: string) {
  return entries.filter((entry) => entry.id !== id);
}

export function undoLabel(entry: UndoEntry | null) {
  if (!entry) return null;
  if (entry.kind === "water") return `Undo +${entry.ml} ml`;
  return `Undo ${entry.name}`;
}

export function removedLabel(entry: UndoEntry) {
  if (entry.kind === "water") return `+${entry.ml} ml`;
  return entry.name;
}

export function entriesToday(
  input: {
    waterLog?: Array<{ id: string; ml: number; at: string }>;
    meals: Array<{ id: string; name: string; at: string }>;
  },
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): UndoEntry[] {
  const today = pactDateKey(now, timeZone);
  const water = (input.waterLog ?? []).map((sip) => ({
    kind: "water" as const,
    id: sip.id,
    ml: sip.ml,
    createdAt: sip.at,
  }));
  const food = input.meals.map((meal) => ({
    kind: "food" as const,
    id: meal.id,
    name: meal.name,
    createdAt: meal.at,
  }));
  return [...water, ...food].filter((entry) => {
    const at = new Date(entry.createdAt);
    return !Number.isNaN(at.getTime()) && pactDateKey(at, timeZone) === today;
  });
}

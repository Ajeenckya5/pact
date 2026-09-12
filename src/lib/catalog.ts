import { LIFT_VIDEOS } from "./lifts";
import { inGroup, targetsOf, workoutKind, type MuscleGroup } from "./muscles";
import { PROGRAMS, SPLIT_VIDEOS } from "./splits";
import { SESSION_VIDEOS } from "./sessions";
import type { ProgramDay, Workout, WorkoutKind, WorkoutPattern } from "./types";

export const LIBRARY: Workout[] = [...PROGRAMS, ...SPLIT_VIDEOS, ...LIFT_VIDEOS, ...SESSION_VIDEOS];

export function findWorkout(id: string | undefined): Workout | undefined {
  if (!id) return undefined;
  return LIBRARY.find((w) => w.id === id);
}

export const LIB_KINDS = ["All", "Programs", "Splits", "Lifts", "Sessions"] as const;
export type LibKind = (typeof LIB_KINDS)[number];

export const LIB_LEVELS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
export type LibLevel = (typeof LIB_LEVELS)[number];

export const LIB_DURATIONS = ["All", "≤10 min", "11–20", "21–40", "40+"] as const;
export type LibDuration = (typeof LIB_DURATIONS)[number];

export function kindOfChip(kind: ReturnType<typeof workoutKind>): LibKind {
  if (kind === "program") return "Programs";
  if (kind === "split") return "Splits";
  if (kind === "lift") return "Lifts";
  return "Sessions";
}

export function matchesKind(w: Workout, kind: LibKind) {
  if (kind === "All") return true;
  return kindOfChip(workoutKind(w)) === kind;
}

export function matchesDuration(minutes: number, bucket: LibDuration) {
  if (bucket === "All") return true;
  if (bucket === "≤10 min") return minutes <= 10;
  if (bucket === "11–20") return minutes >= 11 && minutes <= 20;
  if (bucket === "21–40") return minutes >= 21 && minutes <= 40;
  return minutes > 40;
}

export function equipmentList(workouts: Workout[] = LIBRARY) {
  const set = new Set<string>();
  for (const w of workouts) for (const e of w.equipment) if (e) set.add(e);
  return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
}

export function categoryList(workouts: Workout[] = LIBRARY) {
  return ["All", ...Array.from(new Set(workouts.map((w) => w.category))).sort((a, b) => a.localeCompare(b))];
}

export function patternList(workouts: Workout[] = LIBRARY): Array<"All" | WorkoutPattern> {
  const set = new Set<WorkoutPattern>();
  for (const w of workouts) if (w.pattern) set.add(w.pattern);
  return ["All", ...Array.from(set)];
}

export function searchHaystack(w: Workout) {
  return [
    w.title,
    w.trainer,
    w.cue,
    w.category,
    w.level,
    ...(w.moves ?? []),
    ...w.muscles,
    ...w.equipment,
    w.pattern ?? "",
    w.prescription ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterLibrary(
  workouts: Workout[],
  opts: {
    kind: LibKind;
    muscle: "All" | MuscleGroup;
    category: string;
    equipment: string;
    level: LibLevel;
    duration: LibDuration;
    pattern: "All" | WorkoutPattern;
    q: string;
  },
) {
  const needle = opts.q.trim().toLowerCase();
  return workouts.filter((w) => {
    if (!matchesKind(w, opts.kind)) return false;
    if (opts.category !== "All" && w.category !== opts.category) return false;
    if (opts.equipment !== "All" && !w.equipment.includes(opts.equipment)) return false;
    if (opts.level !== "All" && w.level !== opts.level) return false;
    if (!matchesDuration(w.minutes, opts.duration)) return false;
    if (opts.pattern !== "All" && w.pattern !== opts.pattern) return false;
    if (opts.muscle !== "All") {
      const { primary } = targetsOf(w);
      if (!inGroup(primary, opts.muscle)) return false;
    }
    if (needle && !searchHaystack(w).includes(needle)) return false;
    return true;
  });
}

export function countsByKind(workouts: Workout[]) {
  const counts: Record<LibKind, number> = {
    All: workouts.length,
    Programs: 0,
    Splits: 0,
    Lifts: 0,
    Sessions: 0,
  };
  for (const w of workouts) counts[kindOfChip(workoutKind(w))] += 1;
  return counts;
}

export function relatedWorkouts(workout: Workout, limit = 8) {
  const { primary } = targetsOf(workout);
  const kind = workoutKind(workout);
  const scored = LIBRARY.filter((w) => w.id !== workout.id)
    .map((w) => {
      let score = 0;
      if (workout.alternatives?.includes(w.id)) score += 8;
      if (kind === "program" && workoutKind(w) === "split") score += 2;
      if (kind === "split" && workoutKind(w) === "lift") score += 2;
      if (w.primary?.some((p) => primary.includes(p))) score += 3;
      if (w.pattern && w.pattern === workout.pattern) score += 2;
      if (w.category === workout.category) score += 1;
      return { w, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.w);
}

export function programWorkouts(workout: Workout) {
  return (workout.days ?? [])
    .map((d) => ({ ...d, workout: findWorkout(d.workoutId) }))
    .filter((d): d is ProgramDay & { workout: Workout } => Boolean(d.workout));
}

export type { WorkoutKind };

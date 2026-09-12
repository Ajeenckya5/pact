export type MuscleId =
  | "chest"
  | "front-delt"
  | "biceps"
  | "brachialis"
  | "triceps"
  | "abs"
  | "obliques"
  | "serratus"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "soleus"
  | "lats"
  | "traps";

export type MuscleGroup = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Glutes" | "Core";

export const MUSCLE_GROUPS: MuscleGroup[] = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Glutes", "Core"];

export const MUSCLE_META: Record<
  MuscleId,
  { label: string; wger: number; front: boolean; group: MuscleGroup }
> = {
  chest: { label: "Chest", wger: 4, front: true, group: "Chest" },
  "front-delt": { label: "Front delts", wger: 2, front: true, group: "Shoulders" },
  biceps: { label: "Biceps", wger: 1, front: true, group: "Arms" },
  brachialis: { label: "Brachialis", wger: 13, front: true, group: "Arms" },
  triceps: { label: "Triceps", wger: 5, front: false, group: "Arms" },
  abs: { label: "Abs", wger: 6, front: true, group: "Core" },
  obliques: { label: "Obliques", wger: 14, front: true, group: "Core" },
  serratus: { label: "Serratus", wger: 3, front: true, group: "Chest" },
  quads: { label: "Quads", wger: 10, front: true, group: "Legs" },
  hamstrings: { label: "Hamstrings", wger: 11, front: false, group: "Legs" },
  glutes: { label: "Glutes", wger: 8, front: false, group: "Glutes" },
  calves: { label: "Calves", wger: 7, front: false, group: "Legs" },
  soleus: { label: "Soleus", wger: 15, front: false, group: "Legs" },
  lats: { label: "Lats", wger: 12, front: false, group: "Back" },
  traps: { label: "Traps / upper back", wger: 9, front: false, group: "Back" },
};

export const WGER_BODY = {
  front: "https://wger.de/static/images/muscles/muscular_system_front.svg",
  back: "https://wger.de/static/images/muscles/muscular_system_back.svg",
};

export function overlayUrl(wgerId: number, role: "main" | "secondary") {
  return `https://wger.de/static/images/muscles/${role}/muscle-${wgerId}.svg`;
}

export function labelsFor(primary: MuscleId[] = [], secondary: MuscleId[] = []) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...primary, ...secondary]) {
    const label = MUSCLE_META[id]?.label;
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function idsFromLabels(labels: string[]): MuscleId[] {
  const map: Record<string, MuscleId> = {};
  for (const [id, meta] of Object.entries(MUSCLE_META) as Array<[MuscleId, (typeof MUSCLE_META)[MuscleId]]>) {
    map[meta.label.toLowerCase()] = id;
    map[meta.group.toLowerCase()] = id;
  }
  map.shoulders = "front-delt";
  map.delts = "front-delt";
  map["rear delts"] = "traps";
  map.back = "lats";
  map.core = "abs";
  map.legs = "quads";
  map["full body"] = "quads";
  return labels
    .map((l) => map[l.toLowerCase()])
    .filter((id): id is MuscleId => Boolean(id));
}

export function sidesFor(ids: MuscleId[]) {
  return {
    front: ids.some((id) => MUSCLE_META[id]?.front),
    back: ids.some((id) => MUSCLE_META[id] && !MUSCLE_META[id].front),
  };
}

export function inGroup(ids: MuscleId[], group: MuscleGroup) {
  return ids.some((id) => MUSCLE_META[id]?.group === group);
}

export function targetsOf(w: { primary?: MuscleId[]; secondary?: MuscleId[]; muscles: string[] }) {
  const primary = w.primary?.length ? w.primary : idsFromLabels(w.muscles);
  const secondary = w.secondary ?? [];
  return { primary, secondary };
}

export function muscleFromWger(id: number): MuscleId | undefined {
  for (const [muscleId, meta] of Object.entries(MUSCLE_META) as Array<[MuscleId, (typeof MUSCLE_META)[MuscleId]]>) {
    if (meta.wger === id) return muscleId;
  }
  return undefined;
}

export function workoutKind(w: { kind?: "session" | "lift" | "split" | "program" }) {
  return w.kind ?? "session";
}

export const PATTERN_LABEL: Record<
  import("./types").WorkoutPattern,
  string
> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  "horizontal-push": "Horizontal push",
  "vertical-push": "Vertical push",
  "horizontal-pull": "Horizontal pull",
  "vertical-pull": "Vertical pull",
  isolation: "Isolation",
  carry: "Carry",
  core: "Core",
  olympic: "Olympic",
  plyo: "Plyometric",
  condition: "Conditioning",
};

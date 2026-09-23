import { findWorkout, LIBRARY } from "./catalog";
import { extraWaterForHeat } from "./experience";
import type { LiveWeather } from "./free-apis";
import type { Goal, Workout, WorkoutLog, WorkoutPattern } from "./types";
import { COMMON_WORKOUTS, type CommonWorkout, todayLogs } from "./training";
import { dedupeLines } from "./water-log";

export type TrainingSlot = "legs" | "push" | "pull" | "cardio" | "recover" | "mixed";
export type Intensity = "protect" | "easy" | "train" | "push";

export type TodayPick = {
  id: string;
  title: string;
  href: string;
  minutes: number;
  kcal: number;
  category: string;
  kind: "library" | "common";
  cue?: string;
  prescription?: string;
  rest?: string;
  outdoor: boolean;
};

export type TodaySuggestion = {
  intensity: Intensity;
  indoor: boolean;
  alreadyTrained: boolean;
  needed: TrainingSlot;
  headline: string;
  pick: TodayPick;
  alts: TodayPick[];
  reasons: string[];
};

type Candidate = {
  id: string;
  slots: TrainingSlot[];
  intensities: Intensity[];
  outdoor: boolean;
  heatBad: boolean;
  filmKind: "session" | "lift" | "common";
  isolation: boolean;
  minutes: number;
};

const INTENSITY_HEADLINE: Record<Intensity, string> = {
  protect: "Protect the system — keep today tiny.",
  easy: "Easy work. Move, don't prove anything.",
  train: "This is today's session.",
  push: "Scores are green — quality work, not junk volume.",
};

export const SLOT_LABEL: Record<TrainingSlot, string> = {
  legs: "legs",
  push: "push / upper",
  pull: "pull / back",
  cardio: "engine work",
  recover: "mobility",
  mixed: "full-body",
};

const ORDER: Intensity[] = ["protect", "easy", "train", "push"];

function daysAgo(iso: string) {
  const a = new Date(iso);
  a.setHours(0, 0, 0, 0);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function recentLogs(logs: WorkoutLog[], days = 7) {
  return logs
    .filter((l) => daysAgo(l.at) <= days && daysAgo(l.at) >= 0)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function hayOf(id: string, title: string, category: string, extra = "") {
  return `${id} ${title} ${category} ${extra}`.toLowerCase();
}

function slotsFromHay(hay: string, pattern?: WorkoutPattern): TrainingSlot[] {
  if (pattern === "squat" || pattern === "hinge" || pattern === "lunge") return ["legs"];
  if (pattern === "horizontal-push" || pattern === "vertical-push") return ["push"];
  if (pattern === "horizontal-pull" || pattern === "vertical-pull") return ["pull"];
  if (pattern === "core") return ["recover"];
  if (pattern === "olympic") return ["mixed"];
  if (/yoga|mobility|stretch|pilates|foam|yin|barre/.test(hay)) return ["recover"];
  if (/deadlift|rdl|squat|lunge|glute|leg(?!end)/.test(hay)) return ["legs"];
  if (/bench|ohp|push-up|pushup|chest|shoulder|tricep/.test(hay)) return ["push"];
  if (/row|pull-?up|chin|lat|back/.test(hay) && !/erg|rowing|machine row/.test(hay)) return ["pull"];
  if (/run|5k|walk|ruck|cycle|bike|cardio|hiit|swim|stair|zone|row|jump.?rope|airbike/.test(hay)) return ["cardio"];
  if (/strength|full-?body|ppl/.test(hay)) return ["mixed"];
  if (pattern === "condition" || pattern === "plyo" || pattern === "carry") return ["cardio"];
  if (pattern === "isolation") {
    if (/glute|quad|ham|calf/.test(hay)) return ["legs"];
    if (/chest|delt|tricep|shoulder/.test(hay)) return ["push"];
    if (/lat|bicep|rear/.test(hay)) return ["pull"];
    return ["mixed"];
  }
  return ["mixed"];
}

function intensitiesFrom(hay: string, minutes: number, level?: Workout["level"]): Intensity[] {
  if (/yoga|mobility|stretch|foam|yin|barre/.test(hay)) return ["protect", "easy"];
  if (/hiit|sprint|hyrox|jump.?rope/.test(hay)) return minutes <= 15 ? ["train", "push"] : ["push"];
  if (level === "Beginner") return minutes <= 25 ? ["easy", "train"] : ["easy", "train"];
  if (level === "Advanced") return minutes >= 25 ? ["train", "push"] : ["train", "push"];
  if (minutes <= 12) return ["protect", "easy", "train"];
  if (minutes <= 25) return ["easy", "train"];
  if (minutes >= 40) return ["train", "push"];
  return ["easy", "train", "push"];
}

function outdoorFrom(hay: string) {
  return /5k|ruck|outdoor|hike|trail/.test(hay) && !/treadmill|indoor/.test(hay);
}

function heatBadFrom(hay: string) {
  return /hiit|5k|ruck|sprint|hyrox|run/.test(hay);
}

function candidateFromWorkout(w: Workout): Candidate | null {
  if (w.kind === "split" || w.kind === "program") return null;
  const hay = hayOf(w.id, w.title, w.category, [...w.muscles, w.pattern ?? "", w.kind ?? ""].join(" "));
  return {
    id: w.id,
    slots: slotsFromHay(hay, w.pattern),
    intensities: intensitiesFrom(hay, w.minutes, w.level),
    outdoor: outdoorFrom(hay),
    heatBad: heatBadFrom(hay),
    filmKind: w.kind === "lift" ? "lift" : "session",
    isolation: w.pattern === "isolation",
    minutes: w.minutes,
  };
}

function candidateFromCommon(w: CommonWorkout): Candidate {
  const hay = hayOf(w.id, w.title, w.category, w.muscles.join(" "));
  return {
    id: w.id,
    slots: slotsFromHay(hay),
    intensities: intensitiesFrom(hay, w.minutes),
    outdoor: outdoorFrom(hay) || w.id === "c-walk" || w.id === "c-ruck" || w.id === "c-5k",
    heatBad: heatBadFrom(hay),
    filmKind: "common",
    isolation: false,
    minutes: w.minutes,
  };
}

const CATALOG: Candidate[] = [
  ...COMMON_WORKOUTS.map(candidateFromCommon),
  ...LIBRARY.map(candidateFromWorkout).filter((c): c is Candidate => !!c),
];

export function slotOf(log: Pick<WorkoutLog, "workoutId" | "title" | "category">): TrainingSlot {
  const id = log.workoutId ?? "";
  const hit = CATALOG.find((c) => c.id === id);
  if (hit) return hit.slots[0] ?? "mixed";
  const w = findWorkout(id);
  if (w) return slotsFromHay(hayOf(w.id, w.title, w.category, w.muscles.join(" ")), w.pattern)[0] ?? "mixed";
  return slotsFromHay(hayOf(id, log.title, log.category))[0] ?? "mixed";
}

function covers(log: WorkoutLog, slot: TrainingSlot) {
  const s = slotOf(log);
  if (s === slot) return true;
  if (s === "mixed" && (slot === "legs" || slot === "push" || slot === "pull")) return true;
  if (s === "cardio" && slot === "legs") return true;
  return false;
}

function daysSince(logs: WorkoutLog[], slot: TrainingSlot) {
  const hit = logs.find((l) => covers(l, slot));
  return hit ? daysAgo(hit.at) : 99;
}

function soften(band: Intensity): Intensity {
  if (band === "push") return "train";
  if (band === "train") return "easy";
  if (band === "easy") return "protect";
  return "protect";
}

export function intensityOf(input: {
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin?: number;
  hrv?: number;
  hr?: number | null;
  rhr?: number;
  measured?: boolean;
}): Intensity {
  if (input.measured === false) return "train";
  const { recovery, strain, sleepScore, sleepMin, hrv, hr, rhr } = input;
  let band: Intensity;
  if (recovery < 34 || sleepScore < 58 || strain >= 18) band = "protect";
  else if (recovery < 50 || sleepScore < 68 || strain >= 15) band = "easy";
  else if (recovery >= 85 && sleepScore >= 80 && strain < 12) band = "push";
  else band = "train";
  if (sleepMin != null && sleepMin < 360 && band === "push") band = "train";
  if (sleepMin != null && sleepMin < 330 && (band === "train" || band === "push")) band = "easy";
  if (hrv != null && hrv < 40) band = soften(band);
  if (hr != null && rhr != null && hr >= rhr + 32) band = soften(band);
  return band;
}

export function weatherGate(weather: LiveWeather | null) {
  if (!weather) {
    return { skipOutdoor: false, indoorBias: false, reasons: [] as string[] };
  }
  const reasons: string[] = [];
  let skipOutdoor = false;
  if (weather.aqi != null && weather.aqi >= 150) {
    skipOutdoor = true;
    reasons.push(`AQI ${weather.aqi} — keep it indoors.`);
  }
  if (weather.code >= 95) {
    skipOutdoor = true;
    reasons.push("Storm risk. Lift inside.");
  } else if (weather.code >= 71) {
    skipOutdoor = true;
    reasons.push("Snow or ice — skip the outdoor session.");
  }
  if (weather.tempC >= 32) {
    skipOutdoor = true;
    reasons.push(`${weather.tempC}°C — too hot for a hard outdoor session.`);
  } else if (weather.tempC >= 29) {
    reasons.push(`Heat (${weather.tempC}°C). Extra water, no outdoor HIIT or 5K.`);
  } else if (weather.tempC <= -5) {
    skipOutdoor = true;
    reasons.push(`${weather.tempC}°C — stay inside.`);
  }
  const extra = extraWaterForHeat(weather.tempC);
  if (extra > 0 && !reasons.some((r) => r.includes("Heat") || r.includes("hot"))) {
    reasons.push(`Heat bonus: +${extra} ml water on the Water desk.`);
  }
  return { skipOutdoor, indoorBias: skipOutdoor || weather.tempC >= 29, reasons };
}

function neededSlot(logs: WorkoutLog[], intensity: Intensity, trainedToday: boolean): TrainingSlot {
  if (trainedToday || intensity === "protect") return "recover";
  const recent = recentLogs(logs, 6);
  const last = recent[0];
  if (!last) return intensity === "easy" ? "cardio" : "mixed";

  const lastSlot = slotOf(last);
  const sinceLegs = daysSince(recent, "legs");
  const sincePush = daysSince(recent, "push");
  const sincePull = daysSince(recent, "pull");
  const cardioN = recent.filter((l) => slotOf(l) === "cardio").length;

  if (intensity !== "easy" && sinceLegs >= 4) return "legs";
  if (cardioN >= 2 && intensity !== "easy") {
    return sincePush <= sincePull ? "pull" : "push";
  }
  if (lastSlot === "push") return "pull";
  if (lastSlot === "pull") return sinceLegs >= 2 ? "legs" : "cardio";
  if (lastSlot === "legs" || lastSlot === "cardio" || lastSlot === "mixed") {
    return sincePush <= sincePull ? "pull" : "push";
  }
  if (lastSlot === "recover") {
    if (intensity === "easy") return "cardio";
    return sinceLegs >= 3 ? "legs" : "push";
  }
  return "mixed";
}

function resolvePick(id: string, outdoor: boolean): TodayPick | null {
  const common = COMMON_WORKOUTS.find((w) => w.id === id);
  if (common) {
    return {
      id,
      title: common.title,
      href: "/workouts?tab=Common",
      minutes: common.minutes,
      kcal: common.kcal,
      category: common.category,
      kind: "common",
      cue: common.cue,
      outdoor,
    };
  }
  const w = findWorkout(id);
  if (!w) return null;
  return {
    id,
    title: w.title,
    href: `/workouts/${id}`,
    minutes: w.minutes,
    kcal: w.kcal,
    category: w.category,
    kind: "library",
    cue: w.cue,
    prescription: w.prescription,
    rest: w.rest,
    outdoor,
  };
}

function intensityDistance(have: Intensity[], want: Intensity) {
  const wi = ORDER.indexOf(want);
  return Math.min(...have.map((h) => Math.abs(ORDER.indexOf(h) - wi)));
}

export type SuggestTodayInput = {
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin?: number;
  hrv?: number;
  hr?: number | null;
  rhr?: number;
  cadence?: number | null;
  power?: number | null;
  protein?: number;
  proteinGoal?: number;
  waterMl?: number;
  waterGoal?: number;
  goal: Pick<Goal, "id" | "name">;
  logs: WorkoutLog[];
  favoriteWorkouts: string[];
  weather: LiveWeather | null;
  trainedToday?: boolean;
  liveNote?: string;
  measured?: boolean;
};

export function doseFor(
  intensity: Intensity,
  pick: Pick<TodayPick, "prescription" | "minutes" | "cue" | "rest">,
) {
  const rest = pick.rest ? ` Rest ${pick.rest}.` : "";
  if (intensity === "protect") {
    return `Cap it at ${Math.min(15, pick.minutes)} min. Technique only — no grinding sets.`;
  }
  if (intensity === "easy") {
    return pick.prescription
      ? `Cut ${pick.prescription} to about two sets, three reps in the tank.${rest}`
      : `Two easy rounds, about ${Math.min(25, pick.minutes)} min.${rest}`;
  }
  if (intensity === "push") {
    return pick.prescription
      ? `Top of ${pick.prescription} if the bar is honest.${rest}`
      : `${pick.minutes} min, quality over junk volume.${rest}`;
  }
  return pick.prescription ?? pick.cue ?? `${pick.minutes} min as written.${rest}`;
}

export function suggestToday(input: SuggestTodayInput): TodaySuggestion {
  const trainedToday = input.trainedToday ?? todayLogs(input.logs).length > 0;
  const bodyBand = intensityOf(input);
  const intensity =
    input.measured === false
      ? "train"
      : trainedToday
        ? input.recovery < 50 || input.strain >= 15
          ? "protect"
          : "easy"
        : bodyBand;
  const wx = weatherGate(input.weather);
  const needed = neededSlot(input.logs, intensity, trainedToday);
  const recent = recentLogs(input.logs, 6);
  const last = recent[0];
  const reasons: string[] = [];

  if (input.measured === false) {
    reasons.push("No wearable scores yet. Today's pick uses your training log and weather.");
  } else {
    reasons.push(
      `Recovery ${input.recovery}, strain ${input.strain.toFixed(1)}, sleep ${input.sleepScore}${input.sleepMin != null ? ` (${Math.round(input.sleepMin / 60)}h ${input.sleepMin % 60}m)` : ""}${input.hrv != null ? `, HRV ${input.hrv}` : ""} → ${intensity}.`,
    );
  }
  if (input.hr != null) {
    reasons.push(
      input.cadence != null || input.power != null
        ? `Bluetooth is live (${input.hr} bpm${input.cadence != null ? ` · ${input.cadence} rpm` : ""}${input.power != null ? ` · ${input.power} W` : ""}). Bias the work you are already doing.`
        : `Live HR ${input.hr} bpm${input.rhr != null ? ` (rhr ${input.rhr})` : ""}.`,
    );
  }
  if (input.liveNote) reasons.push(input.liveNote);
  if (last && daysAgo(last.at) <= 3) {
    const when = daysAgo(last.at) === 0 ? "today" : daysAgo(last.at) === 1 ? "yesterday" : `${daysAgo(last.at)} days ago`;
    reasons.push(`${last.title} ${when} — rotate to ${SLOT_LABEL[needed]}.`);
  } else {
    reasons.push(`Last week is thin. Start with ${SLOT_LABEL[needed]}.`);
  }
  if (input.proteinGoal != null && input.protein != null) {
    const left = Math.round(input.proteinGoal - input.protein);
    if (left > 0) reasons.push(`Still ${left}g protein short of ${input.goal.name} — eat either side of the session.`);
  }
  if (input.waterGoal != null && input.waterMl != null && input.waterMl < input.waterGoal) {
    reasons.push(`Water ${Math.round(input.waterMl)} / ${input.waterGoal} ml.`);
  }
  reasons.push(...wx.reasons);
  reasons.push(
    input.recovery != null
      ? `${input.goal.name} biases the catalog. Recovery still owns the intensity.`
      : `${input.goal.name} biases the catalog. Pair a wearable if you want intensity from live HR.`,
  );
  if (trainedToday) {
    reasons.push("You already logged a session. Anything else is optional and easy.");
  }

  const midBike = (input.cadence != null && input.cadence > 40) || (input.power != null && input.power > 40);

  const scored = CATALOG.map((item) => {
    const pick = resolvePick(item.id, item.outdoor);
    if (!pick) return null;
    let score = 0;
    const dist = intensityDistance(item.intensities, intensity);
    if (dist === 0) score += 40;
    else if (dist === 1) score += 8;
    else score -= 80;
    if (item.slots.includes(needed)) score += 36;
    else if (needed !== "recover" && item.slots.includes("mixed") && (needed === "push" || needed === "pull" || needed === "legs"))
      score += 8;
    if (input.favoriteWorkouts.includes(item.id) && item.slots.includes(needed)) score += 18;
    else if (input.favoriteWorkouts.includes(item.id)) score += 4;
    if (item.outdoor && wx.skipOutdoor) score -= 120;
    if (item.heatBad && input.weather && input.weather.tempC >= 29) score -= 50;
    if (last && (last.workoutId === item.id || last.title.toLowerCase() === pick.title.toLowerCase())) score -= 70;
    if (recent.some((l) => l.workoutId === item.id && daysAgo(l.at) <= 2)) score -= 28;
    if (input.goal.id === "endurance" && item.slots.includes("cardio")) score += 10;
    if (input.goal.id === "longevity" && (item.slots.includes("recover") || item.id === "c-walk" || item.id === "session-zone2"))
      score += 10;
    if (input.goal.id === "bulk" && item.filmKind === "lift" && item.slots.includes(needed) && intensity !== "protect")
      score += 10;
    if (input.goal.id === "bulk" && item.slots.includes("recover") && intensity !== "protect" && intensity !== "easy")
      score -= 12;
    if (input.goal.id === "cut" && item.heatBad && intensity !== "push") score -= 10;
    if (trainedToday && item.slots.includes("recover")) score += 24;
    if (!trainedToday && needed !== "recover" && item.slots.every((s) => s === "recover")) score -= 20;
    if (intensity === "protect" && pick.minutes > 20) score -= 16;
    if (intensity === "protect" && item.slots.includes("recover") && !item.slots.includes("cardio")) score += 10;
    if (item.filmKind === "lift" && (needed === "recover" || needed === "cardio")) score -= 36;
    if (item.filmKind === "lift" && intensity === "protect") score -= 40;
    if (item.filmKind === "session" && (needed === "push" || needed === "pull" || needed === "legs") && item.slots.includes("mixed"))
      score += 6;
    if (item.isolation) score -= 14;
    if (item.filmKind === "lift" && item.slots.includes(needed) && (intensity === "train" || intensity === "push")) score += 12;
    if (midBike && /cycle|bike|airbike/.test(item.id + pick.title.toLowerCase())) score += 30;
    if (midBike && item.slots.includes("cardio")) score += 8;
    return { item, pick, score };
  })
    .filter((row): row is { item: Candidate; pick: TodayPick; score: number } => !!row)
    .sort((a, b) => b.score - a.score || a.pick.minutes - b.pick.minutes || a.pick.title.localeCompare(b.pick.title));

  const primary = scored[0] ?? {
    item: CATALOG[0],
    pick: resolvePick("session-mobility", false) ?? {
      id: "session-mobility",
      title: "Mobility",
      href: "/workouts",
      minutes: 15,
      kcal: 50,
      category: "Mobility",
      kind: "library",
      outdoor: false,
    },
    score: 0,
  };
  const alts = scored
    .filter((row) => row.pick.id !== primary.pick.id)
    .slice(0, 2)
    .map((row) => row.pick);

  const indoor = wx.indoorBias || !primary.item.outdoor;
  let headline = INTENSITY_HEADLINE[intensity];
  if (trainedToday) headline = `Already trained. If you add anything, keep it ${intensity}.`;
  else if (wx.skipOutdoor && primary.item.outdoor === false) headline = `${headline} Stay inside.`;

  return {
    intensity,
    indoor,
    alreadyTrained: trainedToday,
    needed,
    headline,
    pick: primary.pick,
    alts,
    reasons: dedupeLines(reasons).slice(0, 3),
  };
}

export function formatTodayCoach(s: TodaySuggestion) {
  const alts = s.alts.length ? s.alts.map((a) => a.title).join(" or ") : "a walk";
  const dose = doseFor(s.intensity, s.pick);
  const why = s.reasons.map((r) => `• ${r}`).join("\n");
  return `${s.headline} ${s.pick.title} (${s.pick.minutes} min, ${s.pick.category}) — ${dose}\n\n${why}\n\nIf not that: ${alts}.`;
}

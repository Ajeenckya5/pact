import { GOALS } from "./data";
import { faqLooksLikeAppHelp, searchFaq, type FaqItem } from "./faq";
import { LIFT_VIDEOS } from "./lifts";
import { MUSCLE_META } from "./muscles";
import { cachedFoods, type PantryItem } from "./pantry";

function foods() {
  return cachedFoods();
}
import { SESSION_VIDEOS } from "./sessions";
import { PROGRAMS, SPLIT_VIDEOS } from "./splits";
import { doseFor, formatTodayCoach, slotOf, SLOT_LABEL, suggestToday, type TodaySuggestion } from "./today-session";
import type { Goal, Workout, WorkoutLog } from "./types";
import type { LiveWeather } from "./free-apis";

export type CoachTopic = "lift" | "food" | "session" | "split" | "recovery" | "macros" | "habit";

export type CoachQA = {
  id: string;
  topic: CoachTopic;
  q: string;
  a: string;
};

export type CoachContext = {
  name: string;
  goal: Goal;
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepMin?: number;
  hrv?: number;
  hr?: number | null;
  rhr?: number;
  cadence?: number | null;
  power?: number | null;
  protein: number;
  kcal: number;
  waterMl: number;
  trainedToday: boolean;
  workoutLogs: WorkoutLog[];
  favoriteWorkouts: string[];
  weather: LiveWeather | null;
  liveNote?: string;
};

export type CoachTurn = {
  text: string;
  topic: CoachTopic | "meta" | "faq";
  matched?: CoachQA;
  related: CoachQA[];
  faqHits: FaqItem[];
};

const ISSUES = [
  "sore knees",
  "a cranky low back",
  "a tweaky shoulder",
  "short sleep",
  "high strain",
  "travel days",
  "heavy DOMS",
  "a cut that's dragging",
  "low HRV",
  "a time crunch",
  "a home gym only",
  "no barbell",
] as const;

const RECOVERY_BANDS = [
  { id: "red", label: "very low", min: 0, max: 33 },
  { id: "low", label: "low", min: 34, max: 49 },
  { id: "ok", label: "okay", min: 50, max: 66 },
  { id: "green", label: "green", min: 67, max: 84 },
  { id: "peak", label: "peak", min: 85, max: 100 },
] as const;

const FOOD_QS = [
  "Can I eat {food} {onGoal}?",
  "Where does {food} fit in {inGoal} day?",
  "Is {food} worth the calories {onGoal}?",
  "How much {food} should I log for protein {onGoal}?",
  "Should {food} be a staple while I {goalVerb}?",
] as const;

const LIFT_QS = [
  "How should I program {lift} {onGoal}?",
  "Is {lift} a priority {onGoal}?",
  "What rep range for {lift} if I'm {onGoal}?",
  "How often can I hit {lift} {onGoal}?",
] as const;

const LIFT_ISSUE_QS = [
  "Can I still do {lift} with {issue}?",
  "How do I modify {lift} when I have {issue}?",
] as const;

const SESSION_QS = [
  "Should I run {session} {onGoal}?",
  "Is {session} enough training for {goal} today?",
] as const;

const MUSCLE_QS = [
  "How do I train {muscle} {onGoal}?",
  "What's a smart {muscle} day while I {goalVerb}?",
] as const;

const SPLIT_QS = [
  "Does {split} work {onGoal}?",
  "How do I run {split} while I {goalVerb}?",
] as const;

function goalVerb(g: Goal) {
  if (g.id === "cut") return "cut";
  if (g.id === "bulk") return "lean bulk";
  if (g.id === "endurance") return "train endurance";
  if (g.id === "longevity") return "train for longevity";
  return "recomp";
}

function onGoal(g: Goal) {
  if (g.id === "endurance") return "for endurance";
  if (g.id === "longevity") return "for longevity";
  return `on a ${g.name.toLowerCase()}`;
}

function inGoal(g: Goal) {
  if (g.id === "endurance") return "an endurance";
  if (g.id === "longevity") return "a longevity";
  return `a ${g.name.toLowerCase()}`;
}

function liftAdvice(goal: Goal, w: Workout) {
  const rx = w.prescription ?? "3 × 8–12";
  const rest = w.rest ?? "2 min";
  if (goal.id === "cut") {
    return `Keep ${w.title} at ${rx}, rest ${rest}. Deficit already taxes recovery — no junk sets. ${w.cue}`;
  }
  if (goal.id === "bulk") {
    return `Sit at the top of ${rx} when the bar is honest. Rest ${rest}. Eat the surplus; don't turn ${w.title} into extra random volume. ${w.cue}`;
  }
  if (goal.id === "endurance") {
    return `Treat ${w.title} as strength support, ${rx}. Don't let it steal the long session. ${w.cue}`;
  }
  if (goal.id === "longevity") {
    return `Clean range, leave a rep in the tank, ${rx}. ${w.title} should make you better at life, not wrecked. ${w.cue}`;
  }
  return `Run ${w.title} as written: ${rx}, rest ${rest}. Progression is the job. ${w.cue}`;
}

function foodAdvice(food: PantryItem, goal: Goal) {
  const dense = food.kcal100 >= 350;
  const lean = food.protein100 >= 20 && food.kcal100 <= 200;
  const serving = `${food.servingLabel} (~${food.kcal100} kcal / 100g, P${Math.round(food.protein100)} C${Math.round(food.carbs100)} F${Math.round(food.fat100)})`;
  if (goal.id === "cut") {
    if (lean) return `${food.name} is a cut staple. Log ${serving} and spend the rest of the day on volume from produce.`;
    if (dense) return `${food.name} is dense. Keep it to ${food.servingLabel} on a cut and don't "eyeball" a second scoop. ${serving}.`;
    return `${food.name} can live on a cut if the grams are honest. ${serving}.`;
  }
  if (goal.id === "bulk") {
    return `${food.name} is fair game on a lean bulk. ${serving}. If protein is still short, add a leaner second item, not more oil.`;
  }
  if (goal.id === "endurance") {
    if (food.carbs100 >= 15) return `${food.name} helps fill the glycogen job. ${serving}. Time a carb-heavier log around the long session.`;
    return `${food.name} is fine around endurance work. ${serving}. Don't let fat crowd out carbs on key days.`;
  }
  if (goal.id === "longevity") {
    return `${food.name}: ${serving}. Longevity days prefer plants, fiber, and boring consistency — log it, don't chase novelty.`;
  }
  return `${food.name} fits a recomp if the log is real. ${serving}. Hit protein first, then let carbs follow training.`;
}

function issueAdvice(w: Workout, issue: string) {
  const squat = w.pattern === "squat" || /knee|quad/i.test(w.muscles.join(" "));
  const hinge = w.pattern === "hinge" || /back|hamstring/i.test(w.muscles.join(" "));
  const press = /push|press/i.test(w.pattern ?? "") || /shoulder|chest/i.test(w.muscles.join(" "));
  if (issue.includes("knee") && squat) {
    return `With ${issue}, keep ${w.title} only if pain-free through the range you own. Goblet or a higher-box pattern beats grinding a barbell PR. Stop if it sharpens. That's not toughness; that's tissue.`;
  }
  if (issue.includes("low back") && hinge) {
    return `${w.title} plus ${issue} is a brace problem until proven otherwise. Cut load, shorten range, or swap to a supported hinge. If it radiates or numbs, you're done — see a clinician.`;
  }
  if (issue.includes("shoulder") && press) {
    return `Skip the hero press. With ${issue}, ${w.title} needs a pain-free groove or a landmine / neutral-grip swap. No extra isolation on an angry joint.`;
  }
  if (issue.includes("sleep") || issue.includes("HRV") || issue.includes("strain")) {
    return `The limiter is recovery, not the lift. Keep ${w.title} at a technique load or skip it. ${w.cue} Ego sets on fumes are how people collect injuries.`;
  }
  if (issue.includes("no barbell") || issue.includes("home gym")) {
    return `${w.title} can often be approximated with dumbbells, a goblet pattern, or a film alternative in the library. Pattern over implement.`;
  }
  return `Modify ${w.title} for ${issue}: fewer sets, slower eccentrics, and a hard stop on sharp pain. The library lists alternatives on the film page. This is coaching, not a diagnosis.`;
}

function sessionAdvice(w: Workout, goal: Goal) {
  return `${w.title} is ${w.minutes} min · ${w.level} · ~${w.kcal} kcal. ${w.cue} ${onGoal(goal).replace(/^./, (c) => c.toUpperCase())}, use it as ${goal.id === "endurance" ? "a quality session if Zone 2 is already in the bank" : goal.id === "cut" ? "honest work that doesn't need extra finishers" : "a complete bout — log it and eat" }.`;
}

function muscleAdvice(muscle: string, goal: Goal) {
  const pick = LIFT_VIDEOS.filter((w) => w.muscles.some((m) => m.toLowerCase().includes(muscle.toLowerCase().split(" ")[0] ?? ""))).slice(0, 3);
  const names = pick.map((w) => w.title).join(", ") || "a compound from the library";
  return `${muscle} ${onGoal(goal)}: pick 1–2 compounds, not seven isolations. Start with ${names}. Leave a rep in the tank if recovery isn't green.`;
}

function splitAdvice(w: Workout, goal: Goal) {
  const days = w.days?.map((d) => d.label).join(" · ");
  return `${w.title} (${w.minutes} min explainer). ${w.cue}${days ? ` Map: ${days}.` : ""} ${onGoal(goal).replace(/^./, (c) => c.toUpperCase())}, run the days you can recover from — skip bonus "pump" days if strain is already high.`;
}

export function bandFor(recovery: number) {
  return RECOVERY_BANDS.find((b) => recovery >= b.min && recovery <= b.max) ?? RECOVERY_BANDS[2];
}

function product(n: number[]) {
  return n.reduce((a, b) => a * b, 1);
}

export const COACH_CORPUS_SIZE =
  product([FOOD_QS.length, foods().length, GOALS.length]) +
  product([LIFT_QS.length, LIFT_VIDEOS.length, GOALS.length]) +
  product([LIFT_ISSUE_QS.length, LIFT_VIDEOS.length, ISSUES.length]) +
  product([SESSION_QS.length, SESSION_VIDEOS.length, GOALS.length]) +
  product([MUSCLE_QS.length, Object.keys(MUSCLE_META).length, GOALS.length]) +
  product([SPLIT_QS.length, SPLIT_VIDEOS.length + PROGRAMS.length, GOALS.length]);

const MUSCLE_LABELS = Object.values(MUSCLE_META).map((m) => m.label);
const SPLITS = [...SPLIT_VIDEOS, ...PROGRAMS];

function fill(template: string, map: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
}

function foodQa(fi: number, gi: number, qi: number): CoachQA {
  const food = foods()[fi] ?? {
    id: "food",
    name: "that food",
    group: "Prepared" as const,
    aisle: "",
    aliases: [],
    kcal100: 0,
    protein100: 0,
    carbs100: 0,
    fat100: 0,
    servingG: 100,
    servingLabel: "100g",
  };
  const goal = GOALS[gi];
  const map = { food: food.name, goal: goal.name, goalVerb: goalVerb(goal), onGoal: onGoal(goal), inGoal: inGoal(goal) };
  return {
    id: `food:${qi}:${food.id}:${goal.id}`,
    topic: "food",
    q: fill(FOOD_QS[qi], map),
    a: foodAdvice(food, goal),
  };
}

function liftQa(li: number, gi: number, qi: number): CoachQA {
  const lift = LIFT_VIDEOS[li];
  const goal = GOALS[gi];
  const map = { lift: lift.title, goal: goal.name, goalVerb: goalVerb(goal), onGoal: onGoal(goal), inGoal: inGoal(goal) };
  return {
    id: `lift:${qi}:${lift.id}:${goal.id}`,
    topic: "lift",
    q: fill(LIFT_QS[qi], map),
    a: liftAdvice(goal, lift),
  };
}

function liftIssueQa(li: number, ii: number, qi: number): CoachQA {
  const lift = LIFT_VIDEOS[li];
  const issue = ISSUES[ii];
  const map = { lift: lift.title, issue };
  return {
    id: `issue:${qi}:${lift.id}:${ii}`,
    topic: "recovery",
    q: fill(LIFT_ISSUE_QS[qi], map),
    a: issueAdvice(lift, issue),
  };
}

function sessionQa(si: number, gi: number, qi: number): CoachQA {
  const session = SESSION_VIDEOS[si];
  const goal = GOALS[gi];
  const map = { session: session.title, goal: goal.name, goalVerb: goalVerb(goal), onGoal: onGoal(goal), inGoal: inGoal(goal) };
  return {
    id: `session:${qi}:${session.id}:${goal.id}`,
    topic: "session",
    q: fill(SESSION_QS[qi], map),
    a: sessionAdvice(session, goal),
  };
}

function muscleQa(mi: number, gi: number, qi: number): CoachQA {
  const muscle = MUSCLE_LABELS[mi];
  const goal = GOALS[gi];
  const map = { muscle, goal: goal.name, goalVerb: goalVerb(goal), onGoal: onGoal(goal), inGoal: inGoal(goal) };
  return {
    id: `muscle:${qi}:${muscle}:${goal.id}`,
    topic: "lift",
    q: fill(MUSCLE_QS[qi], map),
    a: muscleAdvice(muscle, goal),
  };
}

function splitQa(si: number, gi: number, qi: number): CoachQA {
  const split = SPLITS[si];
  const goal = GOALS[gi];
  const map = { split: split.title, goal: goal.name, goalVerb: goalVerb(goal), onGoal: onGoal(goal), inGoal: inGoal(goal) };
  return {
    id: `split:${qi}:${split.id}:${goal.id}`,
    topic: "split",
    q: fill(SPLIT_QS[qi], map),
    a: splitAdvice(split, goal),
  };
}

export function searchCoachCorpus(query: string, limit = 24): CoachQA[] {
  const n = query.trim().toLowerCase();
  if (!n) return featuredQas();
  const tokens = n.split(/\s+/).filter((t) => t.length > 2);
  const out: CoachQA[] = [];
  const push = (qa: CoachQA) => {
    if (out.some((x) => x.id === qa.id)) return;
    out.push(qa);
  };

  const food = hitFood(n);
  const lift = hitLift(n);
  const session = hitSession(n);
  const split = hitSplit(n);
  const goal = hitGoal(n, GOALS[0]);
  const issue = hitIssue(n);
  const muscle = hitMuscle(n);

  if (food) {
    const fi = foods().indexOf(food);
    for (let qi = 0; qi < FOOD_QS.length && out.length < limit; qi++) push(foodQa(fi, GOALS.indexOf(goal), qi));
    for (let gi = 0; gi < GOALS.length && out.length < limit; gi++) push(foodQa(fi, gi, 0));
  }
  if (lift) {
    const li = LIFT_VIDEOS.indexOf(lift);
    for (let qi = 0; qi < LIFT_QS.length && out.length < limit; qi++) push(liftQa(li, GOALS.indexOf(goal), qi));
    if (issue) push(liftIssueQa(li, ISSUES.indexOf(issue), 0));
    else for (let ii = 0; ii < 3 && out.length < limit; ii++) push(liftIssueQa(li, ii, 0));
  }
  if (session) {
    const si = SESSION_VIDEOS.indexOf(session);
    for (let qi = 0; qi < SESSION_QS.length; qi++) push(sessionQa(si, GOALS.indexOf(goal), qi));
  }
  if (split) {
    const si = SPLITS.indexOf(split);
    push(splitQa(si, GOALS.indexOf(goal), 0));
  }
  if (muscle) {
    const mi = MUSCLE_LABELS.indexOf(muscle);
    if (mi >= 0) push(muscleQa(mi, GOALS.indexOf(goal), 0));
  }

  if (out.length >= limit) return out.slice(0, limit);

  const nameHit = (label: string) => label.toLowerCase().includes(n) || tokens.some((t) => label.toLowerCase().includes(t));
  for (let fi = 0; fi < foods().length && out.length < limit; fi++) {
    if (food && foods()[fi] === food) continue;
    if (nameHit(foods()[fi].name) || foods()[fi].aliases.some((a) => nameHit(a))) push(foodQa(fi, GOALS.indexOf(goal), 0));
  }
  if (!lift) {
    for (let li = 0; li < LIFT_VIDEOS.length && out.length < limit; li++) {
      if (nameHit(LIFT_VIDEOS[li].title)) push(liftQa(li, GOALS.indexOf(goal), 0));
    }
  }
  return out.slice(0, limit);
}

export function featuredQas(): CoachQA[] {
  return [
    liftQa(0, 0, 0),
    foodQa(foods().findIndex((p) => p.id === "chicken") || 0, 0, 0),
    foodQa(foods().findIndex((p) => p.id === "rice") || 1, 1, 1),
    liftIssueQa(0, 0, 0),
    sessionQa(0, 0, 0),
    splitQa(0, 2, 0),
    muscleQa(MUSCLE_LABELS.indexOf("Glutes") >= 0 ? MUSCLE_LABELS.indexOf("Glutes") : 0, 1, 0),
    foodQa(Math.max(0, foods().findIndex((p) => p.id === "yogurt")), 0, 3),
  ];
}

function longestHit<T extends { name: string }>(hay: string, items: T[]): T | undefined {
  let best: T | undefined;
  let n = 0;
  for (const item of items) {
    const label = item.name.toLowerCase();
    if (label.length > n && hay.includes(label)) {
      best = item;
      n = label.length;
    }
  }
  return best;
}

function hitLift(hay: string) {
  return longestHit(
    hay,
    LIFT_VIDEOS.map((w) => ({ name: w.title, w })),
  )?.w;
}

function hitFood(hay: string) {
  const aliasHits = foods().filter((p) => [p.name, ...p.aliases, p.id.replace(/-/g, " ")].some((a) => a.length > 2 && hay.includes(a.toLowerCase())));
  return aliasHits.sort((a, b) => b.name.length - a.name.length)[0];
}

function hitSession(hay: string) {
  return longestHit(
    hay,
    SESSION_VIDEOS.map((w) => ({ name: w.title, w })),
  )?.w;
}

function hitSplit(hay: string) {
  return longestHit(
    hay,
    SPLITS.map((w) => ({ name: w.title, w })),
  )?.w;
}

function hitGoal(hay: string, fallback: Goal) {
  const hit = GOALS.find((g) => hay.includes(g.name.toLowerCase()) || hay.includes(g.id) || (g.id === "bulk" && hay.includes("bulk")));
  return hit ?? fallback;
}

function hitIssue(hay: string) {
  return ISSUES.find((i) => hay.includes(i));
}

function hitMuscle(hay: string) {
  return MUSCLE_LABELS.find((m) => hay.includes(m.toLowerCase())) ?? (hay.includes("glute") ? "Glutes" : hay.includes("core") ? "Abs" : undefined);
}

function hitRecoveryBand(hay: string) {
  return RECOVERY_BANDS.find((b) => hay.includes(b.label) || hay.includes(b.id));
}

function opening(ctx: CoachContext) {
  const first = ctx.name.split(" ")[0] ?? "Athlete";
  const proteinLeft = Math.max(0, Math.round(ctx.goal.protein - ctx.protein));
  const band = bandFor(ctx.recovery);
  const bits = [
    `${first} — recovery ${ctx.recovery} (${band.label}), strain ${ctx.strain.toFixed(1)}, sleep ${ctx.sleepScore}${ctx.hr != null ? `, HR ${ctx.hr}` : ""}.`,
    proteinLeft > 0 ? `Protein still short ${proteinLeft}g on ${ctx.goal.name}.` : `${ctx.goal.name} protein is in.`,
    ctx.trainedToday ? "Training is already on the card." : "No session logged today.",
  ];
  return bits.join(" ");
}

function planFrom(ctx: CoachContext): TodaySuggestion {
  return suggestToday({
    recovery: ctx.recovery,
    strain: ctx.strain,
    sleepScore: ctx.sleepScore,
    sleepMin: ctx.sleepMin,
    hrv: ctx.hrv,
    hr: ctx.hr,
    rhr: ctx.rhr,
    cadence: ctx.cadence,
    power: ctx.power,
    protein: ctx.protein,
    proteinGoal: ctx.goal.protein,
    waterMl: ctx.waterMl,
    waterGoal: ctx.goal.waterMl,
    goal: ctx.goal,
    logs: ctx.workoutLogs,
    favoriteWorkouts: ctx.favoriteWorkouts,
    weather: ctx.weather,
    trainedToday: ctx.trainedToday,
    liveNote: ctx.liveNote,
  });
}

function todayPlan(ctx: CoachContext): CoachTurn {
  const suggestion = planFrom(ctx);
  const body = formatTodayCoach(suggestion);
  const matched: CoachQA = {
    id: "today-plan",
    topic: "habit",
    q: "What should I train today?",
    a: body,
  };
  return {
    text: `${opening(ctx)}\n\n${body}`,
    topic: "habit",
    matched,
    related: featuredQas().slice(0, 3),
    faqHits: [],
  };
}

function liveLiftCall(lift: Workout, ctx: CoachContext, issue?: string): { a: string; topic: CoachTopic } {
  const suggestion = planFrom(ctx);
  const slot = slotOf({ workoutId: lift.id, title: lift.title, category: lift.category });
  const dose = doseFor(suggestion.intensity, {
    prescription: lift.prescription,
    minutes: lift.minutes,
    cue: lift.cue,
    rest: lift.rest,
  });
  if (issue) {
    return {
      topic: "recovery",
      a: `${issueAdvice(lift, issue)}\n\nToday's numbers (${suggestion.intensity}, need ${SLOT_LABEL[suggestion.needed]}): ${suggestion.pick.title} is the session. ${
        suggestion.intensity === "protect" || suggestion.intensity === "easy"
          ? `If you still touch ${lift.title}, keep it as ${dose}`
          : dose
      }`,
    };
  }
  if (suggestion.intensity === "protect") {
    return {
      topic: "lift",
      a: `Not ${lift.title} today. Recovery ${ctx.recovery} / strain ${ctx.strain.toFixed(1)} says ${suggestion.intensity}. Do ${suggestion.pick.title} instead — ${doseFor(suggestion.intensity, suggestion.pick)}`,
    };
  }
  if (slot !== suggestion.needed && suggestion.needed !== "mixed" && slot !== "mixed") {
    return {
      topic: "lift",
      a: `${lift.title} is a ${SLOT_LABEL[slot]} pattern. Your logs want ${SLOT_LABEL[suggestion.needed]} — that's ${suggestion.pick.title}. If you only have this movement: ${dose} ${lift.cue}`,
    };
  }
  return {
    topic: "lift",
    a: `From today's data (${suggestion.intensity}): run ${lift.title}. ${dose} ${lift.cue}`,
  };
}

function liveSessionCall(session: Workout, ctx: CoachContext): string {
  const suggestion = planFrom(ctx);
  if (session.id === suggestion.pick.id) {
    return `Yes — that's the pick from your numbers. ${formatTodayCoach(suggestion)}`;
  }
  if (suggestion.intensity === "protect" && !/yoga|mobility|stretch|foam|walk/.test(session.title.toLowerCase())) {
    return `${session.title} is heavier than today. Recovery ${ctx.recovery} / strain ${ctx.strain.toFixed(1)} → ${suggestion.pick.title}. ${doseFor(suggestion.intensity, suggestion.pick)}`;
  }
  return `${session.title} can work, but the live scorer wants ${suggestion.pick.title} (${suggestion.intensity}, ${SLOT_LABEL[suggestion.needed]}). ${sessionAdvice(session, ctx.goal)}`;
}

function liveSplitCall(split: Workout, ctx: CoachContext): string {
  const suggestion = planFrom(ctx);
  return `${splitAdvice(split, ctx.goal)}\n\nThat's the weekly map. Today's session from your live scores is ${suggestion.pick.title} — ${doseFor(suggestion.intensity, suggestion.pick)}`;
}

function liveMuscleCall(muscle: string, ctx: CoachContext): string {
  const suggestion = planFrom(ctx);
  const lifts = LIFT_VIDEOS.filter((w) => w.muscles.some((m) => m.toLowerCase().includes(muscle.toLowerCase().split(" ")[0] ?? ""))).slice(0, 3);
  if (suggestion.intensity === "protect") {
    return `${muscle} can wait. Recovery ${ctx.recovery} says ${suggestion.pick.title}, not a ${muscle} pile-on.`;
  }
  const names = lifts.map((w) => w.title).join(", ") || "a compound from the library";
  return `${muscle} ${onGoal(ctx.goal)} today (${suggestion.intensity}, need ${SLOT_LABEL[suggestion.needed]}): ${names}. The scored session is still ${suggestion.pick.title}.`;
}

function liveFoodCall(food: PantryItem, ctx: CoachContext, matchedA: string) {
  const leftP = Math.max(0, Math.round(ctx.goal.protein - ctx.protein));
  const leftK = Math.round(ctx.goal.kcal - ctx.kcal);
  const gap =
    leftP > 0
      ? `Logged ${Math.round(ctx.protein)}g / ${ctx.goal.protein}g protein, ${Math.round(ctx.kcal)} / ${ctx.goal.kcal} kcal.`
      : `Protein is already at ${Math.round(ctx.protein)}g. ${leftK < 0 ? `${Math.abs(leftK)} kcal over.` : `${leftK} kcal left.`}`;
  return `${matchedA}\n\n${gap}`;
}

export function coachStarters(ctx: CoachContext) {
  const suggestion = planFrom(ctx);
  const left = Math.max(0, Math.round(ctx.goal.protein - ctx.protein));
  const chicken = foods().find((p) => p.id === "chicken");
  return [
    "What should I train today?",
    `Should I still do ${suggestion.pick.title} with recovery ${ctx.recovery}?`,
    left > 0
      ? `How much protein do I still need on a ${ctx.goal.name}?`
      : chicken
        ? `Can I eat ${chicken.name} on a ${ctx.goal.name}?`
        : `Can I eat chicken on a ${ctx.goal.name}?`,
    ctx.trainedToday
      ? `Can I add more work after ${suggestion.pick.title}?`
      : `Is ${suggestion.pick.title} enough training for ${ctx.goal.name} today?`,
  ];
}

export const COACH_STARTERS = [
  "What should I train today?",
  "Should I still train with this recovery?",
  "How much protein do I still need?",
];

export function coachReply(query: string, ctx: CoachContext): CoachTurn {
  const raw = query.trim();
  const hay = raw.toLowerCase();
  if (!raw) {
    return {
      text: `${opening(ctx)}\n\nAsk a training or food question. App how-tos live in FAQ — I coach the work.`,
      topic: "meta",
      related: featuredQas().slice(0, 4),
      faqHits: [],
    };
  }

  const faqHits = faqLooksLikeAppHelp(hay) ? searchFaq(raw).slice(0, 3) : searchFaq(raw, "Coach").slice(0, 1);
  if (faqLooksLikeAppHelp(hay) && faqHits[0]) {
    return {
      text: `${opening(ctx)}\n\nThat's an app how-to, not a training call. FAQ has it: "${faqHits[0].q}" — ${faqHits[0].a}\n\nI'm the coach: sets, food, recovery. Ask me those.`,
      topic: "faq",
      related: [],
      faqHits,
    };
  }

  if (/^(hi|hey|hello|yo|sup)\b/.test(hay) || hay.length < 8 && /coach|help/.test(hay)) {
    return {
      text: `${opening(ctx)}\n\nTalk to me like a coach: what to lift, what to eat, how to handle low recovery. Not "how do I scan a meal" — that's FAQ.`,
      topic: "meta",
      related: featuredQas().slice(0, 4),
      faqHits: [],
    };
  }

  if (
    /what should i (train|do|lift|work out)|today'?s (session|workout)|train today|should i still (train|do|lift)|add more work|enough training/.test(
      hay,
    )
  ) {
    return todayPlan(ctx);
  }

  if (/how much protein|protein left|hit protein|am i short/.test(hay)) {
    const left = Math.max(0, Math.round(ctx.goal.protein - ctx.protein));
    const chicken = foods().find((p) => p.id === "chicken");
    const a =
      left === 0
        ? `Protein is already at ${Math.round(ctx.protein)}g vs ${ctx.goal.protein}g. Don't force another shake unless hunger is real.`
        : `You still owe ~${left}g protein. ${chicken ? `${chicken.name} at ${chicken.servingLabel} is about ${Math.round(chicken.protein100 * (chicken.servingG / 100))}g.` : "Log a lean pantry item."} That's the gap, not another dessert with a whey garnish.`;
    const matched: CoachQA = { id: "protein-gap", topic: "macros", q: raw, a };
    return { text: `${opening(ctx)}\n\n${a}`, topic: "macros", matched, related: searchCoachCorpus("protein yogurt chicken", 3), faqHits: [] };
  }

  const food = hitFood(hay);
  const lift = hitLift(hay);
  const session = hitSession(hay);
  const split = hitSplit(hay);
  const goal = hitGoal(hay, ctx.goal);
  const issue = hitIssue(hay);
  const muscle = hitMuscle(hay);
  const band = hitRecoveryBand(hay);

  const related: CoachQA[] = [];
  let matched: CoachQA | undefined;
  let liveA: string | undefined;
  let liveTopic: CoachTopic | undefined;

  if (lift) {
    const call = liveLiftCall(lift, ctx, issue);
    liveA = call.a;
    liveTopic = call.topic;
    const li = LIFT_VIDEOS.indexOf(lift);
    matched = issue
      ? liftIssueQa(li, ISSUES.indexOf(issue), hay.includes("modify") ? 1 : 0)
      : liftQa(
          li,
          GOALS.indexOf(goal),
          /often|frequency/.test(hay) ? 3 : /rep/.test(hay) ? 2 : /priority/.test(hay) ? 1 : 0,
        );
  } else if (food) {
    const fi = foods().indexOf(food);
    const gi = GOALS.indexOf(goal);
    matched = foodQa(
      fi,
      gi,
      /staple/.test(hay) ? 4 : /how much|log/.test(hay) ? 3 : /worth|calories/.test(hay) ? 2 : /where/.test(hay) ? 1 : 0,
    );
    liveA = liveFoodCall(food, ctx, matched.a);
    liveTopic = "food";
  } else if (session) {
    const si = SESSION_VIDEOS.indexOf(session);
    const gi = GOALS.indexOf(goal);
    matched = sessionQa(si, gi, hay.includes("enough") ? 1 : 0);
    liveA = liveSessionCall(session, ctx);
    liveTopic = "session";
  } else if (split) {
    const si = SPLITS.indexOf(split);
    const gi = GOALS.indexOf(goal);
    matched = splitQa(si, gi, 0);
    liveA = liveSplitCall(split, ctx);
    liveTopic = "split";
  } else if (muscle) {
    const mi = MUSCLE_LABELS.indexOf(muscle);
    const gi = GOALS.indexOf(goal);
    matched = muscleQa(mi, gi, 0);
    liveA = liveMuscleCall(muscle, ctx);
    liveTopic = "lift";
  }

  if (matched) related.push(matched);
  const extra = searchCoachCorpus(raw, 6).filter((x) => x.id !== matched?.id);
  related.push(...extra);
  const uniq = related.filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).slice(0, 5);

  if (!matched && extra[0]) {
    matched = extra[0];
    if (matched.topic === "lift" || matched.topic === "session" || matched.topic === "split") {
      liveA = `${matched.a}\n\nLive pick from your numbers: ${planFrom(ctx).pick.title}.`;
    }
  }

  if (!matched) {
    const fallback =
      band || /recover|sleep|sore|tired/.test(hay)
        ? `Recovery is ${ctx.recovery}, strain ${ctx.strain.toFixed(1)}. ${formatTodayCoach(planFrom(ctx))}`
        : `I didn't lock a specific lift or food. Today's session from your numbers:\n\n${formatTodayCoach(planFrom(ctx))}`;
    return {
      text: `${opening(ctx)}\n\n${fallback}`,
      topic: "habit",
      related: uniq,
      faqHits: searchFaq(raw).slice(0, 2),
    };
  }

  return {
    text: `${opening(ctx)}\n\n${liveA ?? matched.a}`,
    topic: liveTopic ?? matched.topic,
    matched,
    related: uniq.filter((x) => x.id !== matched.id),
    faqHits: faqHits.filter((f) => f.category === "Coach").slice(0, 1),
  };
}

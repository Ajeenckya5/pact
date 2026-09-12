import type { GoalId } from "./types";
import {
  flagsFor,
  legalForDiets,
  lineMacros,
  nutriFor,
  roundNutri,
  sumNutri,
  type DietId,
  type Nutri,
} from "./nutrition";

export type GramLine = { id: string; name: string; grams: number };

export type SolveMove = { kind: "swap" | "scale" | "nudge" | "boost" | "trim"; detail: string };

export type SolveResult = {
  lines: GramLine[];
  moves: SolveMove[];
  score: number;
  macros: Nutri;
};

export type SolveWeights = {
  protein: number;
  kcal: number;
  carbs: number;
  fat: number;
  identity: number;
};

type LineKind = "protein" | "carb" | "fat" | "garnish";

const SWAP_BANK: Array<{ from: RegExp; diets: DietId[]; options: string[]; note: string }> = [
  { from: /chicken(?!.*(?:stock|broth|cube))|turkey/, diets: ["vegan", "vegetarian"], options: ["tempeh", "seitan", "extra-firm tofu", "lentils"], note: "Plant protein, ranked by density" },
  { from: /beef|steak|lamb|mince/, diets: ["vegan", "vegetarian"], options: ["tempeh", "seitan", "lentils", "extra-firm tofu"], note: "Chewy plant protein" },
  { from: /salmon|tuna|cod|haddock|fish|prawn|shrimp/, diets: ["vegan", "vegetarian"], options: ["tempeh", "extra-firm tofu", "seitan", "lentils", "chickpeas"], note: "Keep the bowl, hold the protein" },
  { from: /pork|bacon|ham/, diets: ["vegan", "vegetarian"], options: ["tempeh", "extra-firm tofu"], note: "Plant stand-in for pork" },
  { from: /milk(?!.*coconut)|whole milk/, diets: ["vegan", "dairy-free"], options: ["oat milk", "almond milk"], note: "Dairy-free liquid" },
  { from: /butter|ghee/, diets: ["vegan", "dairy-free"], options: ["olive oil"], note: "Fat without dairy" },
  { from: /cream/, diets: ["vegan", "dairy-free"], options: ["coconut milk"], note: "Richness without cream" },
  { from: /cheese|parmesan|mozzarella|cheddar|yogurt|yoghurt/, diets: ["vegan", "dairy-free"], options: ["extra-firm tofu", "tempeh"], note: "Protein without dairy" },
  { from: /\beggs?\b/, diets: ["vegan"], options: ["extra-firm tofu", "tempeh"], note: "Bind and protein" },
  { from: /pasta|spaghetti|linguine|penne|noodle|wheat|flour|bread|couscous/, diets: ["gluten-free"], options: ["rice", "quinoa", "rice noodles"], note: "Gluten-free starch" },
  { from: /soy sauce/, diets: ["gluten-free"], options: ["tamari"], note: "GF aged soy" },
  { from: /honey/, diets: ["vegan"], options: ["maple syrup"], note: "Plant sweetener" },
  { from: /almond|peanut|cashew|walnut|pecan|hazelnut|pistachio/, diets: ["nut-free"], options: ["pumpkin seeds"], note: "Crunch without nuts" },
  { from: /pork|bacon|ham|lard/, diets: ["halal", "kosher"], options: ["chicken", "turkey"], note: "Swap the pork cut" },
  { from: /shrimp|prawn|crab|lobster|oyster|mussel|clam|scallop/, diets: ["kosher"], options: ["salmon", "cod"], note: "Finned fish instead of shellfish" },
  { from: /rice|pasta|potato|bread|flour|sugar|honey|oat|noodle|couscous/, diets: ["keto"], options: ["spinach", "zucchini", "broccoli"], note: "Drop the starch" },
  { from: /pasta|spaghetti|bread|flour|oat|rice|noodle|couscous/, diets: ["paleo"], options: ["sweet potato", "cauliflower"], note: "Root starch, no grain" },
  { from: /tofu|tempeh|soy|lentil|chickpea|bean/, diets: ["paleo"], options: ["chicken", "eggs", "salmon"], note: "Paleo protein" },
  { from: /yogurt|yoghurt|milk(?!.*coconut)|cheese/, diets: ["paleo"], options: ["coconut milk"], note: "No dairy" },
];

const BOOSTERS = [
  "chicken breast",
  "turkey",
  "egg whites",
  "0% greek yogurt",
  "whey isolate",
  "tempeh",
  "extra-firm tofu",
  "seitan",
  "pea protein",
];

export function weightsFor(goal: GoalId): SolveWeights {
  switch (goal) {
    case "cut":
      return { protein: 5.2, kcal: 1.5, carbs: 0.85, fat: 0.9, identity: 0.018 };
    case "recomp":
      return { protein: 4.6, kcal: 1.35, carbs: 1, fat: 0.9, identity: 0.02 };
    case "bulk":
      return { protein: 3.8, kcal: 1.7, carbs: 1.15, fat: 0.8, identity: 0.022 };
    case "endurance":
      return { protein: 2.5, kcal: 1.35, carbs: 2.7, fat: 0.7, identity: 0.02 };
    default:
      return { protein: 3.2, kcal: 1.25, carbs: 1.1, fat: 1.15, identity: 0.024 };
  }
}

export function kindOf(name: string): LineKind {
  const n = name.toLowerCase();
  if (
    /salt|pepper|water|stock|broth|garlic|ginger|cumin|paprika|turmeric|oregano|thyme|basil|parsley|cilantro|vinegar|bay |chili flake|clove|miso|sauce|paste|ketchup|mustard/.test(
      n,
    )
  ) {
    return "garnish";
  }
  const f = flagsFor(name);
  const nut = nutriFor(name);
  if (f.protein || nut.protein >= 8) return "protein";
  if (f.fat || nut.fat >= 40) return "fat";
  if (f.carb || nut.carbs >= 10) return "carb";
  if (nut.kcal < 40) return "garnish";
  return "carb";
}

export function smartSwap(
  lines: GramLine[],
  diets: DietId[],
  target: Nutri,
): { lines: GramLine[]; notes: string[] } {
  if (!diets.length) return { lines, notes: [] };
  const notes: string[] = [];
  const next = lines.map((l) => ({ ...l }));
  for (const line of next) {
    const hit = SWAP_BANK.find((s) => s.from.test(line.name.toLowerCase()) && s.diets.some((d) => diets.includes(d)));
    if (!hit) continue;
    const plate = macrosOf(next);
    const orig = lineMacros(line.name, line.grams);
    const rest: Nutri = {
      kcal: plate.kcal - orig.kcal,
      protein: plate.protein - orig.protein,
      carbs: plate.carbs - orig.carbs,
      fat: plate.fat - orig.fat,
    };
    const choice = pickOption(line.name, line.grams, hit.options, diets, target, rest);
    if (!choice || choice.toLowerCase() === line.name.toLowerCase()) continue;
    const grams = proteinPreserveGrams(line.name, choice, line.grams, target);
    notes.push(`${line.name} → ${choice} (${hit.note})`);
    line.name = choice;
    line.grams = grams;
  }
  if (diets.includes("kosher")) {
    const hasMeat = next.some((l) => flagsFor(l.name).meat);
    if (hasMeat) {
      for (const line of next) {
        if (!flagsFor(line.name).dairy) continue;
        notes.push(`${line.name} → coconut milk (kosher: no meat with dairy)`);
        line.name = "coconut milk";
      }
    }
  }
  return { lines: next, notes };
}

export function bestSwap(name: string, diets: DietId[], target: Nutri): { to: string; note: string } | null {
  const hit = diets.length
    ? SWAP_BANK.find((s) => s.from.test(name.toLowerCase()) && s.diets.some((d) => diets.includes(d)))
    : SWAP_BANK.find((s) => s.from.test(name.toLowerCase()));
  if (!hit) return null;
  const to = pickOption(name, 150, hit.options, diets, target, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  if (!to || to.toLowerCase() === name.toLowerCase()) return null;
  return { to, note: hit.note };
}

export function pactSolve(
  lines: GramLine[],
  target: Nutri,
  diets: DietId[],
  weights: SolveWeights,
): SolveResult {
  const moves: SolveMove[] = [];
  const swapped = smartSwap(lines, diets, target);
  for (const n of swapped.notes) moves.push({ kind: "swap", detail: n });

  let work = swapped.lines.map((l) => ({ ...l, grams: Math.max(1, l.grams) }));
  work = mergeByName(work);
  const start = macrosOf(work);
  if (start.kcal > target.kcal * 1.7 && start.kcal > 0) {
    const f = target.kcal / start.kcal;
    work = work.map((l) => ({ ...l, grams: Math.max(1, l.grams * f) }));
    moves.push({ kind: "scale", detail: `Batch → 1 plate (×${f.toFixed(2)})` });
  }

  const g0 = work.map((l) => l.grams);
  work = descend(work, g0, target, weights, diets, 36);

  const after = macrosOf(work);
  if (target.protein > 0 && after.protein < target.protein * 0.94) {
    const boosted = injectBooster(work, target, diets);
    if (boosted) {
      work = boosted.lines;
      moves.push({ kind: "boost", detail: boosted.detail });
      work = descend(
        work,
        work.map((l) => l.grams),
        target,
        { ...weights, identity: weights.identity * 0.4 },
        diets,
        22,
      );
    }
  }

  work = absorbKcal(work, g0, target, diets);
  work = work.map((l) => ({ ...l, grams: cookRound(l.grams, kindOf(l.name)) }));
  const macros = roundNutri(macrosOf(work));
  const score = hitFromMacros(macros, target);
  if (Math.abs(macros.kcal - target.kcal) / Math.max(target.kcal, 1) < 0.08) {
    moves.push({ kind: "nudge", detail: `Plate locked at ${macros.kcal} kcal · ${macros.protein}g protein` });
  } else {
    moves.push({
      kind: "nudge",
      detail: `Closest feasible: ${macros.kcal} kcal · ${macros.protein}g P · ${macros.carbs}g C · ${macros.fat}g F`,
    });
  }
  return { lines: work.map((l) => ({ id: l.id, name: l.name, grams: Math.round(l.grams) })), moves, score, macros };
}

export function hitFromMacros(m: Nutri, target: Nutri): number {
  if (!target.kcal) return 0;
  const p = 1 - clamp(Math.abs(m.protein - target.protein) / Math.max(target.protein, 1), 0, 1);
  const k = 1 - clamp(Math.abs(m.kcal - target.kcal) / Math.max(target.kcal, 1), 0, 1);
  const c = 1 - clamp(Math.abs(m.carbs - target.carbs) / Math.max(target.carbs, 1), 0, 1);
  const f = 1 - clamp(Math.abs(m.fat - target.fat) / Math.max(target.fat, 1), 0, 1);
  return Math.round(100 * (0.42 * p + 0.28 * k + 0.16 * c + 0.14 * f));
}

/** Fast list rank: scale to kcal, credit a diet-legal booster, no iteration. Higher is better. */
export function rankHit(m: Nutri, target: Nutri, diets: DietId[]): number {
  if (!target.kcal || m.kcal <= 0) return 0;
  const scale = target.kcal / m.kcal;
  const scaled: Nutri = {
    kcal: target.kcal,
    protein: m.protein * scale,
    carbs: m.carbs * scale,
    fat: m.fat * scale,
  };
  const boost = bestBooster(diets);
  if (boost && scaled.protein < target.protein) {
    const need = target.protein - scaled.protein;
    const g = Math.min(180, (need / Math.max(nutriFor(boost).protein, 1)) * 100);
    const add = lineMacros(boost, g);
    scaled.protein += add.protein;
    scaled.kcal += add.kcal;
    scaled.carbs += add.carbs;
    scaled.fat += add.fat;
    const back = target.kcal / Math.max(scaled.kcal, 1);
    scaled.protein *= back;
    scaled.carbs *= back;
    scaled.fat *= back;
    scaled.kcal = target.kcal;
  }
  return hitFromMacros(scaled, target);
}

function pickOption(
  from: string,
  grams: number,
  options: string[],
  diets: DietId[],
  target: Nutri,
  rest: Nutri,
): string | null {
  const legal = options.filter((o) => legalForDiets(o, diets));
  if (!legal.length) return null;
  let best = legal[0];
  let bestScore = -Infinity;
  for (const opt of legal) {
    const g = proteinPreserveGrams(from, opt, grams, target);
    const m = lineMacros(opt, g);
    const tot: Nutri = {
      kcal: rest.kcal + m.kcal,
      protein: rest.protein + m.protein,
      carbs: rest.carbs + m.carbs,
      fat: rest.fat + m.fat,
    };
    const dens = nutriFor(opt).protein / Math.max(nutriFor(opt).kcal, 1);
    const head = Math.max(0, target.protein - tot.protein);
    const powder = /protein|whey/.test(opt) ? 8 : 0;
    const score = hitFromMacros(tot, target) + head * dens * 14 - powder;
    if (score > bestScore) {
      bestScore = score;
      best = opt;
    }
  }
  return best;
}

function proteinPreserveGrams(from: string, to: string, grams: number, target?: Nutri): number {
  const a = nutriFor(from).protein;
  const b = nutriFor(to).protein;
  if (a < 8 || b < 4) return grams;
  let g = grams * (a / b);
  if (b >= a) g = clamp(g, Math.max(20, grams * 0.18), grams * 1.08);
  else g = clamp(g, grams * 0.9, Math.min(360, grams * 2.2));
  if (target?.protein) g = Math.min(g, (target.protein * 0.92 / b) * 100);
  return Math.max(8, g);
}

function mergeByName(lines: GramLine[]): GramLine[] {
  const map = new Map<string, GramLine>();
  for (const l of lines) {
    const k = l.name.toLowerCase();
    const prev = map.get(k);
    if (prev) prev.grams += l.grams;
    else map.set(k, { ...l });
  }
  return [...map.values()];
}

function macrosOf(lines: GramLine[]): Nutri {
  return sumNutri(lines.map((l) => lineMacros(l.name, l.grams)));
}

function bounds(name: string, g0: number, diets: DietId[], target: Nutri): { lo: number; hi: number } {
  const kind = kindOf(name);
  const keto = diets.includes("keto");
  const n = name.toLowerCase();
  if (kind === "garnish") return { lo: Math.max(0.5, g0 * 0.35), hi: Math.max(g0, Math.min(36, g0 * 2)) };
  if (kind === "fat") {
    const oil = /oil|butter|ghee/.test(n);
    if (oil) {
      const cap = diets.includes("keto")
        ? Math.min(38, Math.max(16, (target.fat || 28) * 0.9))
        : Math.min(18, Math.max(8, target.kcal * 0.026));
      return { lo: 1, hi: cap };
    }
    return { lo: Math.max(1, g0 * 0.15), hi: Math.min(160, Math.max(g0 * 2.2, 40)) };
  }
  if (kind === "carb") {
    if (keto) return { lo: 0, hi: Math.min(40, Math.max(8, g0 * 0.35)) };
    return { lo: Math.max(1, g0 * 0.1), hi: Math.min(360, Math.max(g0 * 2.6, 40)) };
  }
  const p = nutriFor(name).protein;
  const cap = p >= 8 && target.protein ? (target.protein * 1.18 / p) * 100 : 380;
  const hi = p >= 40 ? Math.min(cap, Math.max(g0 * 1.65, 55)) : Math.min(cap, Math.max(g0 * 2.4, 80));
  return { lo: Math.max(8, g0 * 0.22), hi: Math.max(hi, 24) };
}

function lossOf(m: Nutri, target: Nutri, w: SolveWeights, work: GramLine[], g0: number[]): number {
  const ek = (m.kcal - target.kcal) / Math.max(target.kcal, 1);
  const ep = (m.protein - target.protein) / Math.max(target.protein, 1);
  const ec = (m.carbs - target.carbs) / Math.max(target.carbs, 1);
  const ef = (m.fat - target.fat) / Math.max(target.fat, 1);
  let ident = 0;
  for (let i = 0; i < work.length; i++) {
    const base = Math.max(g0[i] ?? work[i].grams, 1);
    const d = (work[i].grams - base) / base;
    ident += d * d;
  }
  return w.kcal * ek * ek + w.protein * ep * ep + w.carbs * ec * ec + w.fat * ef * ef + w.identity * ident;
}

function descend(
  lines: GramLine[],
  g0: number[],
  target: Nutri,
  w: SolveWeights,
  diets: DietId[],
  iters: number,
): GramLine[] {
  const work = lines.map((l) => ({ ...l }));
  const lo: number[] = [];
  const hi: number[] = [];
  for (let i = 0; i < work.length; i++) {
    const b = bounds(work[i].name, g0[i] ?? work[i].grams, diets, target);
    lo.push(b.lo);
    hi.push(b.hi);
  }
  const steps = [14, 8, 4, 2];
  for (let t = 0; t < iters; t++) {
    const cur = lossOf(macrosOf(work), target, w, work, g0);
    const step = steps[Math.min(steps.length - 1, Math.floor(t / 9))];
    let bestI = -1;
    let bestG = 0;
    let bestLoss = cur;
    for (let i = 0; i < work.length; i++) {
      if (kindOf(work[i].name) === "garnish" && t > 6) continue;
      for (const dir of [-step, step]) {
        const g = clamp(work[i].grams + dir, lo[i], hi[i]);
        if (Math.abs(g - work[i].grams) < 0.4) continue;
        const prev = work[i].grams;
        work[i].grams = g;
        const s = lossOf(macrosOf(work), target, w, work, g0);
        work[i].grams = prev;
        if (s < bestLoss - 1e-6) {
          bestLoss = s;
          bestI = i;
          bestG = g;
        }
      }
    }
    if (bestI < 0) break;
    work[bestI].grams = bestG;
  }
  return work;
}

function absorbKcal(lines: GramLine[], g0: number[], target: Nutri, diets: DietId[]): GramLine[] {
  const work = lines.map((l) => ({ ...l }));
  for (let n = 0; n < 10; n++) {
    const m = macrosOf(work);
    const err = target.kcal - m.kcal;
    if (Math.abs(err) < Math.max(14, target.kcal * 0.04)) break;
    const flex = work
      .map((l, i) => ({ i, kind: kindOf(l.name), k: nutriFor(l.name).kcal / 100 }))
      .filter((x) => x.kind === "carb" || x.kind === "fat")
      .sort((a, b) => (err < 0 ? b.k - a.k : a.k - b.k));
    if (!flex.length) break;
    const pick = flex[0];
    const b = bounds(work[pick.i].name, g0[pick.i] ?? work[pick.i].grams, diets, target);
    const delta = err / Math.max(pick.k, 0.08);
    const next = clamp(work[pick.i].grams + delta, b.lo, b.hi);
    if (Math.abs(next - work[pick.i].grams) < 0.5) break;
    work[pick.i].grams = next;
  }
  return work;
}

function injectBooster(lines: GramLine[], target: Nutri, diets: DietId[]): { lines: GramLine[]; detail: string } | null {
  const now = macrosOf(lines);
  const need = target.protein - now.protein;
  if (need < 3) return null;

  const existing = lines
    .map((l, i) => ({ l, i, p: nutriFor(l.name).protein, f: nutriFor(l.name).fat }))
    .filter((x) => x.p >= 8 && legalForDiets(x.l.name, diets))
    .sort((a, b) => b.p - a.p);
  if (existing.length) {
    const pick = existing[0];
    const fatty = pick.f / Math.max(pick.p, 1) > 0.35;
    const cap = bounds(pick.l.name, pick.l.grams, diets, target);
    const room = Math.max(0, cap.hi - pick.l.grams);
    const addG = clamp((need / Math.max(pick.p, 1)) * 100, 0, Math.min(160, room));
    if (!fatty && addG >= 8) {
      return {
        lines: lines.map((l, i) => (i === pick.i ? { ...l, grams: l.grams + addG } : l)),
        detail: `+${Math.round(addG)}g ${pick.l.name} to close protein`,
      };
    }
  }

  const boost = bestBooster(diets);
  if (!boost) return null;
  const p100 = nutriFor(boost).protein;
  const grams = clamp((need / Math.max(p100, 1)) * 100, 12, 120);
  const id = `boost-${boost.replace(/[^a-z0-9]+/g, "-")}`;
  return {
    lines: [...lines, { id, name: boost, grams }],
    detail: `Added ${Math.round(grams)}g ${boost} — protein was short ${Math.round(need)}g`,
  };
}

function bestBooster(diets: DietId[]): string | null {
  let best: string | null = null;
  let score = 0;
  for (const name of BOOSTERS) {
    if (!legalForDiets(name, diets)) continue;
    const n = nutriFor(name);
    const culinary = /protein|whey/.test(name) ? 0.7 : 1.6;
    const lean = n.protein / Math.max(n.fat, 0.8);
    const s = (n.protein / Math.max(n.kcal, 1)) * culinary * lean;
    if (s > score) {
      score = s;
      best = name;
    }
  }
  return best;
}

function cookRound(grams: number, kind: LineKind): number {
  if (kind === "fat" || kind === "garnish") return Math.max(1, Math.round(grams));
  return Math.max(1, Math.round(grams / 5) * 5);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

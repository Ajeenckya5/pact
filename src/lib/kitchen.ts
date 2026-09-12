import { INGREDIENTS, RECIPES } from "./data";
import { findPantry } from "./pantry";
import { bestSwap, pactSolve, rankHit, smartSwap, weightsFor, type SolveMove } from "./optimizer";
import {
  DIETS,
  dietsForNames,
  lineMacros,
  parseGrams,
  roundNutri,
  sumNutri,
  type DietId,
  type Nutri,
} from "./nutrition";
import type { GoalId, Ingredient } from "./types";

export type KitchenLine = {
  id: string;
  name: string;
  grams: number;
  original: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type KitchenRecipe = {
  id: string;
  name: string;
  photo: string;
  category: string;
  area: string;
  youtubeId?: string;
  steps: string[];
  lines: KitchenLine[];
  diets: DietId[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "themealdb" | "pact";
};

export type MealTargets = Nutri;

export function finalizeRecipe(base: Omit<KitchenRecipe, "kcal" | "protein" | "carbs" | "fat" | "diets">): KitchenRecipe {
  const totals = roundNutri(sumNutri(base.lines));
  return {
    ...base,
    ...totals,
    diets: dietsForNames(
      base.lines.map((l) => l.name),
      totals.carbs,
    ),
  };
}

export function makeLine(name: string, measure: string, idx: number): KitchenLine {
  const grams = Math.max(1, Math.round(parseGrams(measure, name)));
  const m = lineMacros(name, grams);
  return {
    id: `l${idx}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
    name,
    grams,
    original: measure || `${grams}g`,
    ...roundNutri(m),
  };
}

export function setLineGrams(recipe: KitchenRecipe, lineId: string, grams: number): KitchenRecipe {
  const lines = recipe.lines.map((l) => {
    if (l.id !== lineId) return l;
    const g = Math.max(0, grams);
    return { ...l, grams: g, original: `${Math.round(g)}g`, ...roundNutri(lineMacros(l.name, g)) };
  });
  return finalizeRecipe({ ...recipe, lines });
}

export function renameLine(recipe: KitchenRecipe, lineId: string, name: string): KitchenRecipe {
  const lines = recipe.lines.map((l) => {
    if (l.id !== lineId) return l;
    return { ...l, name, ...roundNutri(lineMacros(name, l.grams)) };
  });
  return finalizeRecipe({ ...recipe, lines });
}

export function removeLine(recipe: KitchenRecipe, lineId: string): KitchenRecipe {
  return finalizeRecipe({ ...recipe, lines: recipe.lines.filter((l) => l.id !== lineId) });
}

export function addLine(recipe: KitchenRecipe, name: string, grams = 100): KitchenRecipe {
  const line = makeLine(name, `${grams}g`, recipe.lines.length + 1);
  return finalizeRecipe({ ...recipe, lines: [...recipe.lines, line] });
}

export function scaleRecipe(recipe: KitchenRecipe, factor: number): KitchenRecipe {
  const f = Math.min(8, Math.max(0.02, factor));
  const lines = recipe.lines.map((l) => {
    const grams = Math.max(1, Math.round(l.grams * f));
    return { ...l, grams, original: `${grams}g`, ...roundNutri(lineMacros(l.name, grams)) };
  });
  return finalizeRecipe({ ...recipe, lines });
}

/** PactSolve: diet-aware swaps, then bounded weighted least-squares on grams. */
export function fitToTargets(recipe: KitchenRecipe, target: MealTargets, goal: GoalId = "cut", diets: DietId[] = []): KitchenRecipe {
  return solvePlate(recipe, target, goal, diets).recipe;
}

export function solvePlate(
  recipe: KitchenRecipe,
  target: MealTargets,
  goal: GoalId = "cut",
  diets: DietId[] = [],
): { recipe: KitchenRecipe; moves: SolveMove[]; score: number } {
  const solved = pactSolve(
    recipe.lines.map((l) => ({ id: l.id, name: l.name, grams: l.grams })),
    target,
    diets,
    weightsFor(goal),
  );
  const lines = solved.lines.map((l) => {
    const m = roundNutri(lineMacros(l.name, l.grams));
    return {
      id: l.id,
      name: l.name,
      grams: l.grams,
      original: `${Math.round(l.grams)}g`,
      ...m,
    };
  });
  return { recipe: finalizeRecipe({ ...recipe, lines }), moves: solved.moves, score: solved.score };
}

export function applyDietSwaps(
  recipe: KitchenRecipe,
  diets: DietId[],
  target?: MealTargets,
): { recipe: KitchenRecipe; notes: string[] } {
  if (!diets.length) return { recipe, notes: [] };
  const swapped = smartSwap(
    recipe.lines.map((l) => ({ id: l.id, name: l.name, grams: l.grams })),
    diets,
    target ?? { kcal: recipe.kcal, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat },
  );
  const lines = recipe.lines.map((l) => {
    const n = swapped.lines.find((x) => x.id === l.id);
    if (!n) return l;
    return { ...l, name: n.name, grams: Math.round(n.grams), original: `${Math.round(n.grams)}g`, ...roundNutri(lineMacros(n.name, n.grams)) };
  });
  return { recipe: finalizeRecipe({ ...recipe, lines }), notes: swapped.notes };
}

export function swapForLine(name: string, diets: DietId[], target?: MealTargets): { to: string; note: string } | null {
  return bestSwap(name, diets, target ?? { kcal: 600, protein: 40, carbs: 50, fat: 20 });
}

export function mealSlice(goal: { kcal: number; protein: number; carbs: number; fat: number }, meals = 3): MealTargets {
  return {
    kcal: Math.round(goal.kcal / meals),
    protein: Math.round(goal.protein / meals),
    carbs: Math.round(goal.carbs / meals),
    fat: Math.round(goal.fat / meals),
  };
}

export function mealRecordToKitchen(meal: Record<string, string | null>): KitchenRecipe | null {
  const id = meal.idMeal;
  const name = meal.strMeal;
  if (!id || !name) return null;
  const lines: KitchenLine[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`]?.trim();
    if (!ing) continue;
    const measure = meal[`strMeasure${i}`]?.trim() ?? "";
    lines.push(makeLine(ing, measure, i));
  }
  if (!lines.length) return null;
  const youtube = meal.strYoutube ?? "";
  const yt = youtube.match(/v=([\w-]+)/)?.[1] ?? undefined;
  const steps = (meal.strInstructions ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return finalizeRecipe({
    id: `mealdb-${id}`,
    name,
    photo: meal.strMealThumb ?? "",
    category: meal.strCategory ?? "Meal",
    area: meal.strArea ?? "",
    youtubeId: yt,
    steps: steps.length ? steps : ["See TheMealDB for the method."],
    lines,
    source: "themealdb",
  });
}

const PACT_GRAMS: Record<string, number> = {
  "olive-oil": 12,
  whey: 30,
  almonds: 25,
  berries: 90,
  blueberries: 90,
  spinach: 80,
  broccoli: 120,
  avocado: 80,
  chicken: 180,
  salmon: 170,
  tofu: 180,
  yogurt: 200,
  eggs: 120,
  rice: 160,
  quinoa: 150,
  oats: 80,
  lentils: 160,
  "sweet-potato": 180,
  kefir: 200,
};

export function pactRecipesToKitchen(): KitchenRecipe[] {
  return RECIPES.map((r) =>
    finalizeRecipe({
      id: `pact-${r.id}`,
      name: r.name,
      photo: r.photo,
      category: "Pact",
      area: "San Francisco",
      steps: r.steps,
      source: "pact",
      lines: r.ingredients.map((id, i) => {
        const ing = INGREDIENTS.find((x) => x.id === id);
        const grams = PACT_GRAMS[id] ?? 100;
        return makeLine(ing?.name ?? id, `${grams}g`, i + 1);
      }),
    }),
  );
}

export function matchIngredient(name: string): Ingredient | undefined {
  const n = name.toLowerCase();
  const grocery = INGREDIENTS.find((i) => {
    const token = i.id.replace(/-/g, " ");
    const first = i.name.split(" ")[0]?.toLowerCase() ?? "";
    return n.includes(token) || (first.length > 3 && n.includes(first)) || i.name.toLowerCase().includes(n);
  });
  if (grocery) return grocery;
  const pantry = findPantry(name);
  if (!pantry) return undefined;
  return {
    id: pantry.id,
    name: pantry.name,
    aisle: pantry.aisle,
    kcal100: pantry.kcal100,
    protein100: pantry.protein100,
    price: 4,
    stores: [],
    goals: [],
  };
}

export function passesDiets(recipe: KitchenRecipe, diets: DietId[]): boolean {
  if (!diets.length) return true;
  return diets.every((d) => recipe.diets.includes(d));
}

export function macroScore(recipe: KitchenRecipe, target: MealTargets): number {
  if (!target.kcal) return 0;
  const a = Math.abs(recipe.kcal - target.kcal) / target.kcal;
  const b = Math.abs(recipe.protein - target.protein) / Math.max(target.protein, 1);
  const c = Math.abs(recipe.carbs - target.carbs) / Math.max(target.carbs, 1);
  const d = Math.abs(recipe.fat - target.fat) / Math.max(target.fat, 1);
  return a + b + c + d;
}

export function overlapScore(recipe: KitchenRecipe, selectedNames: string[]): number {
  if (!selectedNames.length) return 0;
  const hay = recipe.lines.map((l) => l.name.toLowerCase()).join(" ");
  return selectedNames.filter((n) => hay.includes(n.toLowerCase())).length;
}

export { DIETS, rankHit };
export type { DietId, SolveMove };

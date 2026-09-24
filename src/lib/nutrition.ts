import { findPantry } from "./pantry";

export type DietId =
  | "vegan"
  | "vegetarian"
  | "pescatarian"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "halal"
  | "kosher"
  | "keto"
  | "paleo";

export const DIETS: Array<{ id: DietId; name: string; blurb: string }> = [
  { id: "vegan", name: "Vegan", blurb: "No meat, fish, dairy, eggs, honey" },
  { id: "vegetarian", name: "Vegetarian", blurb: "No meat or fish" },
  { id: "pescatarian", name: "Pescatarian", blurb: "Fish ok, no land meat" },
  { id: "gluten-free", name: "Gluten-free", blurb: "No wheat, barley, rye" },
  { id: "dairy-free", name: "Dairy-free", blurb: "No milk, cheese, butter, cream" },
  { id: "nut-free", name: "Nut-free", blurb: "No tree nuts or peanuts" },
  { id: "halal", name: "Halal", blurb: "No pork or alcohol" },
  { id: "kosher", name: "Kosher-leaning", blurb: "No pork, shellfish, or meat+dairy" },
  { id: "keto", name: "Keto-leaning", blurb: "Under ~40g carbs per plate" },
  { id: "paleo", name: "Paleo-leaning", blurb: "No grains, dairy, or legumes" },
];

export type Nutri = { kcal: number; protein: number; carbs: number; fat: number };

const FALLBACK_NUTRI: Nutri = { kcal: 80, protein: 3, carbs: 10, fat: 2 };

/** Generic keys kitchen lines still use when the pantry name is more specific. */
const NUTRI_ALIASES: Record<string, Nutri> = {
  beef: { kcal: 250, protein: 26, carbs: 0, fat: 17 },
  pork: { kcal: 242, protein: 27, carbs: 0, fat: 14 },
  fish: { kcal: 120, protein: 22, carbs: 0, fat: 3 },
  bean: { kcal: 127, protein: 9, carbs: 23, fat: 0.5 },
  cheese: { kcal: 402, protein: 25, carbs: 1.3, fat: 33 },
  noodle: { kcal: 138, protein: 4.5, carbs: 25, fat: 2 },
  oat: { kcal: 389, protein: 17, carbs: 66, fat: 7 },
  berry: { kcal: 50, protein: 0.8, carbs: 12, fat: 0.4 },
};

function nutriOf(item: { kcal100: number; protein100: number; carbs100: number; fat100: number }): Nutri {
  return { kcal: item.kcal100, protein: item.protein100, carbs: item.carbs100, fat: item.fat100 };
}

function buildNutriTable(): Record<string, Nutri> {
  return { ...NUTRI_ALIASES };
}

/** Per 100g. Longest word-boundary key wins. */
export const NUTRI_100: Record<string, Nutri> = buildNutriTable();

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NUTRI_KEYS = Object.keys(NUTRI_100)
  .sort((a, b) => b.length - a.length)
  .map((key) => ({
    key,
    nutri: NUTRI_100[key],
    re: new RegExp(`(?:^|[^a-z0-9])${escapeRe(key)}(?:[^a-z0-9]|$)`, "i"),
  }));

export const SWAPS: Array<{ from: RegExp; to: string; diets: DietId[]; note: string }> = [
  { from: /chicken(?!.*(?:stock|broth|cube))|turkey/, to: "firm tofu", diets: ["vegan", "vegetarian"], note: "Same savory role, plant protein" },
  { from: /beef|steak|lamb|pork/, to: "tempeh", diets: ["vegan", "vegetarian"], note: "Chewy plant protein" },
  { from: /salmon|tuna|cod|fish|prawn|shrimp/, to: "chickpeas", diets: ["vegan", "vegetarian"], note: "Keep the bowl, drop the sea" },
  { from: /milk(?!.*coconut)|whole milk/, to: "oat milk", diets: ["vegan", "dairy-free"], note: "Neutral dairy stand-in" },
  { from: /butter|ghee/, to: "olive oil", diets: ["vegan", "dairy-free"], note: "Fat without dairy" },
  { from: /cream/, to: "coconut milk", diets: ["vegan", "dairy-free"], note: "Richness without cream" },
  { from: /cheese|parmesan|mozzarella|cheddar|yogurt|yoghurt/, to: "firm tofu", diets: ["vegan", "dairy-free"], note: "Protein without dairy" },
  { from: /\beggs?\b/, to: "firm tofu", diets: ["vegan"], note: "Bind and protein" },
  { from: /pasta|spaghetti|linguine|penne|noodle|wheat|flour|bread|couscous/, to: "rice", diets: ["gluten-free"], note: "Naturally gluten-free starch" },
  { from: /soy sauce/, to: "tamari", diets: ["gluten-free"], note: "GF aged soy" },
  { from: /honey/, to: "maple syrup", diets: ["vegan"], note: "Plant sweetener" },
  { from: /almond|peanut|cashew|walnut|pecan|hazelnut|pistachio/, to: "pumpkin seeds", diets: ["nut-free"], note: "Crunch without nuts" },
  { from: /pork|bacon|ham|lard/, to: "chicken", diets: ["halal", "kosher"], note: "Swap the pork cut" },
  { from: /shrimp|prawn|crab|lobster|oyster|mussel|clam|scallop/, to: "salmon", diets: ["kosher"], note: "Finned fish instead of shellfish" },
  { from: /rice|pasta|potato|bread|flour|sugar|honey/, to: "spinach", diets: ["keto"], note: "Drop the starch" },
  { from: /pasta|spaghetti|bread|flour|oat|rice|noodle|couscous/, to: "sweet potato", diets: ["paleo"], note: "Root starch, no grain" },
  { from: /tofu|tempeh|soy|lentil|chickpea|bean/, to: "chicken", diets: ["paleo"], note: "Paleo protein" },
  { from: /yogurt|yoghurt|milk(?!.*coconut)|cheese/, to: "coconut milk", diets: ["paleo"], note: "No dairy" },
];

const MEAT = /beef|pork|lamb|chicken|turkey|bacon|ham|sausage|steak|veal|duck|goat|meat|pepperoni|prosciutto|lard/;
const FISH = /salmon|tuna|fish|prawn|shrimp|cod|anchov|sardine|mussel|oyster|crab|lobster|seafood|haddock/;
const DAIRY = /milk|cheese|butter|cream|yogurt|yoghurt|ghee|whey|parmesan|mozzarella|cheddar|paneer/;
const PLANT_DAIRY = /(oat|almond|coconut|soy|rice|pea|cashew|hemp) milk|coconut cream/;
const EGG = /\beggs?\b/;
const GLUTEN = /wheat|flour|bread|pasta|spaghetti|linguine|penne|noodle|couscous|barley|rye|seitan|soy sauce/;
const NUTS = /almond|peanut|cashew|walnut|pecan|hazelnut|pistachio|\bnuts?\b/;
const PORK = /pork|bacon|ham|lard|pepperoni|prosciutto/;
const ALCOHOL = /wine|beer|rum|vodka|whiskey|brandy|sherry|marsala/;
const HONEY = /honey/;
const SHELLFISH = /shrimp|prawn|crab|lobster|oyster|mussel|clam|scallop/;
const GRAIN = /rice|wheat|pasta|bread|oat|flour|noodle|couscous|barley|rye|quinoa/;
const LEGUME = /lentil|bean|chickpea|soy|tofu|tempeh|peanut/;
const SUGAR = /sugar|honey/;

export function flagsFor(name: string) {
  const n = name.toLowerCase();
  return {
    meat: MEAT.test(n),
    fish: FISH.test(n),
    dairy: DAIRY.test(n) && !PLANT_DAIRY.test(n),
    egg: EGG.test(n),
    gluten: GLUTEN.test(n) && !/tamari|rice noodle|rice flour/.test(n),
    nuts: NUTS.test(n),
    pork: PORK.test(n),
    alcohol: ALCOHOL.test(n),
    honey: HONEY.test(n),
    shellfish: SHELLFISH.test(n),
    grain: GRAIN.test(n),
    legume: LEGUME.test(n),
    sugar: SUGAR.test(n),
    protein: /chicken|turkey|beef|fish|salmon|tuna|tofu|tempeh|lentil|egg|yogurt|prawn|shrimp|whey|protein|seitan/.test(n),
    carb: /rice|pasta|bread|flour|potato|oat|sugar|honey|noodle|quinoa|couscous|sweet potato/.test(n),
    fat: /oil|butter|ghee|cream|avocado|almond|peanut|coconut|lard|cheese/.test(n),
  };
}

export function dietsForNames(names: string[], carbs = 0): DietId[] {
  const f = names.map(flagsFor);
  const any = (k: keyof ReturnType<typeof flagsFor>) => f.some((x) => x[k]);
  const out: DietId[] = [];
  if (!any("meat") && !any("fish") && !any("dairy") && !any("egg") && !any("honey")) out.push("vegan");
  if (!any("meat") && !any("fish")) out.push("vegetarian");
  if (!any("meat")) out.push("pescatarian");
  if (!any("gluten")) out.push("gluten-free");
  if (!any("dairy")) out.push("dairy-free");
  if (!any("nuts")) out.push("nut-free");
  if (!any("pork") && !any("alcohol")) out.push("halal");
  if (!any("pork") && !any("shellfish") && !(any("meat") && any("dairy"))) out.push("kosher");
  if (carbs <= 40) out.push("keto");
  if (!any("dairy") && !any("gluten") && !any("grain") && !any("legume") && !any("sugar")) out.push("paleo");
  return out;
}

export function legalForDiets(name: string, diets: DietId[]): boolean {
  if (!diets.length) return true;
  const f = flagsFor(name);
  const n = nutriFor(name);
  for (const d of diets) {
    if (d === "vegan" && (f.meat || f.fish || f.dairy || f.egg || f.honey)) return false;
    if (d === "vegetarian" && (f.meat || f.fish)) return false;
    if (d === "pescatarian" && f.meat) return false;
    if (d === "gluten-free" && f.gluten) return false;
    if (d === "dairy-free" && f.dairy) return false;
    if (d === "nut-free" && f.nuts) return false;
    if (d === "halal" && (f.pork || f.alcohol)) return false;
    if (d === "kosher" && (f.pork || f.shellfish)) return false;
    if (d === "paleo" && (f.dairy || f.gluten || f.grain || f.legume || f.sugar)) return false;
    if (d === "keto" && n.carbs >= 20 && n.protein < 12 && n.fat < 35) return false;
  }
  return true;
}

export function nutriFor(name: string): Nutri {
  const cached = findPantry(name);
  if (cached) return nutriOf(cached);
  const n = name.toLowerCase();
  const hit = NUTRI_KEYS.find((k) => k.re.test(n));
  return hit?.nutri ?? FALLBACK_NUTRI;
}

export function parseGrams(measure: string, ingredient: string): number {
  const raw = measure
    .toLowerCase()
    .trim()
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/⅓/g, "1/3")
    .replace(/⅔/g, "2/3")
    .replace(/⅛/g, "1/8");
  const m = raw.replace(
    /(\d)\s+(kg|g|ml|oz|lb|l|tbsp|tsp|cups?|tablespoons?|teaspoons?|grams?|kilograms?|milliliters?|litres?|liters?)\b/g,
    "$1$2",
  );
  if (!m || /taste|pinch|dash|garnish/.test(m)) return /pinch|dash/.test(m) ? 1 : 8;
  const mixed = m.replace(/(\d+)\s+(\d)\/(\d)/g, (_, a, b, c) => String(Number(a) + Number(b) / Number(c)));
  const frac = mixed.replace(/(\d*)\s*(\d)\/(\d)/g, (_, a, b, c) => String((Number(a) || 0) + Number(b) / Number(c)));
  const numMatch = frac.match(/[\d.]+/);
  const n = numMatch ? Number.parseFloat(numMatch[0]) : 1;
  if (Number.isNaN(n)) return 50;
  if (/kg|kilogram/.test(m)) return n * 1000;
  if (/gram/.test(m) || /\d(?:\.\d+)?g(?:\s|$|[^a-z])/i.test(m) || /[0-9]g$/.test(m)) return n;
  if (/\d(?:\.\d+)?oz\b|[0-9]oz/.test(m) || /\boz\b/.test(m)) return n * 28.35;
  if (/\blb\b|pound/.test(m)) return n * 453.6;
  if (/tbsp|tablespoon/.test(m)) return n * 15;
  if (/tsp|teaspoon/.test(m)) return n * 5;
  if (/cup/.test(m)) return n * cupGrams(ingredient);
  if (/millilit|\d(?:\.\d+)?ml\b|[0-9]ml/.test(m) || /\bml\b/.test(m)) return n;
  if (/(?:litre|liter|(?:^|[^a-z])l(?:\s|$))/i.test(m) && !/tbsp|tsp|ml/.test(m)) return n * 1000;
  if (/clove/.test(m)) return n * 4;
  if (/slice/.test(m)) return n * 25;
  if (/can|tin/.test(m)) return n * 400;
  if (/bunch/.test(m)) return n * 120;
  if (/fillet|filet/.test(m)) return n * 170;
  if (/breast/.test(m)) return n * 180;
  if (/handful/.test(m)) return n * 30;
  if (/pack|packet/.test(m)) return n * 250;
  if (/whole|large/.test(m)) return n * 120;
  if (/medium/.test(m)) return n * 90;
  if (/small/.test(m)) return n * 60;
  if (/piece|pcs/.test(m)) return n * 50;
  return Math.max(8, n * 40);
}

function cupGrams(ingredient: string) {
  const n = ingredient.toLowerCase();
  if (/flour|oat/.test(n)) return 120;
  if (/rice|sugar/.test(n)) return 200;
  if (/spinach|kale|herb|leaf/.test(n)) return 30;
  if (/oil|milk|water|stock|broth/.test(n)) return 240;
  if (/cheese/.test(n)) return 110;
  return 150;
}

export function lineMacros(name: string, grams: number): Nutri {
  const per = nutriFor(name);
  const k = grams / 100;
  return {
    kcal: per.kcal * k,
    protein: per.protein * k,
    carbs: per.carbs * k,
    fat: per.fat * k,
  };
}

export function sumNutri(lines: Nutri[]): Nutri {
  return lines.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function roundNutri(n: Nutri): Nutri {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein),
    carbs: Math.round(n.carbs),
    fat: Math.round(n.fat),
  };
}

/**
 * On-device plate scan.
 *
 * Color prototypes plus filename words. The photo stays on the device.
 * Macros come from a cached food when one is stored, otherwise a small
 * prototype table. Atwater kcal = 4P+4C+9F.
 */
import { ATWATER, cosine, rgbToHsv, softmax } from "./algos";
import { displayFoodLabel, pantryIdForVisionLabel } from "./food101-map";
import type { FoodNetHit, FoodNetInfo } from "./food101-map";
import { derivedKcal, findPantry, foodById, scalePantry, type PantryItem } from "./pantry";

const SALMON: PantryItem = {
  id: "salmon",
  name: "Atlantic salmon",
  group: "Seafood",
  aisle: "Seafood",
  aliases: ["salmon fillet"],
  kcal100: 208,
  protein100: 20,
  carbs100: 0,
  fat100: 13,
  servingG: 170,
  servingLabel: "6 oz",
};

function storedFood(id?: string): PantryItem | undefined {
  if (!id) return undefined;
  return foodById(id) ?? (id === "salmon" ? SALMON : undefined);
}

export { ATWATER, cosine, softmax };
export const CONFIDENCE_FLOOR = 0.34;
export const NET_FLOOR = 0.05;
export const FILENAME_WEIGHT = 2.2;
export const VISION_WEIGHT = 1.5;
export const HOUR_WEIGHT = 0.08;

export type PlateFeatures = {
  samples: number;
  foodPixels: number;
  foodCover: number;
  green: number;
  yellow: number;
  orange: number;
  red: number;
  brown: number;
  white: number;
  beige: number;
  dark: number;
  meanS: number;
  meanV: number;
  edge: number;
};

export type PlateCandidate = {
  id: string;
  name: string;
  pantryId?: string;
  foodId?: string;
  score: number;
  softmax: number;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  atwaterKcal: number;
  why: string[];
};

export type PlateScan = {
  features: PlateFeatures | null;
  filenameTokens: string[];
  hour: number;
  unsure: boolean;
  engine: "clip" | "hsv";
  netModel: FoodNetInfo | null;
  netLabels: FoodNetHit[];
  top: PlateCandidate | null;
  ranked: PlateCandidate[];
  proof: string[];
};

type Prototype = {
  id: string;
  name: string;
  pantryId?: string;
  foodId?: string;
  aliases: string[];
  meals: Array<"breakfast" | "lunch" | "dinner" | "snack">;
  vec: Pick<PlateFeatures, "green" | "yellow" | "orange" | "red" | "brown" | "white" | "beige" | "dark" | "edge">;
};

const PROTOTYPES: Prototype[] = [
  { id: "salad", name: "Green salad", pantryId: "spinach", foodId: "salad", aliases: ["salad", "greens", "spinach", "lettuce", "kale", "slaw"], meals: ["lunch", "dinner"], vec: { green: 0.62, yellow: 0.08, orange: 0.04, red: 0.06, brown: 0.04, white: 0.08, beige: 0.05, dark: 0.03, edge: 0.55 } },
  { id: "yogurt", name: "Yogurt bowl", pantryId: "yogurt", foodId: "yogurt", aliases: ["yogurt", "yoghurt", "parfait", "berry bowl"], meals: ["breakfast", "snack"], vec: { green: 0.04, yellow: 0.06, orange: 0.04, red: 0.12, brown: 0.05, white: 0.52, beige: 0.12, dark: 0.05, edge: 0.22 } },
  { id: "oats", name: "Oatmeal", pantryId: "oats", aliases: ["oat", "oats", "oatmeal", "porridge"], meals: ["breakfast"], vec: { green: 0.02, yellow: 0.08, orange: 0.06, red: 0.04, brown: 0.28, white: 0.12, beige: 0.35, dark: 0.05, edge: 0.18 } },
  { id: "eggs", name: "Eggs", pantryId: "eggs", aliases: ["egg", "eggs", "omelette", "omelet", "scramble"], meals: ["breakfast", "lunch"], vec: { green: 0.04, yellow: 0.42, orange: 0.08, red: 0.04, brown: 0.08, white: 0.22, beige: 0.1, dark: 0.02, edge: 0.28 } },
  { id: "chicken", name: "Chicken plate", pantryId: "chicken", foodId: "chicken-plate", aliases: ["chicken", "poultry", "grilled chicken"], meals: ["lunch", "dinner"], vec: { green: 0.16, yellow: 0.08, orange: 0.05, red: 0.04, brown: 0.22, white: 0.12, beige: 0.28, dark: 0.05, edge: 0.4 } },
  { id: "salmon", name: "Salmon bowl", pantryId: "salmon", foodId: "salmon-bowl", aliases: ["salmon", "fish", "miso"], meals: ["lunch", "dinner"], vec: { green: 0.18, yellow: 0.08, orange: 0.32, red: 0.08, brown: 0.08, white: 0.1, beige: 0.12, dark: 0.04, edge: 0.38 } },
  { id: "steak", name: "Steak", pantryId: "steak", aliases: ["steak", "ribeye", "sirloin", "beef"], meals: ["dinner"], vec: { green: 0.08, yellow: 0.05, orange: 0.08, red: 0.18, brown: 0.4, white: 0.05, beige: 0.1, dark: 0.16, edge: 0.32 } },
  { id: "rice", name: "Rice bowl", pantryId: "rice", aliases: ["rice", "bowl", "biryani", "poke"], meals: ["lunch", "dinner"], vec: { green: 0.12, yellow: 0.1, orange: 0.06, red: 0.06, brown: 0.12, white: 0.32, beige: 0.18, dark: 0.04, edge: 0.35 } },
  { id: "pizza", name: "Pizza", pantryId: "pizza-slice", aliases: ["pizza", "pepperoni", "margherita"], meals: ["lunch", "dinner", "snack"], vec: { green: 0.08, yellow: 0.28, orange: 0.12, red: 0.28, brown: 0.1, white: 0.04, beige: 0.08, dark: 0.02, edge: 0.45 } },
  { id: "pasta", name: "Pasta", pantryId: "pasta", aliases: ["pasta", "spaghetti", "noodle", "ramen"], meals: ["lunch", "dinner"], vec: { green: 0.06, yellow: 0.38, orange: 0.12, red: 0.18, brown: 0.08, white: 0.06, beige: 0.1, dark: 0.02, edge: 0.36 } },
  { id: "burger", name: "Burger", pantryId: "burger", aliases: ["burger", "cheeseburger", "patty"], meals: ["lunch", "dinner"], vec: { green: 0.1, yellow: 0.12, orange: 0.08, red: 0.12, brown: 0.32, white: 0.06, beige: 0.14, dark: 0.06, edge: 0.4 } },
  { id: "avocado", name: "Avocado toast", pantryId: "avocado", aliases: ["avocado", "toast", "guac"], meals: ["breakfast", "lunch"], vec: { green: 0.38, yellow: 0.08, orange: 0.04, red: 0.04, brown: 0.18, white: 0.08, beige: 0.16, dark: 0.04, edge: 0.34 } },
  { id: "coffee", name: "Coffee", pantryId: "black-coffee", foodId: "espresso-bar", aliases: ["coffee", "espresso", "latte", "cappuccino"], meals: ["breakfast", "snack"], vec: { green: 0.01, yellow: 0.04, orange: 0.06, red: 0.04, brown: 0.38, white: 0.12, beige: 0.12, dark: 0.23, edge: 0.12 } },
  { id: "smoothie", name: "Smoothie", pantryId: "berries", aliases: ["smoothie", "shake", "juice"], meals: ["breakfast", "snack"], vec: { green: 0.18, yellow: 0.12, orange: 0.12, red: 0.22, brown: 0.06, white: 0.18, beige: 0.08, dark: 0.04, edge: 0.1 } },
  { id: "banana", name: "Banana", pantryId: "banana", aliases: ["banana"], meals: ["breakfast", "snack"], vec: { green: 0.08, yellow: 0.55, orange: 0.12, red: 0.02, brown: 0.08, white: 0.05, beige: 0.08, dark: 0.02, edge: 0.2 } },
  { id: "broccoli", name: "Broccoli plate", pantryId: "broccoli", aliases: ["broccoli"], meals: ["lunch", "dinner"], vec: { green: 0.58, yellow: 0.1, orange: 0.04, red: 0.02, brown: 0.08, white: 0.06, beige: 0.08, dark: 0.04, edge: 0.5 } },
  { id: "tofu", name: "Tofu bowl", pantryId: "tofu", foodId: "tofu-bowl", aliases: ["tofu", "tempeh"], meals: ["lunch", "dinner"], vec: { green: 0.18, yellow: 0.1, orange: 0.06, red: 0.06, brown: 0.1, white: 0.28, beige: 0.16, dark: 0.06, edge: 0.36 } },
];

const SKIP_NAME = /^(img|dsc|photo|image|scan|screenshot|pxl|vid|whatsapp|received|file|download|imagepicker|captur)/;

export function foodTokens(fileName: string): string[] {
  return fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !SKIP_NAME.test(t) && !/^\d+$/.test(t));
}

function emptyFeatures(): PlateFeatures {
  return {
    samples: 0,
    foodPixels: 0,
    foodCover: 0,
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    brown: 0,
    white: 0,
    beige: 0,
    dark: 0,
    meanS: 0,
    meanV: 0,
    edge: 0,
  };
}

export function extractFeatures(image: { width: number; height: number; data: Uint8ClampedArray | Uint8Array }): PlateFeatures {
  const { width, height, data } = image;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 96));
  const feat = emptyFeatures();
  let sSum = 0;
  let vSum = 0;
  let edgeHits = 0;
  let edgeN = 0;

  const at = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const p = at(x, y);
      const hsv = rgbToHsv(p.r, p.g, p.b);
      feat.samples += 1;
      sSum += hsv.s;
      vSum += hsv.v;
      const plate = hsv.s < 0.12 && hsv.v > 0.78;
      const voidPx = hsv.v < 0.08;
      if (plate || voidPx) continue;
      feat.foodPixels += 1;
      if (hsv.s < 0.14 && hsv.v > 0.72) feat.white += 1;
      else if (hsv.v < 0.22) feat.dark += 1;
      else if (hsv.h >= 70 && hsv.h < 165 && hsv.s > 0.18) feat.green += 1;
      else if (hsv.h >= 42 && hsv.h < 70 && hsv.s > 0.25) feat.yellow += 1;
      else if (
        ((hsv.h < 50 && hsv.h >= 0) || hsv.h >= 345) &&
        hsv.s > 0.2 &&
        hsv.v < 0.55
      )
        feat.brown += 1;
      else if (hsv.h >= 18 && hsv.h < 42 && hsv.s > 0.35 && hsv.v > 0.35) feat.orange += 1;
      else if ((hsv.h < 18 || hsv.h >= 345) && hsv.s > 0.35) feat.red += 1;
      else feat.beige += 1;

      if (x + step < width && y + step < height) {
        const n = at(Math.min(width - 1, x + step), y);
        const mag = Math.abs(p.r - n.r) + Math.abs(p.g - n.g) + Math.abs(p.b - n.b);
        edgeN += 1;
        if (mag > 70) edgeHits += 1;
      }
    }
  }

  const f = Math.max(1, feat.foodPixels);
  feat.foodCover = feat.samples ? feat.foodPixels / feat.samples : 0;
  feat.green /= f;
  feat.yellow /= f;
  feat.orange /= f;
  feat.red /= f;
  feat.brown /= f;
  feat.white /= f;
  feat.beige /= f;
  feat.dark /= f;
  feat.meanS = feat.samples ? sSum / feat.samples : 0;
  feat.meanV = feat.samples ? vSum / feat.samples : 0;
  feat.edge = edgeN ? edgeHits / edgeN : 0;
  return feat;
}

function vecOf(p: Prototype["vec"] | PlateFeatures) {
  return [p.green, p.yellow, p.orange, p.red, p.brown, p.white, p.beige, p.dark];
}

export function mealSlot(hour: number): Prototype["meals"][number] {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function portionGrams(foodCover: number) {
  return Math.round(Math.min(520, Math.max(70, 80 + 420 * foodCover)));
}

function filenameHits(proto: Prototype, tokens: string[]) {
  if (!tokens.length) return 0;
  let s = 0;
  for (const t of tokens) {
    for (const a of proto.aliases) {
      if (t === a || a.includes(t) || t.includes(a)) {
        s += t === a ? 1 : 0.65;
      }
    }
  }
  return s;
}

function pantryOf(proto: Prototype): PantryItem | undefined {
  if (proto.pantryId) {
    const hit = storedFood(proto.pantryId);
    if (hit) return hit;
  }
  return findPantry(proto.name) ?? findPantry(proto.aliases[0] ?? "");
}

export function rescaleCandidate(c: PlateCandidate, grams: number): PlateCandidate {
  const g = Math.min(800, Math.max(20, Math.round(grams)));
  const item = storedFood(c.pantryId);
  if (item) {
    const macros = scalePantry(item, g);
    return {
      ...c,
      grams: g,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      atwaterKcal: derivedKcal(macros.protein, macros.carbs, macros.fat),
    };
  }
  const k = c.grams ? g / c.grams : 1;
  const protein = Math.round(c.protein * k);
  const carbs = Math.round(c.carbs * k);
  const fat = Math.round(c.fat * k);
  return {
    ...c,
    grams: g,
    kcal: Math.round(c.kcal * k),
    protein,
    carbs,
    fat,
    atwaterKcal: derivedKcal(protein, carbs, fat),
  };
}

export function paintSolid(width: number, height: number, rgb: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return { width, height, data };
}

export function paintMix(width: number, height: number, colors: Array<{ rgb: [number, number, number]; weight: number }>) {
  const data = new Uint8ClampedArray(width * height * 4);
  const total = colors.reduce((s, c) => s + c.weight, 0) || 1;
  const cuts: number[] = [];
  let acc = 0;
  for (const c of colors) {
    acc += c.weight / total;
    cuts.push(acc);
  }
  let p = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = (y * width + x) / (width * height);
      const idx = cuts.findIndex((c) => t < c);
      const rgb = colors[idx < 0 ? colors.length - 1 : idx].rgb;
      data[p++] = rgb[0];
      data[p++] = rgb[1];
      data[p++] = rgb[2];
      data[p++] = 255;
    }
  }
  return { width, height, data };
}

export function rankPlate(input: {
  features?: PlateFeatures | null;
  filename?: string;
  hour?: number;
  net?: FoodNetHit[];
  netInfo?: FoodNetInfo | null;
}): PlateScan {
  const tokens = foodTokens(input.filename ?? "");
  const hour = input.hour ?? 12;
  const features = input.features ?? null;
  const net = (input.net ?? []).filter((h) => h.label && h.score > 0);
  if (net.length) return rankFromNet({ features, tokens, hour, net, netInfo: input.netInfo ?? null });
  return rankFromHsv({ features, tokens, hour });
}

function candidateFromPantry(
  id: string,
  name: string,
  pantryId: string | undefined,
  grams: number,
  score: number,
  softmaxN: number,
  why: string[],
  foodId?: string,
): PlateCandidate {
  const item = storedFood(pantryId) ?? (name ? findPantry(name) : undefined);
  const useGrams = item?.servingG ?? grams;
  const macros = item
    ? scalePantry(item, useGrams)
    : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return {
    id,
    name,
    pantryId: item?.id ?? pantryId,
    foodId,
    score: Math.round(score * 1000) / 1000,
    softmax: Math.round(softmaxN * 1000) / 1000,
    grams: useGrams,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    atwaterKcal: derivedKcal(macros.protein, macros.carbs, macros.fat),
    why,
  };
}

function fileBoost(tokens: string[], label: string, pantryId?: string) {
  if (!tokens.length) return 0;
  const item = storedFood(pantryId);
  const hay = [label, displayFoodLabel(label), item?.name, ...(item?.aliases ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (hay.includes(t)) s += 1;
  }
  return Math.min(1.5, s);
}

function rankFromNet(input: {
  features: PlateFeatures | null;
  tokens: string[];
  hour: number;
  net: FoodNetHit[];
  netInfo: FoodNetInfo | null;
}): PlateScan {
  const merged = new Map<string, { label: string; score: number; pantryId?: string; why: string[] }>();
  for (const hit of input.net) {
    const pantryId = pantryIdForVisionLabel(hit.label);
    const key = pantryId ?? visionFallbackId(hit.label);
    const boost = 0.2 * fileBoost(input.tokens, hit.label, pantryId);
    const score = hit.score + boost;
    const prev = merged.get(key);
    const why = [`CLIP “${hit.label}” ${(hit.score * 100).toFixed(0)}%`];
    if (boost) why.push(`filename boost +${boost.toFixed(2)}`);
    if (!prev || score > prev.score) merged.set(key, { label: hit.label, score, pantryId, why });
  }
  const rows = [...merged.entries()]
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.score - a.score);
  const sm = softmax(rows.map((r) => r.score), 0.18);
  const coverGrams = portionGrams(input.features?.foodCover ?? 0.45);
  const ranked = rows.slice(0, 5).map((row, i) =>
    candidateFromPantry(
      row.id,
      displayFoodLabel(row.label),
      row.pantryId,
      coverGrams,
      row.score,
      sm[i],
      row.why,
    ),
  );
  const top = ranked[0] ?? null;
  const rawTop = input.net[0]?.score ?? 0;
  const second = input.net[1]?.score ?? 0;
  const gapOk = rawTop >= 0.03 && rawTop >= second * 1.6;
  const unsure = !top || (rawTop < NET_FLOOR && !gapOk);
  const model = input.netInfo;
  const proof = [
    `engine = CLIP ViT-B/32 · ${model?.dataset ?? "open image–text pretraining"} (on-device ONNX)`,
    "zero-shot against Pact pantry + dish names (not a 101-class ceiling)",
    model ? `model = ${model.id}` : "model id unknown",
    `top class “${input.net[0]?.label ?? "none"}” p=${(rawTop * 100).toFixed(1)}%`,
    `refuse auto-guess if p < ${NET_FLOOR}`,
    `kcal_Atwater = ${ATWATER.protein}P + ${ATWATER.carbs}C + ${ATWATER.fat}F`,
    `portion = pantry serving (edit grams before logging)`,
    input.tokens.length ? `filename tokens: ${input.tokens.join(", ")}` : "filename has no food words",
    ...input.net.slice(0, 5).map((h) => `  ${h.label} ${(h.score * 100).toFixed(1)}%`),
  ];
  return {
    features: input.features,
    filenameTokens: input.tokens,
    hour: input.hour,
    unsure,
    engine: "clip",
    netModel: model,
    netLabels: input.net,
    top: unsure ? null : top,
    ranked,
    proof,
  };
}

function visionFallbackId(label: string) {
  return `clip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dish"}`;
}

function rankFromHsv(input: {
  features: PlateFeatures | null;
  tokens: string[];
  hour: number;
}): PlateScan {
  const tokens = input.tokens;
  const hour = input.hour;
  const features = input.features;
  const slot = mealSlot(hour);
  const grams = portionGrams(features?.foodCover ?? 0.45);
  const vis = features ? vecOf(features) : null;

  const raw = PROTOTYPES.map((proto) => {
    const why: string[] = [];
    const fileScore = filenameHits(proto, tokens);
    if (fileScore) why.push(`filename +${fileScore.toFixed(2)}`);
    const visScore = vis ? cosine(vis, vecOf(proto.vec)) : 0;
    if (vis) why.push(`color cosine ${visScore.toFixed(2)}`);
    const hourScore = proto.meals.includes(slot) ? 1 : 0;
    if (hourScore) why.push(`slot ${slot}`);
    const score = FILENAME_WEIGHT * fileScore + VISION_WEIGHT * visScore + HOUR_WEIGHT * hourScore;
    const item = pantryOf(proto);
    const macros = item
      ? scalePantry(item, grams)
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const atwaterKcal = derivedKcal(macros.protein, macros.carbs, macros.fat);
    return {
      proto,
      score,
      why,
      grams,
      macros,
      atwaterKcal,
    };
  }).sort((a, b) => b.score - a.score);

  const sm = softmax(raw.map((r) => r.score));
  const ranked: PlateCandidate[] = raw.map((r, i) => ({
    id: r.proto.id,
    name: r.proto.name,
    pantryId: r.proto.pantryId,
    foodId: r.proto.foodId,
    score: Math.round(r.score * 1000) / 1000,
    softmax: Math.round(sm[i] * 1000) / 1000,
    grams: r.grams,
    kcal: r.macros.kcal,
    protein: r.macros.protein,
    carbs: r.macros.carbs,
    fat: r.macros.fat,
    atwaterKcal: r.atwaterKcal,
    why: r.why,
  }));

  const top = ranked[0] ?? null;
  const unsure =
    !top ||
    top.softmax < CONFIDENCE_FLOOR ||
    (tokens.length === 0 && (!features || features.foodPixels < 40));

  const proof = [
    `grams = clamp(70, 520, 80 + 420 × foodCover) = ${grams}g` +
      (features ? ` (cover ${(features.foodCover * 100).toFixed(0)}%)` : ""),
    `score = ${FILENAME_WEIGHT}·filename + ${VISION_WEIGHT}·cosine(HSV, prototype) + ${HOUR_WEIGHT}·mealSlot`,
    `kcal_Atwater = ${ATWATER.protein}P + ${ATWATER.carbs}C + ${ATWATER.fat}F`,
    `confidence = softmax(scores); refuse guess if < ${CONFIDENCE_FLOOR}`,
    tokens.length ? `filename tokens: ${tokens.join(", ")}` : "filename has no food words (IMG_#### ignored)",
    features
      ? `HSV food mix G${pct(features.green)} Y${pct(features.yellow)} O${pct(features.orange)} R${pct(features.red)} Br${pct(features.brown)} W${pct(features.white)} Be${pct(features.beige)}`
      : "no pixels — vision term is 0",
  ];

  return {
    features,
    filenameTokens: tokens,
    hour,
    unsure,
    engine: "hsv",
    netModel: null,
    netLabels: [],
    top: unsure ? null : top,
    ranked: ranked.slice(0, 5),
    proof: [
      "engine = HSV fallback (CLIP net did not run)",
      ...proof,
    ],
  };
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export async function fileToImageData(file: File): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const max = 384;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(32, Math.round(img.width * scale));
    const h = Math.max(32, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const shot = ctx.getImageData(0, 0, w, h);
    return { width: shot.width, height: shot.height, data: shot.data };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImg(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that photo"));
    img.src = url;
  });
}

export async function analyzePlateImage(
  file: File,
  hour = new Date().getHours(),
  onStatus?: (msg: string) => void,
): Promise<PlateScan> {
  let features: PlateFeatures | null = null;
  try {
    onStatus?.("Reading plate pixels…");
    const image = await fileToImageData(file);
    features = extractFeatures(image);
  } catch {
    features = null;
  }
  onStatus?.("Matching colors on this device…");
  return rankPlate({ features, filename: file.name, hour, net: [], netInfo: null });
}

import { atwaterKcal, scalePer100 } from "./algos";
import { pactApi } from "./api-origin";
import { fetchJson } from "./http";

export const PANTRY_GROUPS = [
  "Meat",
  "Seafood",
  "Dairy",
  "Egg",
  "Plant protein",
  "Grain",
  "Produce",
  "Fruit",
  "Nut/seed",
  "Fat",
  "Condiment",
  "Beverage",
  "Snack",
  "Prepared",
  "Supplement",
] as const;

export type PantryGroup = (typeof PANTRY_GROUPS)[number];

export type PantryItem = {
  id: string;
  name: string;
  group: PantryGroup;
  aisle: string;
  aliases: string[];
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  servingG: number;
  servingLabel: string;
};

export type ScaledMacros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Recent and favorite foods kept on the device. The catalog itself lives in D1. */
export const FOOD_CACHE_MAX = 200;
const CACHE_KEY = "pact.food-cache";

type CachedFood = PantryItem & { seenAt: number };

const memory = new Map<string, CachedFood>();
let snapshot: PantryItem[] | null = null;

function isGroup(value: string): value is PantryGroup {
  return (PANTRY_GROUPS as readonly string[]).includes(value);
}

function isCached(value: unknown): value is CachedFood {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CachedFood>;
  return Boolean(
    row.id &&
      row.name &&
      typeof row.group === "string" &&
      isGroup(row.group) &&
      Array.isArray(row.aliases) &&
      typeof row.kcal100 === "number" &&
      typeof row.protein100 === "number" &&
      typeof row.carbs100 === "number" &&
      typeof row.fat100 === "number" &&
      typeof row.servingG === "number",
  );
}

function strip(row: CachedFood): PantryItem {
  return {
    id: row.id,
    name: row.name,
    group: row.group,
    aisle: row.aisle,
    aliases: row.aliases,
    kcal100: row.kcal100,
    protein100: row.protein100,
    carbs100: row.carbs100,
    fat100: row.fat100,
    servingG: row.servingG,
    servingLabel: row.servingLabel || "",
  };
}

function readRows(): CachedFood[] {
  if (typeof localStorage === "undefined") return [...memory.values()];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCached).map((row) => ({ ...row, seenAt: row.seenAt || 0, servingLabel: row.servingLabel || "" }));
  } catch {
    return [];
  }
}

function writeRows(rows: CachedFood[]) {
  snapshot = null;
  if (typeof localStorage === "undefined") {
    memory.clear();
    for (const row of rows) memory.set(row.id, row);
    return;
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
}

export function cachedFoods(): PantryItem[] {
  if (snapshot) return snapshot;
  snapshot = readRows()
    .sort((a, b) => b.seenAt - a.seenAt)
    .map(strip);
  return snapshot;
}

export function foodById(id: string): PantryItem | undefined {
  return cachedFoods().find((item) => item.id === id);
}

export function rememberFoods(items: PantryItem[], favoriteIds: string[] = []): PantryItem[] {
  const now = Date.now();
  const favorites = new Set(favoriteIds);
  const map = new Map(readRows().map((row) => [row.id, row]));
  for (const item of items) {
    if (!isCached({ ...item, seenAt: now })) continue;
    const prev = map.get(item.id);
    map.set(item.id, { ...item, seenAt: prev && favorites.has(item.id) ? Math.max(prev.seenAt, now) : now });
  }
  const ranked = [...map.values()].sort((a, b) => {
    const af = favorites.has(a.id) ? 1 : 0;
    const bf = favorites.has(b.id) ? 1 : 0;
    if (af !== bf) return bf - af;
    return b.seenAt - a.seenAt;
  });
  const next = ranked.slice(0, FOOD_CACHE_MAX);
  writeRows(next);
  return next.map(strip);
}

function haystack(item: PantryItem) {
  return [item.name, item.id.replace(/-/g, " "), ...item.aliases].map((s) => s.toLowerCase());
}

function scoreItem(item: PantryItem, q: string) {
  const needles = haystack(item);
  if (needles.some((n) => n === q)) return 1000;
  if (needles.some((n) => n.startsWith(q))) return 500 + q.length;
  if (needles.some((n) => n.includes(q))) return 100 + q.length;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => needles.some((n) => n.includes(t)))) return 40 + tokens.length;
  return 0;
}

export function searchPantry(q: string, group: PantryGroup | "All" = "All"): PantryItem[] {
  const pool = group === "All" ? cachedFoods() : cachedFoods().filter((item) => item.group === group);
  const n = q.trim().toLowerCase();
  if (!n) return pool;
  return pool
    .map((item) => ({ item, score: scoreItem(item, n) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((row) => row.item);
}

export function findPantry(name: string): PantryItem | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return searchPantry(n)[0];
}

export function scalePantry(item: PantryItem, grams: number): ScaledMacros {
  return {
    kcal: scalePer100(item.kcal100, grams),
    protein: scalePer100(item.protein100, grams),
    carbs: scalePer100(item.carbs100, grams),
    fat: scalePer100(item.fat100, grams),
  };
}

export function derivedKcal(protein: number, carbs: number, fat: number) {
  return atwaterKcal(protein, carbs, fat);
}

export async function searchFoods(
  q: string,
  group: PantryGroup | "All" = "All",
  favoriteIds: string[] = [],
): Promise<PantryItem[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (group !== "All") params.set("group", group);
  const result = await fetchJson<{ foods?: PantryItem[] }>(pactApi(`/foods?${params.toString()}`));
  if (result.ok && Array.isArray(result.data.foods)) {
    const foods = result.data.foods.filter((item) => isCached({ ...item, seenAt: 1 }));
    rememberFoods(foods, favoriteIds);
    return foods;
  }
  return searchPantry(q, group);
}

export async function hydrateFavoriteFoods(ids: string[]): Promise<PantryItem[]> {
  const missing = ids.filter((id) => !foodById(id)).slice(0, 40);
  if (!missing.length) return cachedFoods();
  const params = new URLSearchParams({ ids: missing.join(",") });
  const result = await fetchJson<{ foods?: PantryItem[] }>(pactApi(`/foods?${params.toString()}`));
  if (result.ok && Array.isArray(result.data.foods)) rememberFoods(result.data.foods, ids);
  return cachedFoods();
}

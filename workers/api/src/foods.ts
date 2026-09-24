import { PANTRY, type PantryGroup, type PantryItem } from "./pantry-data";

export type FoodDb = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
  batch(statements: unknown[]): Promise<unknown>;
};

type FoodRow = {
  id: string;
  name: string;
  grp: string;
  aliases: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  serving_g: number;
  serving_label: string;
  aisle: string;
};

const INSERT = `INSERT OR IGNORE INTO foods
  (id, name, grp, aliases, kcal100, protein100, carbs100, fat100, serving_g, serving_label, aisle)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

export function rowToFood(row: FoodRow): PantryItem {
  return {
    id: row.id,
    name: row.name,
    group: row.grp as PantryGroup,
    aisle: row.aisle,
    aliases: row.aliases ? row.aliases.split(";").filter(Boolean) : [],
    kcal100: row.kcal100,
    protein100: row.protein100,
    carbs100: row.carbs100,
    fat100: row.fat100,
    servingG: row.serving_g,
    servingLabel: row.serving_label,
  };
}

export async function ensureFoods(db: FoodDb) {
  const count = await db.prepare("SELECT COUNT(*) AS n FROM foods").bind().first<{ n: number }>();
  if ((count?.n ?? 0) >= PANTRY.length) return;
  const chunk = 50;
  for (let i = 0; i < PANTRY.length; i += chunk) {
    const statements = PANTRY.slice(i, i + chunk).map((item) =>
      db.prepare(INSERT).bind(
        item.id,
        item.name,
        item.group,
        item.aliases.join(";"),
        item.kcal100,
        item.protein100,
        item.carbs100,
        item.fat100,
        item.servingG,
        item.servingLabel,
        item.aisle,
      ),
    );
    await db.batch(statements);
  }
}

export async function queryFoods(db: FoodDb, input: { q?: string; group?: string; ids?: string[] }): Promise<PantryItem[]> {
  await ensureFoods(db);
  const ids = (input.ids ?? []).map((id) => id.trim()).filter(Boolean).slice(0, 40);
  if (ids.length) {
    const marks = ids.map(() => "?").join(", ");
    const listed = await db
      .prepare(
        `SELECT id, name, grp, aliases, kcal100, protein100, carbs100, fat100, serving_g, serving_label, aisle
         FROM foods WHERE id IN (${marks})`,
      )
      .bind(...ids)
      .all<FoodRow>();
    return listed.results.map(rowToFood);
  }
  const q = (input.q ?? "").trim().toLowerCase();
  const group = (input.group ?? "").trim();
  if (!q) {
    const listed = await db
      .prepare(
        `SELECT id, name, grp, aliases, kcal100, protein100, carbs100, fat100, serving_g, serving_label, aisle
         FROM foods WHERE (? = '' OR grp = ?) ORDER BY name LIMIT 40`,
      )
      .bind(group, group)
      .all<FoodRow>();
    return listed.results.map(rowToFood);
  }
  const listed = await db
    .prepare(
      `SELECT id, name, grp, aliases, kcal100, protein100, carbs100, fat100, serving_g, serving_label, aisle
       FROM foods
       WHERE (? = '' OR grp = ?)
         AND (instr(lower(name), ?) > 0 OR instr(lower(aliases), ?) > 0 OR instr(lower(id), ?) > 0)
       LIMIT 80`,
    )
    .bind(group, group, q, q, q)
    .all<FoodRow>();
  return listed.results
    .map(rowToFood)
    .sort((a, b) => score(b, q) - score(a, q) || a.name.localeCompare(b.name))
    .slice(0, 40);
}

function score(item: PantryItem, q: string) {
  const needles = [item.name, item.id.replace(/-/g, " "), ...item.aliases].map((part) => part.toLowerCase());
  if (needles.some((n) => n === q)) return 1000;
  if (needles.some((n) => n.startsWith(q))) return 500;
  if (needles.some((n) => n.includes(q))) return 100;
  return 1;
}

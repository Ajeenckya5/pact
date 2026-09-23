export type OffFood = {
  code: string;
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
};

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Open Food Facts v2 product payload. Returns null when the name is missing. */
export function foodFromOffPayload(data: unknown): OffFood | null {
  if (!data || typeof data !== "object") return null;
  const root = data as { product?: Record<string, unknown> };
  const product = root.product ?? (data as Record<string, unknown>);
  const name = String(product.product_name || product.product_name_en || "").trim();
  if (!name) return null;
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  return {
    code: String(product.code ?? ""),
    name,
    kcal100: Math.round(num(nutriments["energy-kcal_100g"])),
    protein100: Math.round(num(nutriments.proteins_100g)),
    carbs100: Math.round(num(nutriments.carbohydrates_100g)),
    fat100: Math.round(num(nutriments.fat_100g)),
  };
}

export function portionOf(food: OffFood, grams: number) {
  const scale = Math.max(0, grams) / 100;
  return {
    grams,
    kcal: Math.round(food.kcal100 * scale),
    protein: Math.round(food.protein100 * scale),
    carbs: Math.round(food.carbs100 * scale),
    fat: Math.round(food.fat100 * scale),
  };
}

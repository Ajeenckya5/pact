import { jsonErr, jsonOk } from "@/app/api/_util";
import { fetchRecipeCatalog, fetchRecipes, fetchRecipesSearch } from "@/lib/free-apis";
import { pactRecipesToKitchen, type KitchenRecipe } from "@/lib/kitchen";

export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const catalog = url.searchParams.get("catalog") === "1" || url.searchParams.get("all") === "1";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const ingredient = url.searchParams.get("ingredient")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";

  try {
    if (catalog || id) {
      const dump = await fetchRecipeCatalog();
      let recipes = dump.recipes;
      if (id) recipes = recipes.filter((r) => r.id === id);
      if (q) recipes = filterKitchen(recipes, q);
      if (ingredient) recipes = filterKitchen(recipes, ingredient);
      return jsonOk(
        { recipes, count: recipes.length, live: dump.live, cached: dump.cached, source: "themealdb+pact" },
        dump.cached ? 3600 : 120,
      );
    }

    if (q) {
      const recipes = await fetchRecipesSearch(q);
      return jsonOk({ recipes, count: recipes.length, source: "themealdb" }, 300);
    }

    const live = await fetchRecipes(ingredient || "chicken");
    return jsonOk({ recipes: live, source: "themealdb" }, 300);
  } catch (err) {
    if (catalog) {
      const recipes = pactRecipesToKitchen();
      return jsonOk({ recipes, count: recipes.length, live: 0, cached: false, source: "pact", error: err instanceof Error ? err.message : "themealdb unavailable" }, 60);
    }
    return jsonErr(err instanceof Error ? err.message : "recipes unavailable");
  }
}

function filterKitchen(recipes: KitchenRecipe[], needle: string) {
  const n = needle.toLowerCase();
  return recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(n) ||
      r.category.toLowerCase().includes(n) ||
      r.area.toLowerCase().includes(n) ||
      r.lines.some((l) => l.name.toLowerCase().includes(n)),
  );
}

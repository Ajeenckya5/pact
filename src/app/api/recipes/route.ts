import { jsonOk } from "@/app/api/_util";
import { fetchRecipeCatalog } from "@/lib/free-apis";
import type { KitchenRecipe } from "@/lib/kitchen";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const ingredient = url.searchParams.get("ingredient")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";
  const dump = await fetchRecipeCatalog();
  let recipes = dump.recipes;
  if (id) recipes = recipes.filter((recipe) => recipe.id === id);
  if (q) recipes = filterKitchen(recipes, q);
  if (ingredient) recipes = filterKitchen(recipes, ingredient);
  return jsonOk({ recipes, count: recipes.length, live: 0, cached: true, source: "pact" }, 3600);
}

function filterKitchen(recipes: KitchenRecipe[], needle: string) {
  const n = needle.toLowerCase();
  return recipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(n) ||
      recipe.category.toLowerCase().includes(n) ||
      recipe.area.toLowerCase().includes(n) ||
      recipe.lines.some((line) => line.name.toLowerCase().includes(n)),
  );
}

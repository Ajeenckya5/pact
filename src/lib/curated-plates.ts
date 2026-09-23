import { finalizeRecipe, makeLine, type KitchenRecipe } from "./kitchen";
import { PANTRY_BY_ID } from "./pantry";

type Part = { id: string; grams: number; label: string; area?: string };

const PROTEINS: Part[] = [
  { id: "chicken", grams: 170, label: "Chicken", area: "Home" },
  { id: "salmon", grams: 160, label: "Salmon", area: "Coast" },
  { id: "turkey-breast", grams: 170, label: "Turkey", area: "Home" },
  { id: "tofu", grams: 180, label: "Tofu", area: "Plant" },
  { id: "shrimp", grams: 150, label: "Shrimp", area: "Coast" },
  { id: "eggs", grams: 120, label: "Eggs", area: "Breakfast" },
  { id: "greek-yogurt-2", grams: 200, label: "Yogurt", area: "Breakfast" },
  { id: "lentils", grams: 180, label: "Lentils", area: "Plant" },
  { id: "paneer", grams: 120, label: "Paneer", area: "Home" },
  { id: "canned-tuna", grams: 120, label: "Tuna", area: "Coast" },
];

const BASES: Part[] = [
  { id: "rice", grams: 160, label: "rice" },
  { id: "quinoa", grams: 150, label: "quinoa" },
  { id: "oats", grams: 60, label: "oats" },
  { id: "sweet-potato", grams: 180, label: "sweet potato" },
  { id: "brown-rice", grams: 160, label: "brown rice" },
];

const SIDES: Part[] = [
  { id: "broccoli", grams: 120, label: "broccoli" },
  { id: "spinach", grams: 80, label: "spinach" },
  { id: "kale", grams: 80, label: "kale" },
  { id: "edamame", grams: 100, label: "edamame" },
];

function line(part: Part, index: number) {
  const item = PANTRY_BY_ID[part.id];
  if (!item) throw new Error(`missing pantry food ${part.id}`);
  return makeLine(item.name, `${part.grams}g`, index);
}

/** Plates whose macros are scaled from the bundled pantry. No outside recipe API. */
export function curatedPlates(): KitchenRecipe[] {
  const plates: KitchenRecipe[] = [];
  for (const protein of PROTEINS) {
    for (const base of BASES) {
      for (const side of SIDES) {
        const food = PANTRY_BY_ID[protein.id];
        const baseFood = PANTRY_BY_ID[base.id];
        const sideFood = PANTRY_BY_ID[side.id];
        plates.push(
          finalizeRecipe({
            id: `plate-${protein.id}-${base.id}-${side.id}`,
            name: `${protein.label} with ${base.label} and ${side.label}`,
            photo: "",
            category: "Pact",
            area: protein.area ?? "Home",
            steps: [
              `Cook ${food.name.toLowerCase()} (${protein.grams} g).`,
              `Add ${baseFood.name.toLowerCase()} (${base.grams} g) and ${sideFood.name.toLowerCase()} (${side.grams} g).`,
            ],
            source: "pact",
            lines: [line(protein, 1), line(base, 2), line(side, 3)],
          }),
        );
        if (plates.length >= 150) return plates;
      }
    }
  }
  return plates;
}

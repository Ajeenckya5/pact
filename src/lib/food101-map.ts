/**
 * Vision labels → Pact pantry ids.
 * CLIP/SigLIP return pantry names or Food-101-style dish names.
 */
import { findPantry, PANTRY } from "./pantry";

export type FoodNetHit = {
  label: string;
  score: number;
};

export type FoodNetInfo = {
  id: string;
  dataset: string;
};

export const FOOD101_PANTRY: Record<string, string> = {
  apple_pie: "cake",
  baby_back_ribs: "pork-chop",
  baklava: "cake",
  beef_carpaccio: "steak",
  beef_tartare: "steak",
  beet_salad: "greek-salad",
  beignets: "doughnut",
  bibimbap: "fried-rice",
  bread_pudding: "cake",
  breakfast_burrito: "burrito",
  bruschetta: "bread",
  caesar_salad: "caesar-salad",
  cannoli: "cake",
  caprese_salad: "greek-salad",
  carrot_cake: "cake",
  ceviche: "shrimp",
  cheesecake: "cake",
  cheese_plate: "cheddar",
  chicken_curry: "chicken-tikka",
  chicken_quesadilla: "taco",
  chicken_wings: "chicken-wing",
  chocolate_cake: "cake",
  chocolate_mousse: "cake",
  churros: "doughnut",
  clam_chowder: "tomato-soup",
  club_sandwich: "sandwich",
  crab_cakes: "crab",
  creme_brulee: "ice-cream",
  croque_madame: "sandwich",
  cup_cakes: "cake",
  deviled_eggs: "eggs",
  donuts: "doughnut",
  dumplings: "dumpling",
  edamame: "edamame",
  eggs_benedict: "eggs",
  escargots: "mussels",
  falafel: "falafel",
  filet_mignon: "filet-mignon",
  fish_and_chips: "cod",
  foie_gras: "duck-breast",
  french_fries: "fries",
  french_onion_soup: "tomato-soup",
  french_toast: "bread",
  fried_calamari: "calamari",
  fried_rice: "fried-rice",
  frozen_yogurt: "yogurt",
  garlic_bread: "bread",
  gnocchi: "gnocchi",
  greek_salad: "greek-salad",
  grilled_cheese_sandwich: "sandwich",
  grilled_salmon: "salmon",
  guacamole: "guacamole",
  gyoza: "dumpling",
  hamburger: "burger",
  hot_and_sour_soup: "pho",
  hot_dog: "hot-dog",
  huevos_rancheros: "eggs",
  hummus: "hummus",
  ice_cream: "ice-cream",
  lasagna: "pasta",
  lobster_bisque: "lobster",
  lobster_roll_sandwich: "lobster",
  macaroni_and_cheese: "mac-cheese",
  macarons: "cookie",
  miso_soup: "pho",
  mussels: "mussels",
  nachos: "tortilla-chips",
  omelette: "eggs",
  onion_rings: "fries",
  oysters: "oysters",
  pad_thai: "pad-thai",
  paella: "fried-rice",
  pancakes: "pancake",
  panna_cotta: "yogurt",
  peking_duck: "duck-breast",
  pho: "pho",
  pizza: "pizza-slice",
  pork_chop: "pork-chop",
  poutine: "fries",
  prime_rib: "ribeye",
  pulled_pork_sandwich: "sandwich",
  ramen: "cup-ramen",
  ravioli: "pasta",
  red_velvet_cake: "cake",
  risotto: "rice",
  samosa: "falafel",
  sashimi: "sushi-roll",
  scallops: "scallops",
  seaweed_salad: "greek-salad",
  shrimp_and_grits: "shrimp",
  spaghetti_bolognese: "pasta",
  spaghetti_carbonara: "pasta",
  spring_rolls: "dumpling",
  steak: "steak",
  strawberry_shortcake: "cake",
  sushi: "sushi-roll",
  tacos: "taco",
  takoyaki: "dumpling",
  tiramisu: "cake",
  tuna_tartare: "tuna-steak",
  waffles: "waffle",
};

export function food101Key(label: string) {
  return label.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function humanizeFood101(label: string) {
  return food101Key(label)
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function pantryIdForFood101(label: string): string | undefined {
  return FOOD101_PANTRY[food101Key(label)];
}

export function pantryIdForVisionLabel(label: string): string | undefined {
  return pantryIdForFood101(label) ?? findPantry(label)?.id ?? findPantry(humanizeFood101(label))?.id;
}

export function displayFoodLabel(label: string) {
  const id = pantryIdForVisionLabel(label);
  if (id) {
    const item = PANTRY.find((p) => p.id === id);
    if (item) return item.name;
  }
  return humanizeFood101(label);
}

/** CLIP candidate names: pantry rows plus well-known dish titles. */
export function foodCandidateLabels(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const label = raw.trim();
    if (label.length < 2) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };
  for (const item of PANTRY) add(item.name);
  for (const key of Object.keys(FOOD101_PANTRY)) add(humanizeFood101(key));
  return out;
}

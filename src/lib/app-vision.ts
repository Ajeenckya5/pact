/**
 * Photo scan stays on the device and uses the color matcher.
 */
import { LIBRARY } from "./catalog";
import { INGREDIENTS } from "./data";
import type { Workout } from "./types";
import type { FoodNetHit, FoodNetInfo } from "./food101-map";
import { analyzePlateImage, type PlateScan } from "./plate-vision";
import type { MealLog } from "./types";

export type AppPhotoKind = "food" | "grocery" | "workout" | "place-gym" | "place-grocery" | "other";

export type AppWorkoutHit = {
  id: string;
  name: string;
  href: string;
  score: number;
};

export type AppPhotoScan = {
  kind: AppPhotoKind;
  caption: string;
  confidence: number;
  scene: FoodNetHit[];
  food: PlateScan | null;
  workout: AppWorkoutHit[] | null;
  netModel: FoodNetInfo | null;
  proof: string[];
};

export const SCENE_LABELS = [
  "a plated meal of cooked food",
  "groceries produce or packaged food in a kitchen",
  "weightlifting a gym machine or an exercise",
  "running cycling or cardio training",
  "the exterior of a gym or fitness studio",
  "a supermarket or grocery store building",
  "something that is not food exercise or a shop",
] as const;

export function kindFromScene(label: string, score: number): AppPhotoKind {
  if (score < 0.18) return "other";
  const l = label.toLowerCase();
  if (l.includes("supermarket") || l.includes("grocery store building")) return "place-grocery";
  if (l.includes("exterior of a gym") || l.includes("fitness studio")) return "place-gym";
  if (
    l.includes("weight") ||
    l.includes("exercise") ||
    l.includes("running") ||
    l.includes("cardio") ||
    l.includes("machine")
  ) {
    return "workout";
  }
  if (l.includes("produce") || l.includes("packaged") || l.includes("groceries")) return "grocery";
  if (l.includes("meal") || l.includes("cooked food") || l.includes("food")) return "food";
  return "other";
}

export function workoutCandidateLabels(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of LIBRARY) {
    const title = w.title.trim();
    if (title.length < 3) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

export function workoutForLabel(label: string): Workout | undefined {
  const n = label.trim().toLowerCase();
  if (!n) return undefined;
  return (
    LIBRARY.find((w) => w.title.toLowerCase() === n) ??
    LIBRARY.find((w) => w.title.toLowerCase().includes(n) || n.includes(w.title.toLowerCase()))
  );
}

export function marketIdForPantry(pantryId: string | undefined): string | undefined {
  if (!pantryId) return undefined;
  return INGREDIENTS.some((i) => i.id === pantryId) ? pantryId : undefined;
}

export function mealFromPhoto(scan: AppPhotoScan, photo?: string): Omit<MealLog, "id" | "at"> | null {
  const top = scan.food?.top ?? scan.food?.ranked[0];
  if (!top) return null;
  return {
    foodId: top.foodId ?? top.pantryId ?? top.id,
    name: `${top.name} (${top.grams}g)`,
    kcal: top.kcal,
    protein: top.protein,
    carbs: top.carbs,
    fat: top.fat,
    source: "ai",
    photo,
  };
}

export async function identifyPhoto(
  file: File,
  onStatus?: (msg: string) => void,
): Promise<AppPhotoScan> {
  const name = file.name.toLowerCase();
  if (/gym|barbell|dumbbell|rack/.test(name)) {
    return {
      kind: "place-gym",
      caption: "Gym",
      confidence: 0.4,
      scene: [],
      food: null,
      workout: null,
      netModel: null,
      proof: ["Filename looks like a gym. The photo stayed on this device."],
    };
  }
  if (/grocery|market|store/.test(name)) {
    return {
      kind: "place-grocery",
      caption: "Grocery store",
      confidence: 0.4,
      scene: [],
      food: null,
      workout: null,
      netModel: null,
      proof: ["Filename looks like a grocery. The photo stayed on this device."],
    };
  }
  onStatus?.("Reading the photo on this device…");
  const food = await analyzePlateImage(file, new Date().getHours(), onStatus);
  const scan = packFood("food", [], food, null);
  return { ...scan, confidence: food.top?.softmax ?? food.ranked[0]?.softmax ?? 0 };
}

function packFood(
  kind: "food" | "grocery",
  scene: FoodNetHit[],
  food: PlateScan,
  netModel: FoodNetInfo | null,
): AppPhotoScan {
  const top = food.top ?? food.ranked[0];
  return {
    kind,
    caption: top?.name ?? "Food",
    confidence: food.netLabels[0]?.score ?? 0,
    scene,
    food,
    workout: null,
    netModel,
    proof: [
      `scene “${scene[0]?.label ?? "?"}” p=${((scene[0]?.score ?? 0) * 100).toFixed(0)}%`,
      ...food.proof,
    ],
  };
}

/**
 * App-wide on-device CLIP: same LAION-2B model as Calories, routed to food,
 * grocery, lifts, or gym/store fronts. Photo stays on the device.
 */
import { LIBRARY } from "./catalog";
import { INGREDIENTS } from "./data";
import type { Workout } from "./types";
import type { FoodNetHit, FoodNetInfo } from "./food101-map";
import { rankPlate, type PlateScan } from "./plate-vision";
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
  onStatus?.("Loading CLIP (LAION-2B)…");
  const { classifyPlate, classifyZeroShot, foodNetInfo } = await import("./plate-net");
  onStatus?.("What's in the photo…");
  const scene = await classifyZeroShot(file, [...SCENE_LABELS], 5);
  const kind = kindFromScene(scene[0]?.label ?? "", scene[0]?.score ?? 0);
  const netModel = foodNetInfo();
  const hour = new Date().getHours();

  if (kind === "other") {
    onStatus?.("Checking the pantry anyway…");
    const net = await classifyPlate(file);
    if ((net[0]?.score ?? 0) >= 0.12) {
      const food = rankPlate({ filename: file.name, hour, net, netInfo: netModel });
      return packFood("food", scene, food, netModel);
    }
  }

  if (kind === "food" || kind === "grocery") {
    onStatus?.("Matching the pantry…");
    const net = await classifyPlate(file);
    const food = rankPlate({ filename: file.name, hour, net, netInfo: netModel });
    return packFood(kind, scene, food, netModel);
  }

  if (kind === "workout") {
    onStatus?.("Matching the lift library…");
    const hits = await classifyZeroShot(file, workoutCandidateLabels(), 5);
    const workout = hits
      .map((h) => {
        const w = workoutForLabel(h.label);
        if (!w) return null;
        return { id: w.id, name: w.title, href: `/workouts/${w.id}`, score: h.score };
      })
      .filter((row): row is AppWorkoutHit => Boolean(row));
    const top = workout[0];
    return {
      kind: "workout",
      caption: top?.name ?? hits[0]?.label ?? "Workout",
      confidence: hits[0]?.score ?? 0,
      scene,
      food: null,
      workout,
      netModel,
      proof: [
        `engine = CLIP ViT-B/32 · ${netModel?.dataset ?? "LAION-2B"}`,
        `scene “${scene[0]?.label ?? "?"}” p=${((scene[0]?.score ?? 0) * 100).toFixed(0)}%`,
        ...hits.slice(0, 4).map((h) => `  ${h.label} ${(h.score * 100).toFixed(0)}%`),
      ],
    };
  }

  const placeCaption = kind === "place-gym" ? "Gym" : kind === "place-grocery" ? "Grocery store" : "Photo";
  return {
    kind,
    caption: placeCaption,
    confidence: scene[0]?.score ?? 0,
    scene,
    food: null,
    workout: null,
    netModel,
    proof: [
      `engine = CLIP ViT-B/32 · ${netModel?.dataset ?? "LAION-2B"}`,
      `scene “${scene[0]?.label ?? "?"}” p=${((scene[0]?.score ?? 0) * 100).toFixed(0)}%`,
    ],
  };
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

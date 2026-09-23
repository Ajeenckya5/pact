/**
 * On-device food recognition via CLIP ViT-B/32 trained on LAION-2B
 * (2 billion image–text pairs — the largest open CLIP dataset with a
 * transformers.js ONNX build). Zero-shot against Pact pantry names, not a
 * 101-dish softmax. Food2K (2,000 food classes) has no public browser ONNX.
 * Photo stays on the device. First run caches a quantized graph.
 */
import { foodCandidateLabels, type FoodNetHit, type FoodNetInfo } from "./food101-map";

export const FOOD_CLIP_MODELS: FoodNetInfo[] = [
  {
    id: "onnx-community/CLIP-ViT-B-32-laion2B-s34B-b79K-ONNX",
    dataset: "LAION-2B (2 billion image–text pairs)",
  },
  {
    id: "Xenova/siglip-base-patch16-224",
    dataset: "Google SigLIP / WebLI",
  },
  {
    id: "Xenova/clip-vit-base-patch32",
    dataset: "OpenAI CLIP WIT-400M",
  },
];

export const FOOD_CLIP_MODEL = FOOD_CLIP_MODELS[0].id;
export const HYPOTHESIS = "a close-up photo of {}";

type ZeroShot = (
  input: Blob | File | string,
  labels: string[],
  opts?: { hypothesis_template?: string },
) => Promise<Array<{ label: string; score: number }>>;

let clf: ZeroShot | null = null;
let loaded: FoodNetInfo | null = null;
let loading: Promise<ZeroShot> | null = null;
let labels: string[] | null = null;

export function foodNetReady() {
  return Boolean(clf);
}

export function foodNetInfo(): FoodNetInfo | null {
  return loaded;
}

export function foodNetLabels() {
  return labels ?? foodCandidateLabels();
}

export const CLIP_DOWNLOAD_MB = 150;

type NetworkInfo = { effectiveType?: string; saveData?: boolean };

export function clipNeedsConsent() {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType !== "wifi" && connection.effectiveType != null;
}

export function clipAllowed() {
  try {
    return localStorage.getItem("pact.clip.ok") === "yes";
  } catch {
    return false;
  }
}

export function allowClipDownload() {
  localStorage.setItem("pact.clip.ok", "yes");
}

export async function preloadFoodNet() {
  if (!clipAllowed()) throw new Error("CLIP download needs a yes on this connection");
  await getClassifier();
}

async function getClassifier(): Promise<ZeroShot> {
  if (clf) return clf;
  if (loading) return loading;
  loading = (async () => {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.useBrowserCache = typeof window !== "undefined";
    let lastErr: unknown;
    for (const model of FOOD_CLIP_MODELS) {
      try {
        const pipe = await pipeline("zero-shot-image-classification", model.id, {
          dtype: "q8",
        });
        clf = pipe as unknown as ZeroShot;
        loaded = model;
        labels = foodCandidateLabels();
        return clf;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error("CLIP failed to load");
  })();
  try {
    return await loading;
  } catch (err) {
    loading = null;
    loaded = null;
    throw err;
  }
}

function asHits(raw: unknown): FoodNetHit[] {
  const rows = Array.isArray(raw) ? raw : [raw];
  const first = rows[0];
  const list = Array.isArray(first) ? first : rows;
  return list
    .map((r) => {
      const row = r as { label?: string; score?: number };
      return {
        label: String(row.label ?? ""),
        score: Number(row.score ?? 0),
      };
    })
    .filter((r) => r.label && Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score);
}

export async function classifyPlate(file: File, topk = 8): Promise<FoodNetHit[]> {
  return classifyZeroShot(file, labels ?? foodCandidateLabels(), topk);
}

export async function classifyZeroShot(
  file: File,
  candidates: string[],
  topk = 8,
  hypothesis = HYPOTHESIS,
): Promise<FoodNetHit[]> {
  if (!candidates.length) return [];
  const net = await getClassifier();
  const raw = await net(file, candidates, { hypothesis_template: hypothesis });
  return asHits(raw).slice(0, topk);
}

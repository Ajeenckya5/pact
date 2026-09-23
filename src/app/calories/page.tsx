"use client";

import { Button, Card, Chip, Eyebrow, Field, Progress } from "@/components/ui";
import { FOODS } from "@/lib/data";
import type { LiveFood } from "@/lib/free-apis";
import { clock, fmt } from "@/lib/format";
import {
  derivedKcal,
  PANTRY,
  PANTRY_GROUPS,
  scalePantry,
  searchPantry,
  type PantryGroup,
  type PantryItem,
} from "@/lib/pantry";
import { copyText, remainingMacros } from "@/lib/experience";
import {
  analyzePlateImage,
  rescaleCandidate,
  type PlateScan,
} from "@/lib/plate-vision";
import { mealTotals, useGoal, usePact } from "@/lib/store";
import type { CustomFood, Food } from "@/lib/types";
import { clientFoods } from "@/lib/live-client";
import { Camera, Copy, Sparkles, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const GROUPS: Array<PantryGroup | "All"> = ["All", ...PANTRY_GROUPS];

export default function CaloriesPage() {
  const store = usePact();
  const goal = useGoal();
  const totals = mealTotals(store.meals);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState<PlateScan | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [scanGrams, setScanGrams] = useState("180");
  const [scanError, setScanError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<PantryGroup | "All">("All");
  const [portion, setPortion] = useState("");
  const [liveFoods, setLiveFoods] = useState<LiveFood[]>([]);
  const [liveFor, setLiveFor] = useState("");
  const [liveState, setLiveState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [customName, setCustomName] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [saveCustom, setSaveCustom] = useState(true);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      setLiveState("loading");
      setLiveFoods([]);
      setLiveFor(q);
      clientFoods(q)
        .then((d) => {
          setLiveFoods(d.foods ?? []);
          setLiveState("ok");
        })
        .catch(() => setLiveState("error"));
    }, 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const q = query.trim();
  const shownLive = q.length >= 2 && liveFor === q ? liveFoods : [];

  const pantryHits = useMemo(() => {
    const hits = searchPantry(q, group);
    if (q) return hits.slice(0, 40);
    if (group !== "All") return hits;
    return [];
  }, [q, group]);

  const plateHits = useMemo(() => {
    if (!q) return FOODS;
    const n = q.toLowerCase();
    return FOODS.filter(
      (f) =>
        f.name.toLowerCase().includes(n) ||
        f.keywords.some((k) => k.includes(n)) ||
        f.ingredients.some((i) => i.includes(n)),
    );
  }, [q]);

  const customHits = useMemo(() => {
    if (!q) return store.customFoods;
    const n = q.toLowerCase();
    return store.customFoods.filter((f) => f.name.toLowerCase().includes(n));
  }, [q, store.customFoods]);

  const searching = q.length >= 2;
  const noHits =
    searching &&
    liveFor === q &&
    liveState !== "loading" &&
    pantryHits.length === 0 &&
    plateHits.length === 0 &&
    customHits.length === 0 &&
    shownLive.length === 0;

  async function onFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setScanning(true);
    setScanPhase("Starting CLIP…");
    setScan(null);
    setScanError(null);
    try {
      const next = await analyzePlateImage(file, new Date().getHours(), setScanPhase);
      setScan(next);
      const first = next.top ?? next.ranked[0];
      setPickedId(first?.id ?? null);
      setScanGrams(String(first?.grams ?? 180));
    } catch {
      setScanError("Could not read that photo. Log from the pantry instead.");
    } finally {
      setScanning(false);
      setScanPhase(null);
    }
  }

  const picked = scan?.ranked.find((r) => r.id === pickedId) ?? scan?.ranked[0] ?? null;
  const gramN = Number(scanGrams);
  const drafted = picked ? rescaleCandidate(picked, Number.isFinite(gramN) && gramN > 0 ? gramN : picked.grams) : null;

  function confirmScan() {
    if (!drafted) return;
    store.addMeal({
      foodId: drafted.foodId ?? drafted.pantryId ?? drafted.id,
      name: `${drafted.name} (${drafted.grams}g)`,
      kcal: drafted.kcal,
      protein: drafted.protein,
      carbs: drafted.carbs,
      fat: drafted.fat,
      source: "ai",
      photo: preview ?? undefined,
    });
    setScan(null);
    setPickedId(null);
  }

  function gramsFor(item: PantryItem) {
    const n = Number(portion);
    return Number.isFinite(n) && n > 0 ? n : item.servingG;
  }

  function logPantry(item: PantryItem) {
    const grams = gramsFor(item);
    const macros = scalePantry(item, grams);
    store.addMeal({
      foodId: item.id,
      name: `${item.name} (${grams}g)`,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      source: "manual",
    });
  }

  function logPlate(food: Food) {
    setPreview(food.photo);
    store.addMeal({
      foodId: food.id,
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: "manual",
      photo: food.photo,
    });
  }

  function logLive(food: LiveFood) {
    store.addMeal({
      foodId: food.id,
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: "manual",
      photo: food.photo,
    });
  }

  function logSaved(food: CustomFood) {
    store.addMeal({
      foodId: food.id,
      name: food.name,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      source: "manual",
    });
  }

  function logCustom() {
    const name = customName.trim() || q || "Custom food";
    const protein = Number(customProtein) || 0;
    const carbs = Number(customCarbs) || 0;
    const fat = Number(customFat) || 0;
    const typedKcal = Number(customKcal);
    const kcal = Number.isFinite(typedKcal) && typedKcal > 0 ? Math.round(typedKcal) : derivedKcal(protein, carbs, fat);
    if (!name || (kcal <= 0 && protein + carbs + fat <= 0)) return;
    const grams = Number(portion);
    const label = Number.isFinite(grams) && grams > 0 ? `${name} (${grams}g)` : name;
    store.addMeal({
      foodId: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name: label,
      kcal,
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      source: "manual",
    });
    if (saveCustom) {
      store.saveCustomFood({
        name,
        kcal,
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        servingG: Number.isFinite(grams) && grams > 0 ? grams : undefined,
      });
    }
    setCustomName("");
    setCustomKcal("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
  }

  const customReady = Boolean(
    (customName.trim() || q) &&
      ((Number(customKcal) > 0) || Number(customProtein) + Number(customCarbs) + Number(customFat) > 0),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>AI calorie tracking</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Photograph the plate. Argue the macros later.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            {PANTRY.length} pantry ingredients, Open Food Facts for packaged food, and CLIP ViT-B/32 (LAION-2B) on this
            device — the same model runs on Overview, Community, Chat, Workouts, Recipes, Market, and Places. You confirm
            before anything is logged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/recipes" className="inline-flex items-center rounded-full bg-white/5 px-4 py-2 text-sm text-cream hover:bg-white/10">
            Recipe kitchen
          </Link>
          {store.meals[0] ? (
            <>
              <Button tone="ghost" onClick={() => store.repeatLastMeal()}>
                Repeat last
              </Button>
              <Button tone="quiet" onClick={() => store.undoLastMeal()}>
                Undo last
              </Button>
            </>
          ) : null}
          <Button onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Scan a meal
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Macro label="Calories" value={totals.kcal} max={goal.kcal} tone="acid" />
        <Macro label="Protein" value={totals.protein} max={goal.protein} suffix="g" tone="heat" />
        <Macro label="Carbs" value={totals.carbs} max={goal.carbs} suffix="g" tone="gold" />
        <Macro label="Fat" value={totals.fat} max={goal.fat} suffix="g" tone="violet" />
      </div>

      <RemainingBanner protein={remainingMacros(totals, goal).protein} kcal={remainingMacros(totals, goal).kcal} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-acid" />
            <Eyebrow>Vision scan</Eyebrow>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-ink">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Meal preview" className="h-64 w-full object-cover" />
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-64 w-full flex-col items-center justify-center gap-2 text-mute"
              >
                <Camera className="h-8 w-8" />
                Drop a photo or open camera
              </button>
            )}
          </div>
          {scanning ? <p className="mt-3 text-sm text-acid">{scanPhase ?? "Classifying plate…"}</p> : null}
          {scanError ? <p className="mt-3 text-sm text-heat">{scanError}</p> : null}
          {scan && drafted ? (
            <div className="mt-4 space-y-3">
              {scan.unsure ? (
                <p className="text-sm text-gold">
                  {scan.engine === "clip"
                    ? "CLIP is not sure enough to auto-pick. Choose a dish below or search the pantry."
                    : "Vision model did not load. Color fallback is weak — pick from the pantry."}
                </p>
              ) : (
                <p className="text-sm text-cream">
                  {drafted.name} · {Math.round(drafted.softmax * 100)}% · {drafted.kcal} kcal for {drafted.grams}g
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-mute">
                    {scan.engine === "clip"
                      ? scan.netModel?.dataset
                        ? `CLIP · ${scan.netModel.dataset.split(" (")[0]}`
                        : "CLIP LAION-2B"
                      : "HSV fallback"}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {scan.ranked.map((c) => (
                  <Chip key={c.id} active={c.id === drafted.id} onClick={() => setPickedId(c.id)}>
                    {c.name} · {Math.round(c.softmax * 100)}%
                  </Chip>
                ))}
              </div>
              <Field
                type="number"
                min={20}
                max={800}
                inputMode="decimal"
                label="Portion grams"
                placeholder="Portion grams"
                value={scanGrams}
                onChange={(e) => setScanGrams(e.target.value)}
              />
              <p className="font-mono text-xs text-mute">
                P{drafted.protein} C{drafted.carbs} F{drafted.fat} · Atwater {drafted.atwaterKcal} kcal (4P+4C+9F)
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={confirmScan}>
                  Log this plate
                </Button>
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() => {
                    setScan(null);
                    setPickedId(null);
                  }}
                >
                  Discard
                </Button>
              </div>
              <details className="rounded-2xl border border-line bg-ink/60 p-3">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-mute">Proof</summary>
                <ul className="mt-2 space-y-1 text-xs text-mute">
                  {scan.proof.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  {drafted.why.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            </div>
          ) : (
            <p className="mt-4 text-xs text-mute">
              The first photo scan downloads a 150 MB model on Wi-Fi and keeps it on this device. On cellular, Pact asks
              before that download. Nothing is logged until you confirm a portion.
            </p>
          )}
          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-mute">Common plates</p>
            <div className="flex flex-wrap gap-2">
              {FOODS.map((f) => (
                <Chip key={f.id} onClick={() => logPlate(f)}>
                  {f.name}
                </Chip>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-7">
          <Field
            label="Food search"
            placeholder="Chicken, quinoa, gochujang…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                {g}
                {g === "All" ? ` · ${PANTRY.length}` : ""}
              </Chip>
            ))}
          </div>
          <Field
            type="number"
            min={1}
            max={2000}
            inputMode="decimal"
            label="Portion grams"
            placeholder="Blank uses the listed serving"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
          />

          {!q && group === "All" ? (
            <Card className="p-5">
              <p className="text-sm text-mute">
                Pick a group or type a name. The pantry covers meats, seafood, dairy, grains, produce, fruit, nuts,
                oils, condiments, drinks, prepared plates, and powders — {PANTRY.length} foods, macros per 100g.
              </p>
            </Card>
          ) : null}

          {!q && store.favoriteFoods.length > 0 ? (
            <Card className="divide-y divide-line">
              <p className="px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-mute">Favorites</p>
              {store.favoriteFoods
                .map((id) => PANTRY.find((p) => p.id === id))
                .filter((item): item is PantryItem => Boolean(item))
                .map((item) => {
                  const grams = gramsFor(item);
                  const macros = scalePantry(item, grams);
                  return (
                    <div key={item.id} className="flex items-center gap-2 px-5 py-3">
                      <button type="button" className="min-w-0 flex-1 text-left hover:text-acid" onClick={() => logPantry(item)}>
                        <span className="block truncate">{item.name}</span>
                        <span className="font-mono text-xs text-mute">
                          {macros.kcal} kcal · P{Math.round(macros.protein)} · {grams}g
                        </span>
                      </button>
                      <button
                        type="button"
                        className="text-acid"
                        aria-label={`Unfavorite ${item.name}`}
                        onClick={() => store.toggleFavoriteFood(item.id)}
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  );
                })}
            </Card>
          ) : null}

          {customHits.length > 0 ? (
            <Card className="divide-y divide-line">
              <p className="px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-mute">Your foods</p>
              {customHits.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                  <button type="button" className="min-w-0 flex-1 text-left hover:text-acid" onClick={() => logSaved(f)}>
                    <span className="block truncate">{f.name}</span>
                    <span className="font-mono text-xs text-mute">
                      {f.kcal} kcal · P{f.protein} C{f.carbs} F{f.fat}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-mute hover:text-heat"
                    aria-label={`Remove ${f.name} from saved foods`}
                    onClick={() => store.removeCustomFood(f.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>
          ) : null}

          {pantryHits.length > 0 ? (
            <Card className="divide-y divide-line">
              <p className="px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-mute">
                Pantry{q ? ` · ${pantryHits.length} match${pantryHits.length === 1 ? "" : "es"}` : ` · ${group}`}
              </p>
              {pantryHits.map((item) => {
                const grams = gramsFor(item);
                const macros = scalePantry(item, grams);
                const fav = store.favoriteFoods.includes(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-1 px-2 hover:bg-white/3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-3 text-left"
                      onClick={() => logPantry(item)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                        <span className="text-xs text-mute">
                          {item.group} · {item.kcal100} kcal / 100g · log {grams}g
                        </span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-sm text-mute">
                        {macros.kcal}
                        <span className="block text-[10px] uppercase tracking-[0.12em]">
                          P{macros.protein} C{macros.carbs} F{macros.fat}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={fav ? "px-3 text-acid" : "px-3 text-mute hover:text-cream"}
                      aria-pressed={fav}
                      aria-label={fav ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                      onClick={() => store.toggleFavoriteFood(item.id)}
                    >
                      <Star className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
                    </button>
                  </div>
                );
              })}
            </Card>
          ) : null}

          {q && plateHits.length > 0 ? (
            <Card className="divide-y divide-line">
              <p className="px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-mute">Plated meals</p>
              {plateHits.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-white/3"
                  onClick={() => logPlate(f)}
                >
                  <span>{f.name}</span>
                  <span className="font-mono text-sm text-mute">{f.kcal} kcal</span>
                </button>
              ))}
            </Card>
          ) : null}

          {q.length >= 2 && (liveState === "loading" || liveState === "error" || shownLive.length > 0) ? (
            <Card className="divide-y divide-line">
              {liveState === "loading" ? <p className="px-5 py-3 text-sm text-mute">Searching Open Food Facts…</p> : null}
              {liveState === "error" ? (
                <p className="px-5 py-3 text-sm text-mute">Open Food Facts is unreachable. Pact pantry still works.</p>
              ) : null}
              {shownLive.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-white/3"
                  onClick={() => logLive(f)}
                >
                  <span>
                    {f.name}
                    <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-mute">OFF</span>
                  </span>
                  <span className="font-mono text-sm text-mute">{f.kcal} kcal</span>
                </button>
              ))}
            </Card>
          ) : null}

          {noHits ? (
            <Card className="p-5">
              <p className="text-sm text-mute">
                Nothing in Pact or Open Food Facts for “{q}”. Enter the label and macros — the log still counts.
              </p>
              <button type="button" className="mt-2 text-sm text-acid" onClick={() => setQuery("")}>
                Clear search
              </button>
            </Card>
          ) : null}

          <Card className={`p-5 ${noHits ? "border-acid/40" : ""}`}>
            <Eyebrow>Manual macros</Eyebrow>
            <p className="mt-2 text-sm text-mute">
              Use this when the ingredient isn&apos;t listed. Leave calories blank and Pact will estimate from 4P + 4C + 9F.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="Food name"
                placeholder={q || "Food name"}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <Field
                type="number"
                min={0}
                inputMode="decimal"
                label="Kilocalories"
                placeholder="kcal"
                value={customKcal}
                onChange={(e) => setCustomKcal(e.target.value)}
              />
              <Field
                type="number"
                min={0}
                inputMode="decimal"
                label="Protein grams"
                placeholder="Protein g"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
              />
              <Field
                type="number"
                min={0}
                inputMode="decimal"
                label="Carb grams"
                placeholder="Carbs g"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
              />
              <Field
                type="number"
                min={0}
                inputMode="decimal"
                label="Fat grams"
                placeholder="Fat g"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                checked={saveCustom}
                onChange={(e) => setSaveCustom(e.target.checked)}
                className="accent-[#d6ff3f]"
              />
              Save to my foods for next time
            </label>
            <div className="mt-4">
              <Button type="button" disabled={!customReady} onClick={logCustom}>
                Log custom macros
              </Button>
            </div>
          </Card>

          <Card className="divide-y divide-line">
            {store.meals.length === 0 ? (
              <p className="p-6 text-sm text-mute">No meals yet. Scan lunch, log an ingredient, or enter macros.</p>
            ) : (
              store.meals.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  {m.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-mute" suppressHydrationWarning>
                      {m.source === "ai" ? "AI scan" : m.source} · {clock(m.at)} · P{m.protein} C{m.carbs} F{m.fat}
                    </p>
                  </div>
                  <p className="font-mono text-sm">{m.kcal}</p>
                  <button
                    type="button"
                    className="text-mute hover:text-cream"
                    aria-label={`Copy macros for ${m.name}`}
                    onClick={async () => {
                      const ok = await copyText(`${m.name} · ${m.kcal} kcal · P${m.protein} C${m.carbs} F${m.fat}`);
                      store.flash(ok ? "Macros copied" : "Copy failed");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => store.removeMeal(m.id)} className="text-mute hover:text-heat" aria-label="Remove meal">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function RemainingBanner({ protein, kcal }: { protein: number; kcal: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm">
        {protein > 0 ? (
          <>
            Still <span className="text-heat">{protein}g protein</span> short of the pact.
          </>
        ) : (
          <>Protein box can check off.</>
        )}{" "}
        {kcal < 0 ? (
          <span className="text-mute">{Math.abs(kcal)} kcal over the goal.</span>
        ) : kcal > 0 ? (
          <span className="text-mute">{kcal} kcal left.</span>
        ) : null}
      </p>
    </Card>
  );
}

function Macro({
  label,
  value,
  max,
  suffix = "",
  tone,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  tone: "acid" | "heat" | "gold" | "violet";
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{label}</p>
      <p className="mt-2 font-mono text-2xl">
        {fmt(Math.round(value))}
        {suffix}
        <span className="text-sm text-mute">
          {" "}
          / {fmt(max)}
          {suffix}
        </span>
      </p>
      <div className="mt-3">
        <Progress value={(value / max) * 100} tone={tone} />
      </div>
    </Card>
  );
}

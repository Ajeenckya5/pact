"use client";

import { ClipScanButton } from "@/components/ClipScan";
import { Button, Card, Chip, Eyebrow, Field, Progress } from "@/components/ui";
import { INGREDIENTS } from "@/lib/data";
import type { KitchenRecipe } from "@/lib/kitchen";
import {
  addLine,
  applyDietSwaps,
  DIETS,
  overlapScore,
  passesDiets,
  rankHit,
  removeLine,
  renameLine,
  setLineGrams,
  solvePlate,
  swapForLine,
  type SolveMove,
} from "@/lib/kitchen";
import { clientRecipeCatalog } from "@/lib/live-client";
import { useGoal, usePact } from "@/lib/store";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Row = {
  raw: KitchenRecipe;
  recipe: KitchenRecipe;
  notes: string[];
  hit: number;
  overlap: number;
};

export function RecipeKitchen() {
  const store = usePact();
  const goal = useGoal();
  const [catalog, setCatalog] = useState<KitchenRecipe[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [shown, setShown] = useState(48);
  const [origin, setOrigin] = useState<KitchenRecipe | null>(null);
  const [draft, setDraft] = useState<KitchenRecipe | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [moves, setMoves] = useState<SolveMove[]>([]);
  const [solveScore, setSolveScore] = useState<number | null>(null);
  const [addName, setAddName] = useState("");
  const [addGrams, setAddGrams] = useState(100);

  const selectedNames = useMemo(
    () => INGREDIENTS.filter((i) => store.selectedIngredients.includes(i.id)).map((i) => i.name),
    [store.selectedIngredients],
  );

  const categories = useMemo(() => {
    const set = new Set(catalog.map((r) => r.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [catalog]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((r) => category === "All" || r.category === category)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.area.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.lines.some((l) => l.name.toLowerCase().includes(q)),
      )
      .map((raw) => {
        const adapted = applyDietSwaps(raw, store.diets, store.mealTargets);
        return { raw, recipe: adapted.recipe, notes: adapted.notes };
      })
      .filter((x) => passesDiets(x.recipe, store.diets))
      .map((x) => ({
        ...x,
        hit: rankHit(x.recipe, store.mealTargets, store.diets),
        overlap: overlapScore(x.recipe, selectedNames),
      }))
      .sort((a, b) => b.hit - a.hit || b.overlap - a.overlap || a.recipe.name.localeCompare(b.recipe.name));
  }, [catalog, category, query, store.diets, store.mealTargets, selectedNames]);

  function loadCatalog() {
    setStatus("loading");
    clientRecipeCatalog()
      .then((d) => {
        setCatalog(d.recipes ?? []);
        setStatus("ok");
      })
      .catch(() => {
        setCatalog([]);
        setStatus("error");
      });
  }

  useEffect(() => {
    let active = true;
    clientRecipeCatalog()
      .then((d) => {
        if (!active) return;
        setCatalog(d.recipes ?? []);
        setStatus("ok");
      })
      .catch(() => {
        if (!active) return;
        setCatalog([]);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  function runSolve(recipe: KitchenRecipe, diets = store.diets) {
    const result = solvePlate(recipe, store.mealTargets, store.goal, diets);
    setDraft(result.recipe);
    setMoves(result.moves);
    setSolveScore(result.score);
    setNotes(result.moves.filter((m) => m.kind === "swap").map((m) => m.detail));
  }

  function open(raw: KitchenRecipe, nextDiets = store.diets) {
    setOrigin(raw);
    runSolve(raw, nextDiets);
  }

  function onDiet(id: (typeof DIETS)[number]["id"]) {
    const next = store.diets.includes(id) ? store.diets.filter((d) => d !== id) : [...store.diets, id];
    store.toggleDiet(id);
    if (origin) open(origin, next);
  }

  function patchTarget(key: "kcal" | "protein" | "carbs" | "fat", value: number) {
    store.setMealTargets({ ...store.mealTargets, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 });
  }

  const t = store.mealTargets;
  const drifted =
    draft != null &&
    (rel(draft.kcal, t.kcal) > 0.08 || rel(draft.protein, t.protein) > 0.12 || rel(draft.carbs, t.carbs) > 0.12);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Recipe kitchen</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">PactSolve. Inverse macros, not a scale slider.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            {status === "ok"
              ? `${rows.length} recipes match your diet from ${catalog.length} pantry plates. Macros come from those foods. PactSolve then fits grams to this meal.`
              : "Loading pantry plates and scoring them against this meal’s macros."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={() => store.resetMealTargets()}>
            Meal = {goal.name} ÷ 3
          </Button>
          <Button tone="ghost" onClick={loadCatalog}>
            Refresh catalog
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <Eyebrow>Dietary restrictions</Eyebrow>
        <p className="mt-2 text-sm text-mute">
          Recipes that can be adapted still show. PactSolve chooses the swap that protects protein, then solves amounts. Eat This Much-style role swaps (salmon → chickpeas) are how plates miss the protein target.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Chip key={d.id} active={store.diets.includes(d.id)} onClick={() => onDiet(d.id)}>
              {d.name}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>This meal’s macros</Eyebrow>
          {draftedHint(draft, drifted)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <MacroInput label="kcal" value={t.kcal} onChange={(n) => patchTarget("kcal", n)} />
          <MacroInput label="protein g" value={t.protein} onChange={(n) => patchTarget("protein", n)} />
          <MacroInput label="carbs g" value={t.carbs} onChange={(n) => patchTarget("carbs", n)} />
          <MacroInput label="fat g" value={t.fat} onChange={(n) => patchTarget("fat", n)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!draft}
            onClick={() => {
              if (draft) runSolve(draft);
            }}
          >
            PactSolve plate
          </Button>
          <Button
            tone="ghost"
            disabled={!origin}
            onClick={() => origin && open(origin)}
          >
            <RotateCcw className="h-4 w-4" />
            Reset plate
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1">
              <Field
                placeholder="Search name, cuisine, or ingredient"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(48);
                }}
              />
            </div>
            <ClipScanButton
              label="Scan a plate"
              onScan={(scan) => {
                setQuery(scan.caption);
                setShown(48);
                store.flash(`Searching recipes for ${scan.caption}`);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => {
                  setCategory(c);
                  setShown(48);
                }}
              >
                {c}
              </Chip>
            ))}
          </div>
          {status === "loading" ? <p className="text-sm text-mute">Loading pantry plates…</p> : null}
          {status === "error" ? <p className="text-sm text-gold">Catalog unavailable. Try refresh.</p> : null}
          <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
            {rows.slice(0, shown).map((row) => {
              const active = origin?.id === row.raw.id;
              return (
                <button
                  key={row.raw.id}
                  onClick={() => open(row.raw)}
                  className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                    active ? "border-acid bg-acid/10" : "border-line bg-card/80 hover:border-acid/40"
                  }`}
                >
                  {row.recipe.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.recipe.photo} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-xl bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.recipe.name}</p>
                    <p className="text-xs text-mute">
                      {row.recipe.category}
                      {row.recipe.area ? ` · ${row.recipe.area}` : ""} · {row.recipe.kcal} kcal · {row.recipe.protein}g P
                    </p>
                    <p className="mt-1 text-[11px] text-mute">
                      <span className="text-acid">Solve {row.hit}</span>
                      {row.notes.length ? ` · ${row.notes.length} diet swap${row.notes.length === 1 ? "" : "s"}` : " · no swaps"}
                      {row.overlap ? ` · ${row.overlap} on hand` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
            {rows.length > shown ? (
              <Button tone="ghost" className="w-full" onClick={() => setShown((n) => n + 48)}>
                Show more · {rows.length - shown} left
              </Button>
            ) : null}
            {status === "ok" && rows.length === 0 ? (
              <p className="py-8 text-sm text-mute">Nothing matches that diet and search. Drop a restriction or clear the query.</p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-7">
          {!draft ? (
            <Card className="p-8 text-sm text-mute">Pick a recipe. Amounts snap to this meal’s macros. Edit grams or names and the macros recalculate.</Card>
          ) : (
            <Card className="overflow-hidden lg:sticky lg:top-24">
              {draft.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.photo} alt="" className="h-48 w-full object-cover" />
              ) : null}
              <div className="space-y-5 p-5">
                <div>
                  <p className="text-xs text-mute">
                    Pact · {draft.category}
                    {draft.area ? ` · ${draft.area}` : ""}
                    {solveScore != null ? ` · PactSolve ${solveScore}/100` : ""}
                  </p>
                  <h2 className="mt-1 font-display text-3xl tracking-tight">{draft.name}</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <FitStat label="kcal" now={draft.kcal} want={t.kcal} />
                  <FitStat label="protein" now={draft.protein} want={t.protein} suffix="g" />
                  <FitStat label="carbs" now={draft.carbs} want={t.carbs} suffix="g" />
                  <FitStat label="fat" now={draft.fat} want={t.fat} suffix="g" />
                </div>

                {moves.filter((m) => m.kind !== "swap").length ? (
                  <div className="rounded-2xl border border-line px-4 py-3 text-sm text-mute">
                    <p className="text-xs uppercase tracking-[0.18em] text-acid">Solver</p>
                    <ul className="mt-2 space-y-1">
                      {moves
                        .filter((m) => m.kind !== "swap")
                        .map((m) => (
                          <li key={m.detail}>{m.detail}</li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                {notes.length ? (
                  <div className="rounded-2xl border border-acid/30 bg-acid/8 px-4 py-3 text-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-acid">Diet swaps on this plate</p>
                    <ul className="mt-2 space-y-1 text-mute">
                      {notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <Eyebrow>Ingredients · amounts drive macros</Eyebrow>
                  <ul className="mt-3 divide-y divide-line">
                    {draft.lines.map((line) => {
                      const swap = swapForLine(line.name, store.diets, store.mealTargets);
                      return (
                        <li key={line.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                          <Field
                            className="flex-1 py-2"
                            value={line.name}
                            onChange={(e) => setDraft(renameLine(draft, line.id, e.target.value))}
                          />
                          <div className="flex items-center gap-2">
                            <Field
                              className="w-24 py-2"
                              type="number"
                              min={0}
                              step={1}
                              value={line.grams}
                              onChange={(e) => setDraft(setLineGrams(draft, line.id, Number(e.target.value) || 0))}
                            />
                            <span className="text-xs text-mute">g</span>
                            <span className="w-28 font-mono text-xs text-mute">
                              {line.kcal} · {line.protein}P {line.carbs}C {line.fat}F
                            </span>
                            {swap && swap.to.toLowerCase() !== line.name.toLowerCase() ? (
                              <Button
                                tone="quiet"
                                className="px-2 text-xs"
                                onClick={() => setDraft(renameLine(draft, line.id, swap.to))}
                              >
                                → {swap.to}
                              </Button>
                            ) : null}
                            <button
                              className="text-mute hover:text-heat"
                              onClick={() => setDraft(removeLine(draft, line.id))}
                              aria-label={`Remove ${line.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Field
                      className="min-w-[160px] flex-1 py-2"
                      placeholder="Add ingredient"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                    <Field
                      className="w-24 py-2"
                      type="number"
                      min={1}
                      value={addGrams}
                      onChange={(e) => setAddGrams(Number(e.target.value) || 0)}
                    />
                    <Button
                      tone="ghost"
                      disabled={!addName.trim() || addGrams <= 0}
                      onClick={() => {
                        setDraft(addLine(draft, addName.trim(), addGrams));
                        setAddName("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["chicken", "firm tofu", "salmon", "eggs", "spinach", "rice", "olive oil", "oats"].map((n) => (
                      <Chip key={n} onClick={() => setDraft(addLine(draft, n, 100))}>
                        + {n}
                      </Chip>
                    ))}
                  </div>
                </div>

                {draft.steps.length ? (
                  <details className="rounded-2xl border border-line px-4 py-3">
                    <summary className="cursor-pointer text-sm text-mute">Method</summary>
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-mute">
                      {draft.steps.map((s) => (
                        <li key={s.slice(0, 48)}>{s}</li>
                      ))}
                    </ol>
                  </details>
                ) : null}

                {draft.youtubeId ? (
                  <a
                    className="inline-block text-sm text-acid"
                    href={`https://www.youtube.com/watch?v=${draft.youtubeId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch the cook
                  </a>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      store.addKitchenToCart(draft.lines.map((l) => ({ name: l.name, grams: l.grams })));
                    }}
                  >
                    Add scaled ingredients to cart
                  </Button>
                  <Button
                    tone="ghost"
                    onClick={() => {
                      store.addMeal({
                        foodId: draft.id,
                        name: draft.name,
                        kcal: draft.kcal,
                        protein: draft.protein,
                        carbs: draft.carbs,
                        fat: draft.fat,
                        source: "recipe",
                        photo: draft.photo,
                      });
                      store.flash(`Logged ${draft.name} · ${draft.kcal} kcal`);
                    }}
                  >
                    Log this plate
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function rel(a: number, b: number) {
  if (!b) return a ? 1 : 0;
  return Math.abs(a - b) / b;
}

function draftedHint(draft: KitchenRecipe | null, drifted: boolean) {
  if (!draft) return <span />;
  if (drifted) return <span className="text-xs text-gold">Plate drifted — PactSolve to snap grams</span>;
  return <span className="text-xs text-acid">Plate is on target</span>;
}

function MacroInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-mute">{label}</span>
      <Field className="mt-1 py-2 font-mono" type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}

function FitStat({
  label,
  now,
  want,
  suffix = "",
}: {
  label: string;
  now: number;
  want: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{label}</p>
      <p className="mt-1 font-mono text-lg">
        {now}
        {suffix}
        <span className="text-xs text-mute"> / {want}{suffix}</span>
      </p>
      <div className="mt-2">
        <Progress value={want ? (now / want) * 100 : 0} tone={now > want * 1.12 ? "gold" : "acid"} />
      </div>
    </div>
  );
}

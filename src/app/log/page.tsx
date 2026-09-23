"use client";

import { Button, Card, Eyebrow, Field } from "@/components/ui";
import { foodFromOffPayload, portionOf, type OffFood } from "@pact/core";
import { waterAdds } from "@/lib/experience";
import { fetchJson } from "@/lib/http";
import { usePact } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function LogPage() {
  const store = usePact();
  const adds = waterAdds(store.prefs.units);
  const [code, setCode] = useState("");
  const [grams, setGrams] = useState("100");
  const [food, setFood] = useState<OffFood | null>(null);
  const [lookupError, setLookupError] = useState("");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Log</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Water, food, and sleep.</h1>
      </div>
      <Card className="space-y-3 p-6">
        <p className="text-sm text-mute">Water today: {store.waterMl} ml</p>
        <div className="flex flex-wrap gap-2">
          {adds.map((add) => (
            <Button key={add.ml} type="button" onClick={() => store.addWater(add.ml)}>
              {add.label}
            </Button>
          ))}
          <Button type="button" tone="quiet" disabled={!store.undoLabel} onClick={() => store.undoLatest()}>
            {store.undoLabel ?? "Nothing to undo"}
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 p-6">
        <Eyebrow>Barcode</Eyebrow>
        <Field label="Barcode" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} />
        <Button
          type="button"
          onClick={() => {
            setLookupError("");
            void fetchJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code.trim())}.json`)
              .then((result) => {
                if (!result.ok) {
                  setLookupError("The food search did not answer. Check the code and try again.");
                  return;
                }
                const parsed = foodFromOffPayload(result.data);
                setFood(parsed);
                if (!parsed) setLookupError("That barcode has no food name yet.");
              });
          }}
        >
          Look up
        </Button>
        {lookupError ? <p className="text-sm text-heat">{lookupError}</p> : null}
        {food ? (
          <>
            <p className="text-sm">{food.name}</p>
            <Field label="Portion grams" inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} />
            <Button
              type="button"
              disabled={Number(grams) <= 0}
              onClick={() => {
                const portion = portionOf(food, Number(grams));
                store.addMeal({
                  foodId: food.code || food.name,
                  name: food.name,
                  kcal: portion.kcal,
                  protein: portion.protein,
                  carbs: portion.carbs,
                  fat: portion.fat,
                  source: "manual",
                });
                store.flash(`Logged ${portion.kcal} kcal of ${food.name}`);
              }}
            >
              Log this portion
            </Button>
          </>
        ) : null}
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/calories">
          Food
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/sleep">
          Sleep
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/water">
          Water details
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/recipes">
          Recipes
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/fuel">
          Market
        </Link>
      </div>
    </div>
  );
}

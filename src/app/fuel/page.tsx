"use client";

import { LocationBar } from "@/components/LocationBar";
import { Button, Card, Chip, Eyebrow, Field } from "@/components/ui";
import { GOALS, INGREDIENTS, recipesFor } from "@/lib/data";
import { fmt } from "@/lib/format";
import { cartTotal, useGoal, usePact } from "@/lib/store";
import { useNearbyPlaces } from "@/lib/use-live";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function FuelInner() {
  const store = usePact();
  const goal = useGoal();
  const params = useSearchParams();
  const { here, places, liveOk, retry } = useNearbyPlaces("grocery");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);

  const paramId = params.get("store");
  const wantId = pickedId ?? paramId ?? store.storeId;
  const storePlace = places.find((p) => p.id === wantId) ?? places[0];
  const scored = useMemo(
    () => recipesFor(store.goal, store.selectedIngredients),
    [store.goal, store.selectedIngredients],
  );
  const inventory = storePlace?.inventory ?? [];
  const deliveryAddress = address || (here.ready ? here.label : "");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Market + recipes</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Eat the goal. Order the gap.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Pact builds a grocery list from {goal.name.toLowerCase()} macros, matches recipes to the ingredients you keep, and checks out at a store near you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/recipes"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-sm font-medium text-cream hover:bg-white/10"
          >
            Open recipe kitchen
          </Link>
          <Button onClick={() => store.stockGoalList()}>Build {goal.name} cart</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {GOALS.map((g) => (
          <Chip key={g.id} active={store.goal === g.id} onClick={() => store.setGoal(g.id)}>
            {g.name} · {g.kcal} kcal
          </Chip>
        ))}
      </div>

      <LocationBar hint="Grocers load from OpenStreetMap around you — not a preset city." />

      <Card className="p-5">
        <Eyebrow>Shop from</Eyebrow>
        {!here.ready ? (
          <p className="mt-3 text-sm text-mute">Set a location to list nearby grocers.</p>
        ) : liveOk === false ? (
          <p className="mt-3 text-sm text-mute">
            OpenStreetMap didn&apos;t answer.{" "}
            <button type="button" className="text-acid" onClick={retry}>
              Retry
            </button>
          </p>
        ) : liveOk === null ? (
          <p className="mt-3 text-sm text-mute">Looking up grocers near {here.label}…</p>
        ) : places.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No grocers in OSM within 6 km of {here.label}.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {places.map((g) => (
                <Chip
                  key={g.id}
                  active={storePlace?.id === g.id}
                  onClick={() => {
                    setPickedId(g.id);
                    store.setStore(g.id);
                  }}
                >
                  {g.name}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-sm text-mute">
              {storePlace?.area} · {storePlace?.hours} · {storePlace ? `${storePlace.km.toFixed(1)} km` : ""} ·{" "}
              {storePlace?.tags.join(" · ")}
            </p>
          </>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-5">
          <Eyebrow>Ingredients you&apos;re working with</Eyebrow>
          <div className="mt-4 flex flex-wrap gap-2">
            {INGREDIENTS.map((ing) => {
              const on = store.selectedIngredients.includes(ing.id);
              const atStore = inventory.length === 0 || inventory.includes(ing.id);
              return (
                <Chip key={ing.id} active={on} onClick={() => store.toggleIngredient(ing.id)}>
                  {ing.name}
                  {!atStore ? " · other store" : ""}
                </Chip>
              );
            })}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <Eyebrow>Cart · {storePlace?.name ?? "pick a store"}</Eyebrow>
            <button className="text-xs text-mute" onClick={store.clearCart}>
              Clear
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {store.cart.length === 0 ? (
              <li className="py-6 text-sm text-mute">Cart is empty. Build from your goal or a recipe.</li>
            ) : (
              store.cart.map((c) => {
                const ing = INGREDIENTS.find((i) => i.id === c.ingredientId);
                const label = ing?.name ?? c.customName ?? c.ingredientId.replace(/^custom:/, "");
                const atStore = !ing || inventory.length === 0 || inventory.includes(ing.id);
                return (
                  <li key={c.ingredientId} className="flex items-center gap-3 py-3">
                    <div className="flex-1">
                      <p>{label}</p>
                      <p className="text-xs text-mute">
                        {ing ? `${ing.aisle} · $${ing.price.toFixed(2)}` : c.grams ? `${Math.round(c.grams)}g scaled` : "Custom"}
                        {!atStore ? " · not at this store" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => store.setQty(c.ingredientId, c.qty - 1)} aria-label="Decrease">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center font-mono">{c.qty}</span>
                      <button onClick={() => store.addToCart(c.ingredientId, 1)} aria-label="Increase">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-xl">${fmt(cartTotal(store.cart), 2)}</p>
            <p className="text-xs text-mute">Delivery 35–50 min · Pact Market</p>
          </div>
          <Field
            className="mt-4"
            value={deliveryAddress}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Delivery address"
          />
          <Button
            className="mt-3 w-full"
            disabled={store.cart.length === 0 || !storePlace}
            onClick={() => {
              if (!storePlace) return;
              const order = store.placeOrder(deliveryAddress || storePlace.area, {
                storeId: storePlace.id,
                storeName: storePlace.name,
              });
              setPlaced(order.id);
            }}
          >
            Place order
          </Button>
          {placed ? (
            <p className="mt-3 text-sm text-acid">
              Order {placed} confirmed. Driver is picking up from {storePlace?.name}.
            </p>
          ) : null}
        </Card>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Eyebrow>Recipes from your ingredients</Eyebrow>
          <Link href="/recipes" className="text-xs text-acid">
            Full catalog with macro fit
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {scored.map(({ recipe, overlap }) => {
            const missing = recipe.ingredients.filter((i) => !store.selectedIngredients.includes(i));
            return (
              <Card key={recipe.id} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={recipe.photo} alt="" className="h-40 w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs text-mute">
                    {recipe.minutes} min · {recipe.kcal} kcal · {recipe.protein}g protein · {overlap} ingredients on hand
                  </p>
                  <h2 className="mt-1 text-xl font-medium">{recipe.name}</h2>
                  <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-mute">
                    {recipe.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {missing.length ? (
                    <p className="mt-3 text-xs text-gold">
                      Missing: {missing.map((id) => INGREDIENTS.find((i) => i.id === id)?.name).join(", ")}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-acid">You have everything.</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button tone="ghost" onClick={() => store.addRecipeToCart(recipe.id)}>
                      Add missing to cart
                    </Button>
                    <Button
                      tone="quiet"
                      onClick={() =>
                        store.addMeal({
                          foodId: recipe.id,
                          name: recipe.name,
                          kcal: recipe.kcal,
                          protein: recipe.protein,
                          carbs: Math.round((recipe.kcal - recipe.protein * 4) * 0.55 / 4),
                          fat: 16,
                          source: "recipe",
                          photo: recipe.photo,
                        })
                      }
                    >
                      Log as meal
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-5">
        <Eyebrow>TheMealDB catalog · diet + macros</Eyebrow>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Every letter A–Z, plus Pact plates. Filter vegan / gluten-free / keto, then change kcal, protein, carbs, or fat — ingredient amounts and swaps follow.
        </p>
        <Link
          href="/recipes"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-acid px-4 py-2 text-sm font-medium text-ink hover:bg-white"
        >
          Open recipe kitchen
        </Link>
      </Card>

      {store.orders.length ? (
        <Card className="p-5">
          <Eyebrow>Orders</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm">
            {store.orders.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  {o.id} · {o.storeName ?? o.storeId} · {o.eta}
                </span>
                <span className="font-mono">${o.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

export default function FuelPage() {
  return (
    <Suspense fallback={<p className="text-mute">Loading market…</p>}>
      <FuelInner />
    </Suspense>
  );
}

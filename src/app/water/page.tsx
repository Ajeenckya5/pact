"use client";

import { Sparkline } from "@/components/charts";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import { extraWaterForHeat, formatWater, waterAdds } from "@/lib/experience";
import { fmt } from "@/lib/format";
import { useGoal, usePact } from "@/lib/store";
import { useLiveWeather } from "@/lib/use-live";

export default function WaterPage() {
  const store = usePact();
  const goal = useGoal();
  const { weather } = useLiveWeather();
  const units = store.prefs.units;
  const shown = formatWater(store.waterMl, units);
  const target = formatWater(goal.waterMl, units);
  const pct = Math.min(1, store.waterMl / goal.waterMl);
  const fill = 12 + pct * 78;
  const adds = waterAdds(units);
  const heat = weather ? extraWaterForHeat(weather.tempC) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Hydration</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Drink like it&apos;s a metric, because it is.</h1>
          <p className="mt-3 text-mute">
            Goal scales with your pact. Endurance days ask for more. Hot weather adds a bonus tank on this desk.
          </p>
        </div>
        <div className="flex gap-2">
          <Chip active={units === "metric"} onClick={() => store.setPrefs({ units: "metric" })}>
            ml
          </Chip>
          <Chip active={units === "imperial"} onClick={() => store.setPrefs({ units: "imperial" })}>
            oz
          </Chip>
        </div>
      </div>

      <Card className="grid items-center gap-8 p-8 md:grid-cols-2">
        <div className="flex justify-center">
          <div className="relative h-64 w-36 overflow-hidden rounded-[2.5rem] border-4 border-white/15 bg-ink">
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky to-sky/40 transition-all"
              style={{ height: `${fill}%` }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-3xl">{fmt(shown.value)}</p>
              <p className="text-xs text-mute">{shown.unit}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm text-mute">
            {fmt(target.value)} {target.unit} target · {Math.round(pct * 100)}%
          </p>
          {heat > 0 ? (
            <p className="mt-2 text-sm text-gold">
              Heat bonus +{formatWater(heat, units).value} {shown.unit}. Add it if you trained outdoors.
            </p>
          ) : null}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {adds.map((row) => (
              <Button key={row.label} tone="ghost" onClick={() => store.addWater(row.ml)}>
                {row.label}
              </Button>
            ))}
          </div>
          {heat > 0 ? (
            <Button className="mt-3 w-full" tone="ghost" onClick={() => store.addWater(heat)}>
              Add heat bonus
            </Button>
          ) : null}
          <Button className="mt-4 w-full" tone="quiet" disabled={!store.undoLabel} onClick={() => store.undoLatest()}>
            {store.undoLabel ?? "Nothing to undo"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <Eyebrow>Week</Eyebrow>
        <div className="mt-4">
          <Sparkline points={store.history.map((h) => h.water)} color="#5cc8ff" height={72} />
        </div>
        <p className="mt-4 text-sm text-mute">This week’s water only fills in after you log it.</p>
      </Card>
    </div>
  );
}

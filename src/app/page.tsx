"use client";

import { ClipResult, ClipScanButton } from "@/components/ClipScan";
import { ScoreRing, Sparkline } from "@/components/charts";
import { TodaySession } from "@/components/TodaySession";
import { WearableLiveStrip } from "@/components/WearableLive";
import { WeatherStrip } from "@/components/WeatherStrip";
import { Button, Card, Chip, Eyebrow, Progress, Stat } from "@/components/ui";
import type { AppPhotoScan } from "@/lib/app-vision";
import { GOALS } from "@/lib/data";
import { fmt } from "@/lib/format";
import { copyText, formatWater, pactShareText, remainingMacros, waterAdds, weekRecap } from "@/lib/experience";
import { mealTotals, pactScore, useGoal, usePact } from "@/lib/store";
import { useCoords } from "@/lib/use-live";
import { liveOrLog } from "@/lib/wearable-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import { peopleInCircle, todayLogs, weekStats } from "@/lib/training";
import { Check, Droplets, Moon, PersonStanding, Utensils } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function OverviewPage() {
  const store = usePact();
  const here = useCoords();
  const goal = useGoal();
  const { body } = useLiveBody();
  const totals = mealTotals(store.meals);
  const score = pactScore({ ...store, recovery: body.recovery, sleepScore: body.sleepScore });
  const hydro = Math.min(100, (store.waterMl / goal.waterMl) * 100);
  const protein = Math.min(100, (totals.protein / goal.protein) * 100);
  const week = weekStats(store.workoutLogs);
  const trained = todayLogs(store.workoutLogs);
  const circle = peopleInCircle(store.friends, store.extraFriends);
  const remaining = remainingMacros(totals, goal);
  const recap = weekRecap(
    store.history,
    week,
    Object.values(store.checkins).filter(Boolean).length,
  );
  const [clip, setClip] = useState<{ scan: AppPhotoScan; preview: string } | null>(null);
  const pactBits = [
    { key: "sleep" as const, label: "Sleep 7h+", icon: Moon, done: store.checkins.sleep },
    { key: "fuel" as const, label: "Hit protein", icon: Utensils, done: totals.protein >= goal.protein || store.checkins.fuel },
    { key: "water" as const, label: "Drink the tank", icon: Droplets, done: store.checkins.water },
    { key: "move" as const, label: "Train today", icon: PersonStanding, done: store.checkins.move },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Live · {here.ready && here.label ? here.label : store.demo ? "San Francisco" : "Set a city"}</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            {store.demo
              ? `Good training weather, ${(store.profile.name || "Alex").split(" ")[0]}.`
              : "Today is empty until you log it."}
          </h1>
          <p className="mt-3 max-w-xl text-mute">
            Log sleep, protein, water, and training. Pair a strap when you want live heart rate. Sample data is optional
            and labeled.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!store.demo ? (
            <Button tone="ghost" onClick={() => store.loadSample()}>
              Explore with sample data
            </Button>
          ) : (
            <Button tone="ghost" onClick={() => store.leaveSample()}>
              Leave sample data
            </Button>
          )}
          <ClipScanButton
            label="Scan a photo"
            onScan={(scan, _file, preview) => setClip({ scan, preview })}
          />
          {GOALS.map((g) => (
            <Chip key={g.id} active={store.goal === g.id} onClick={() => store.setGoal(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      </div>

      {clip ? (
        <Card className="p-5">
          <Eyebrow>CLIP · LAION-2B</Eyebrow>
          <div className="mt-4">
            <ClipResult
              scan={clip.scan}
              preview={clip.preview}
              extra={
                <Button type="button" tone="ghost" onClick={() => setClip(null)}>
                  Dismiss
                </Button>
              }
            />
          </div>
        </Card>
      ) : null}

      <WeatherStrip />

      <WearableLiveStrip />

      <TodaySession />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-4">
          <Eyebrow>Pact score</Eyebrow>
          <div className="mt-4 flex justify-center">
            <ScoreRing value={score} label="Today" sub="Recovery, fuel, the pact" />
          </div>
          <p className="mt-4 text-center text-sm text-mute">
            Weighted from recovery, sleep, fuel, water, training, and the pact you actually keep.
          </p>
        </Card>
        <Card className="grid gap-6 p-6 sm:grid-cols-3 lg:col-span-8">
          <div>
            <Stat
              label="Recovery"
              value={store.demo || body.ble.links ? body.recovery : "—"}
              hint={store.demo ? "Sample" : liveOrLog(body.authority.recovery)}
              tone="text-acid"
            />
            <div className="mt-3">
              <Sparkline points={store.history.map((h) => h.recovery)} />
            </div>
          </div>
          <div>
            <Stat
              label="Strain"
              value={store.demo || body.ble.links ? body.strain.toFixed(1) : "—"}
              hint={store.demo ? "Sample" : liveOrLog(body.authority.strain)}
              tone="text-heat"
            />
            <div className="mt-3">
              <Sparkline points={store.history.map((h) => h.strain)} color="#ff6b4a" />
            </div>
          </div>
          <div>
            <Stat
              label="Sleep"
              value={store.demo || body.ble.links ? body.sleepScore : "—"}
              hint={
                store.demo || body.sleepMin
                  ? `${Math.floor(body.sleepMin / 60)}h ${body.sleepMin % 60}m · ${store.demo ? "Sample" : liveOrLog(body.authority.sleep)}`
                  : "No sleep logged"
              }
              tone="text-violet"
            />
            <div className="mt-3">
              <Sparkline points={store.history.map((h) => h.sleepScore)} color="#8b7cff" />
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">HRV</p>
            <p className="mt-1 font-mono text-2xl">{store.demo || body.ble.links ? `${body.hrv} ms` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Resting HR</p>
            <p className="mt-1 font-mono text-2xl">{store.demo || body.ble.links ? `${body.rhr} bpm` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{body.hr != null ? "Heart rate" : "Steps"}</p>
            <p className="mt-1 font-mono text-2xl">
              {body.hr != null ? `${body.hr} bpm` : store.demo ? fmt(body.steps) : "—"}
            </p>
            {body.hr != null ? <p className="mt-1 text-xs text-mute">{fmt(body.steps)} steps</p> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pactBits.map((bit) => {
          const Icon = bit.icon;
          return (
            <button
              key={bit.key}
              onClick={() => store.setCheckin(bit.key, !store.checkins[bit.key])}
              className="rounded-3xl border border-line bg-card p-5 text-left transition hover:border-acid/40"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-mute" />
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${bit.done ? "bg-acid text-ink" : "border border-line"}`}
                >
                  {bit.done ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </div>
              <p className="mt-6 text-sm text-mute">Today&apos;s pact</p>
              <p className="text-lg font-medium">{bit.label}</p>
            </button>
          );
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <Eyebrow>This week</Eyebrow>
          <p className="mt-2 text-lg">
            Sleep {store.history.length ? recap.sleep : "—"} · Recovery {store.history.length ? recap.recovery : "—"} · {recap.sessions} sessions · {recap.minutes} min
          </p>
          <p className="mt-1 text-sm text-mute">
            {recap.boxes}/4 boxes today.
            {remaining.protein > 0 ? ` Still ${remaining.protein}g protein short.` : " Protein is in."}{" "}
            {remaining.kcal < 0
              ? `${Math.abs(remaining.kcal)} kcal over ${goal.name.toLowerCase()}.`
              : remaining.kcal > 0
                ? `${remaining.kcal} kcal left.`
                : "Calories on target."}
          </p>
        </div>
        <Button
          tone="ghost"
          onClick={async () => {
            const ok = await copyText(
              pactShareText({
                name: (store.profile.name || "You").split(" ")[0],
                checkins: store.checkins,
                protein: totals.protein,
                proteinGoal: goal.protein,
                waterMl: store.waterMl,
                waterGoal: goal.waterMl,
                trained: trained.length > 0,
                privacy: store.privacy,
              }),
            );
            store.flash(ok ? "Pact copied — calories stay private" : "Copy failed");
          }}
        >
          Share pact status
        </Button>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <Eyebrow>Training</Eyebrow>
          <p className="mt-2 font-mono text-3xl">
            {week.minutes}
            <span className="text-base text-mute"> min this week</span>
          </p>
          <p className="mt-1 text-sm text-mute">
            {week.sessions} sessions · {trained.length ? `${trained.length} logged today` : "No session today yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/workouts?tab=Library">
            <Button tone="ghost">Open library</Button>
          </Link>
          <Link href="/workouts">
            <Button>Track / race</Button>
          </Link>
          <Link href="/coach">
            <Button tone="ghost">Ask coach</Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Fuel</Eyebrow>
            <div className="flex gap-3">
              <Link href="/recipes" className="text-xs text-acid">
                Kitchen
              </Link>
              <Link href="/calories" className="text-xs text-acid">
                AI scan
              </Link>
            </div>
          </div>
          <p className="mt-3 font-mono text-3xl">
            {fmt(totals.kcal)}
            <span className="text-base text-mute"> / {fmt(goal.kcal)}</span>
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-mute">
                <span>Protein {Math.round(totals.protein)}g</span>
                <span>{goal.protein}g</span>
              </div>
              <Progress value={protein} tone="heat" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-mute">
                <span>Carbs {Math.round(totals.carbs)}g</span>
                <span>{goal.carbs}g</span>
              </div>
              <Progress value={(totals.carbs / goal.carbs) * 100} tone="gold" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-mute">
                <span>Fat {Math.round(totals.fat)}g</span>
                <span>{goal.fat}g</span>
              </div>
              <Progress value={(totals.fat / goal.fat) * 100} tone="violet" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Water</Eyebrow>
            <Link href="/water" className="text-xs text-acid">
              Log
            </Link>
          </div>
          <p className="mt-3 font-mono text-3xl">
            {fmt(formatWater(store.waterMl, store.prefs.units).value)}
            <span className="text-base text-mute">
              {" "}
              / {fmt(formatWater(goal.waterMl, store.prefs.units).value)} {formatWater(store.waterMl, store.prefs.units).unit}
            </span>
          </p>
          <div className="mt-4">
            <Progress value={hydro} tone="sky" />
          </div>
          <div className="mt-5 flex gap-2">
            {waterAdds(store.prefs.units)
              .slice(1, 4)
              .map((row) => (
                <Button key={row.label} tone="ghost" onClick={() => store.addWater(row.ml)}>
                  {row.label}
                </Button>
              ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Circle</Eyebrow>
            <Link href="/friends" className="text-xs text-acid">
              Friends
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {circle.slice(0, 4).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-mute">{f.pace}</p>
                </div>
                <p className="font-mono text-sm text-acid">{f.recovery}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

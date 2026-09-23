"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { mealTotals, useGoal, usePact } from "@/lib/store";
import { todayLogs } from "@/lib/training";
import { suggestToday, type TodayPick } from "@/lib/today-session";
import { useLiveWeather } from "@/lib/use-live";
import { liveSourceLine } from "@/lib/wearable-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import Link from "next/link";
import { useMemo } from "react";

const BAND: Record<string, string> = {
  protect: "Protect",
  easy: "Easy",
  train: "Train",
  push: "Push",
};

export function TodaySession() {
  const store = usePact();
  const goal = useGoal();
  const wx = useLiveWeather();
  const { body } = useLiveBody();
  const trained = todayLogs(store.workoutLogs);
  const totals = mealTotals(store.meals);

  const suggestion = useMemo(
    () =>
      suggestToday({
        recovery: body.recovery,
        strain: body.strain,
        sleepScore: body.sleepScore,
        sleepMin: body.sleepMin,
        hrv: body.hrv,
        hr: body.hr,
        rhr: body.rhr,
        cadence: body.cadence,
        power: body.power,
        protein: totals.protein,
        proteinGoal: goal.protein,
        waterMl: store.waterMl,
        waterGoal: goal.waterMl,
        goal,
        logs: store.workoutLogs,
        favoriteWorkouts: store.favoriteWorkouts,
        weather: wx.weather,
        trainedToday: trained.length > 0,
        liveNote: store.demo ? liveSourceLine(body) : undefined,
        measured: store.demo || body.ble.links > 0,
      }),
    [
      body,
      store.workoutLogs,
      store.favoriteWorkouts,
      store.waterMl,
      store.demo,
      goal,
      wx.weather,
      trained.length,
      totals.protein,
    ],
  );

  function logPick(pick: TodayPick) {
    store.logWorkout({
      title: pick.title,
      category: pick.category,
      minutes: pick.minutes,
      kcal: pick.kcal,
      source: pick.kind === "common" ? "common" : "library",
      workoutId: pick.id,
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>
            Today&apos;s session · {BAND[suggestion.intensity]}
            {suggestion.indoor ? " · indoor" : " · outdoor ok"}
          </Eyebrow>
          <h2 className="mt-2 font-display text-3xl tracking-tight">{suggestion.pick.title}</h2>
          <p className="mt-2 max-w-2xl text-mute">{suggestion.headline}</p>
        </div>
        <p className="font-mono text-sm text-mute">
          {suggestion.pick.minutes} min · ~{suggestion.pick.kcal} kcal · {suggestion.pick.category}
        </p>
      </div>

      {suggestion.pick.prescription ? (
        <p className="mt-3 text-sm">{suggestion.pick.prescription}</p>
      ) : suggestion.pick.cue ? (
        <p className="mt-3 text-sm text-mute">{suggestion.pick.cue}</p>
      ) : null}

      {wx.loading ? (
        <p className="mt-3 text-xs text-gold">Weather still loading — the pick may shift if air or heat is ugly.</p>
      ) : null}
      {wx.error ? (
        <p className="mt-3 text-xs text-mute">Open-Meteo is quiet. This pick used recovery and history only.</p>
      ) : null}

      <ul className="mt-4 space-y-1.5 text-sm text-mute">
        {suggestion.reasons.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestion.pick.kind === "library" ? (
          <Link
            href={suggestion.pick.href}
            className="inline-flex items-center justify-center rounded-full bg-acid px-4 py-2 text-sm font-medium text-ink hover:bg-white"
          >
            Open film
          </Link>
        ) : null}
        <Button
          tone={suggestion.pick.kind === "library" ? "ghost" : "accent"}
          onClick={() => logPick(suggestion.pick)}
        >
          Log this
        </Button>
        <Link
          href="/coach"
          className="inline-flex items-center justify-center rounded-full border border-line bg-white/5 px-4 py-2 text-sm font-medium text-cream hover:bg-white/10"
        >
          Ask coach
        </Link>
      </div>

      {suggestion.alts.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Instead</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestion.alts.map((alt) =>
              alt.kind === "library" ? (
                <Link
                  key={alt.id}
                  href={alt.href}
                  className="rounded-full border border-line bg-white/3 px-3 py-1.5 text-xs text-mute hover:text-cream"
                >
                  {alt.title}
                </Link>
              ) : (
                <button
                  key={alt.id}
                  type="button"
                  className="rounded-full border border-line bg-white/3 px-3 py-1.5 text-xs text-mute hover:text-cream"
                  onClick={() => logPick(alt)}
                >
                  Log {alt.title}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

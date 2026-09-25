"use client";

import { ClipResult, ClipScanButton } from "@/components/ClipScan";
import { usePartner } from "@/components/PactLive";
import { ScoreRing, Sparkline } from "@/components/charts";
import { TodaySession } from "@/components/TodaySession";
import { WearableLiveStrip } from "@/components/WearableLive";
import { WeatherStrip } from "@/components/WeatherStrip";
import { Button, Card, Chip, Eyebrow, Progress, Stat } from "@/components/ui";
import type { AppPhotoScan } from "@/lib/app-vision";
import { GOALS } from "@/lib/data";
import { fmt } from "@/lib/format";
import { copyText, formatWater, pactShareText, remainingMacros, waterAdds, weekRecap } from "@/lib/experience";
import { hasPactData } from "@/lib/score-ready";
import { personalToday } from "@/lib/personal-today";
import { mealTotals, pactScore, useGoal, usePact } from "@/lib/store";
import { dailyCall } from "@pact/core";
import { useCoords } from "@/lib/use-live";
import { liveOrLog } from "@/lib/wearable-live";
import { hoursFromMinutes, isDeviceSleep, resolveSleepSave, sleepSourceLabel } from "@/lib/sleep-source";
import { useLiveBody } from "@/lib/wearable-live-context";
import { peopleInCircle, todayLogs, weekStats } from "@/lib/training";
import { Check, Droplets, Moon, PersonStanding, Utensils } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

export default function OverviewPage() {
  const store = usePact();
  const here = useCoords();
  const goal = useGoal();
  const { body } = useLiveBody();
  const totals = mealTotals(store.todayMeals);
  const scored = hasPactData(store);
  const score = pactScore({ ...store, meals: store.todayMeals, recovery: body.recovery, sleepScore: body.sleepScore });
  const hydro = Math.min(100, (store.waterMl / goal.waterMl) * 100);
  const protein = Math.min(100, (totals.protein / goal.protein) * 100);
  const week = weekStats(store.workoutLogs);
  const trained = todayLogs(store.workoutLogs);
  const circle = peopleInCircle(store.friends, store.extraFriends, store.demo);
  const remaining = remainingMacros(totals, goal);
  const recap = weekRecap(
    store.history,
    week,
    Object.values(store.checkins).filter(Boolean).length,
  );
  const partner = usePartner();
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepHours, setSleepHours] = useState("7");
  const [sleepEditing, setSleepEditing] = useState(false);
  const [sleepError, setSleepError] = useState<string | null>(null);
  const sleepInput = useRef<HTMLInputElement>(null);
  const [walkOpen, setWalkOpen] = useState(false);
  const [walkMin, setWalkMin] = useState("20");
  const deviceSleep = isDeviceSleep(store.sleepSource, store.sleepMin);
  const sleepLogged = store.sleepMin > 0;
  const loggedSleepHours = hoursFromMinutes(store.sleepMin);
  const sleepFrom = sleepSourceLabel(store.sleepSource);
  const openSleep = (editing: boolean) => {
    setSleepHours(sleepLogged ? String(loggedSleepHours) : "7");
    setSleepEditing(editing || !deviceSleep);
    setSleepError(null);
    setSleepOpen(true);
    if (editing) window.requestAnimationFrame(() => sleepInput.current?.focus());
  };
  const [clip, setClip] = useState<{ scan: AppPhotoScan; preview: string } | null>(null);
  const pactBits = [
    { key: "sleep" as const, label: "Sleep 7h+", icon: Moon, done: store.checkins.sleep },
    { key: "fuel" as const, label: "Hit protein", icon: Utensils, done: totals.protein >= goal.protein || store.checkins.fuel },
    { key: "water" as const, label: "Drink the tank", icon: Droplets, done: store.checkins.water },
    { key: "move" as const, label: "Train today", icon: PersonStanding, done: store.checkins.move },
  ];

  const boxesOpen = pactBits.filter((bit) => !bit.done).length;
  const measured = store.demo || body.ble.links > 0;
  const call = dailyCall({
    measured,
    recovery: measured ? body.recovery : null,
    strain: measured ? body.strain : null,
    sleepScore: measured ? body.sleepScore : null,
  });
  const personal = personalToday({
    call: call.call,
    hour: new Date().getHours(),
    waterMl: store.waterMl,
    waterGoal: goal.waterMl,
    proteinLeft: Math.max(0, Math.round(goal.protein - totals.protein)),
    boxesOpen,
    empty: !store.demo && store.todayMeals.length === 0 && store.waterMl === 0 && boxesOpen === 4,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-call={call.call}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {here.ready && here.label
              ? `Live · ${here.label}`
              : store.demo
                ? "Live · San Francisco"
                : "Set a city for weather"}
          </Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            {store.demo
              ? `Good training weather, ${(store.profile.name.trim() || "you").split(" ")[0]}.`
              : personal.headline}
          </h1>
          <p className="mt-3 max-w-xl text-mute">
            {store.demo
              ? "Log sleep, protein, water, and training. Pair a strap when you want live heart rate. Sample data is optional and labeled."
              : personal.detail}
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
          <Eyebrow>Color match</Eyebrow>
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
            <ScoreRing
              value={score}
              blank={!scored}
              label="Today"
              sub={scored ? "Recovery, fuel, the pact" : "Log something to see a score"}
            />
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
                  ? `${Math.floor(body.sleepMin / 60)}h ${body.sleepMin % 60}m · ${store.demo ? "Sample" : sleepFrom}`
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
          const partial =
            !bit.done &&
            ((bit.key === "fuel" && totals.protein > 0) || (bit.key === "water" && store.waterMl > 0));
          const state = bit.done ? "Done" : partial ? "Partial" : "Open";
          return (
            <div
              key={bit.key}
              className={`rounded-[20px] border bg-card p-4 ${bit.done ? "border-line" : "border-acid/50"}`}
            >
              <button
                type="button"
                onClick={() => store.setCheckin(bit.key, !store.checkins[bit.key])}
                className="w-full text-left"
              >
                <span className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-mute" aria-hidden />
                  {bit.done ? (
                    <span className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
                      <Check className="h-4 w-4" aria-hidden />
                      Done
                    </span>
                  ) : (
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${partial ? "bg-gold text-ink" : "bg-ink text-cream"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                </span>
                <span className="mt-4 block text-sm text-mute">Today&apos;s pact</span>
                <span className="block font-display text-xl">{bit.label}</span>
                <span className="mt-1 block text-xs text-mute">{state}</span>
              </button>
              {bit.key === "sleep" ? (
                <div className="mt-3">
                  {sleepLogged ? (
                    <p className="text-xs text-mute" data-sleep-source={store.sleepSource ?? ""}>
                      {loggedSleepHours} h · {sleepFrom}
                    </p>
                  ) : null}
                  {sleepOpen ? null : (
                    <button
                      type="button"
                      className={`mt-2 inline-flex min-h-11 items-center rounded-full px-4 text-sm ${bit.done ? "border border-line" : "bg-acid text-ink"}`}
                      onClick={() => openSleep(bit.done)}
                    >
                      {bit.done ? "Edit sleep" : "Log sleep"}
                    </button>
                  )}
                  {sleepOpen ? (
                    <form
                      className="mt-3 space-y-2"
                      noValidate
                      onSubmit={(event) => {
                        event.preventDefault();
                        const saved = resolveSleepSave({
                          sleepMin: store.sleepMin,
                          sleepSource: store.sleepSource,
                          hours: Number(sleepHours),
                        });
                        if (!saved) {
                          setSleepError("Enter hours between 0.5 and 16.");
                          sleepInput.current?.focus();
                          return;
                        }
                        store.logSleep(saved.minutes, saved.source);
                        setSleepOpen(false);
                      }}
                    >
                      <label className="block text-xs text-mute" htmlFor="sleep-hours">
                        Hours of sleep
                      </label>
                      <input
                        ref={sleepInput}
                        id="sleep-hours"
                        className="min-h-11 w-full rounded-xl border border-line bg-ink px-3 read-only:border-transparent read-only:bg-card"
                        type="number"
                        inputMode="decimal"
                        min="0.5"
                        max="16"
                        step="0.1"
                        value={sleepHours}
                        readOnly={!sleepEditing}
                        aria-invalid={sleepError ? true : undefined}
                        aria-describedby="sleep-hours-note"
                        onChange={(event) => {
                          setSleepHours(event.target.value);
                          setSleepError(null);
                        }}
                      />
                      <p id="sleep-hours-note" className="text-xs text-mute" aria-live="polite">
                        {sleepError ??
                          (deviceSleep
                            ? sleepEditing
                              ? `A change is saved as your own entry instead of ${sleepFrom.replace(/^From /, "")}.`
                              : sleepFrom
                            : "Default is 7 hours.")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">
                          Save sleep
                        </button>
                        {sleepEditing ? null : (
                          <button
                            type="button"
                            aria-label="Edit hours of sleep"
                            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm"
                            onClick={() => {
                              setSleepEditing(true);
                              window.requestAnimationFrame(() => sleepInput.current?.focus());
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-mute"
                          onClick={() => setSleepOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : bit.done ? null : bit.key === "fuel" ? (
                <Link
                  href="/calories"
                  aria-label="Log food"
                  className="mt-3 inline-flex min-h-11 items-center rounded-full bg-acid px-4 text-sm text-ink"
                >
                  Log food
                </Link>
              ) : bit.key === "water" ? (
                <button
                  type="button"
                  aria-label="Add 250 ml of water"
                  className="mt-3 inline-flex min-h-11 items-center rounded-full bg-acid px-4 text-sm text-ink"
                  onClick={() => store.addWater(250)}
                >
                  Add 250 ml of water
                </button>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    aria-label="Log a walk"
                    className="inline-flex min-h-11 items-center rounded-full bg-acid px-4 text-sm text-ink"
                    onClick={() => {
                      setWalkMin("20");
                      setWalkOpen(true);
                    }}
                  >
                    Log a walk
                  </button>
                  {walkOpen ? (
                    <form
                      className="mt-3 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const minutes = Number(walkMin);
                        if (!Number.isFinite(minutes) || minutes <= 0) return;
                        store.logWorkout({
                          title: "Walk",
                          category: "Cardio",
                          minutes,
                          kcal: Math.round(minutes * 4),
                          source: "manual",
                        });
                        setWalkOpen(false);
                      }}
                    >
                      <label className="block text-xs text-mute" htmlFor="walk-minutes">
                        Minutes
                      </label>
                      <input
                        id="walk-minutes"
                        aria-label="Walk duration in minutes"
                        className="min-h-11 w-full rounded-xl border border-line bg-ink px-3"
                        type="number"
                        min="1"
                        max="300"
                        step="1"
                        value={walkMin}
                        onChange={(event) => setWalkMin(event.target.value)}
                      />
                      <p className="text-xs text-mute">Default is 20 minutes.</p>
                      <button type="submit" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">
                        Save walk
                      </button>
                    </form>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Card className="p-5" data-partner={partner.live}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Partner</Eyebrow>
            <p className="mt-1 font-display text-2xl">{partner.live === "open" ? "Checked in with you" : "No partner yet"}</p>
            {partner.live === "open" ? null : (
              <Link
                href="/people"
                aria-label="Invite someone"
                className="mt-3 inline-flex min-h-11 items-center rounded-full bg-acid px-4 text-sm text-ink"
              >
                Invite someone
              </Link>
            )}
            <p className="text-sm text-mute">
              {partner.checkedAt
                ? `Last check-in ${new Date(partner.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "No check-in yet"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["sleep", "Sleep"],
              ["fuel", "Protein"],
              ["water", "Water"],
              ["move", "Train"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={`${key}-${partner.pulse[key] ?? 0}`}
              data-partner-box={key}
              data-partner-done={partner.partner[key] ? "yes" : "no"}
              className={`rounded-xl bg-ink px-3 py-3 ${partner.pulse[key] ? "pact-pop" : ""}`}
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{label}</p>
              <p className="mt-1 text-sm font-medium">{partner.partner[key] ? "In" : "Open"}</p>
            </div>
          ))}
        </div>
      </Card>

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
              <Link href="/recipes" className="text-xs text-acid underline underline-offset-2">
                Kitchen
              </Link>
              <Link href="/calories" className="text-xs text-acid underline underline-offset-2">
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
            <Link href="/water" className="text-xs text-acid underline underline-offset-2">
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
          <div className="mt-5 flex flex-wrap gap-2">
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
            <Link href="/friends" className="text-xs text-acid underline underline-offset-2">
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

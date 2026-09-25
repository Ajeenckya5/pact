"use client";

import { Hypnogram, Sparkline } from "@/components/charts";
import { SunriseNote } from "@/components/WeatherStrip";
import { Button, Card, Eyebrow, Stat } from "@/components/ui";
import { minutesLabel } from "@/lib/format";
import { usePact } from "@/lib/store";
import { SLEEP_GOAL_MIN, sleepSourceLabel } from "@/lib/sleep-source";
import { liveOrLog } from "@/lib/wearable-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function SleepPage() {
  const store = usePact();
  const { body } = useLiveBody();
  // Stages, efficiency, and breathing need a device that records them. Until one does, only sample data shows them.
  const sample = store.demo;
  const logged = store.sleepMin > 0;
  const short = Math.max(0, SLEEP_GOAL_MIN - store.sleepMin);
  const stages = [
    { label: "Awake", min: 18, pct: 4 },
    { label: "REM", min: 96, pct: 22 },
    { label: "Light", min: 228, pct: 52 },
    { label: "Deep", min: 100, pct: 22 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Eyebrow>Last night</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Sleep, read, recover.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          How long you slept, where the number came from, and what to protect tonight.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-6">
          <Stat
            label="Time asleep"
            value={logged ? minutesLabel(store.sleepMin) : "—"}
            hint={logged ? sleepSourceLabel(store.sleepSource) : "Not logged yet"}
          />
          {logged ? null : (
            <Link href="/" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-acid px-4 text-sm text-ink">
              Log sleep on Today
            </Link>
          )}
        </Card>
        <Card className="p-6">
          <Stat
            label="Against 7 h"
            value={logged ? (short > 0 ? `${short}m short` : "Met") : "—"}
            hint={logged ? (short > 0 ? "An earlier night closes it" : "Sleep box is done") : "Pact goal is 7 hours"}
            tone={logged && short > 0 ? "text-gold" : undefined}
          />
        </Card>
        <Card className="p-6">
          <Stat
            label="Performance"
            value={sample ? body.sleepScore : "—"}
            hint={sample ? "Sample" : "Needs a device that scores sleep"}
            tone="text-violet"
          />
        </Card>
        <Card className="p-6">
          <Stat label="Efficiency" value={sample ? "91%" : "—"} hint={sample ? "Sample" : "Needs a device that tracks sleep"} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <Eyebrow>{sample ? "Hypnogram · Sample" : "Sleep stages"}</Eyebrow>
          {sample ? (
            <>
              <div className="mt-6">
                <Hypnogram />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stages.map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-mute">{s.label}</p>
                    <p className="font-mono text-lg">{s.min}m</p>
                    <p className="text-xs text-mute">{s.pct}%</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-mute">
              Stages show here when Apple Health or Health Connect shares them from a watch or ring. Hours you log count toward the sleep box either way.
            </p>
          )}
        </Card>
        <Card className="p-6 lg:col-span-2">
          <Eyebrow>Overnight vitals</Eyebrow>
          <div className="mt-6 space-y-5">
            <Row k="HRV (rMSSD)" v={body.hrv > 0 ? `${body.hrv} ms` : "—"} d={sample ? "Sample" : body.hrv > 0 ? liveOrLog(body.authority.hrv) : "Pair a device"} />
            <Row k="Resting HR" v={body.rhr > 0 ? `${body.rhr} bpm` : "—"} d={sample ? "Sample" : body.rhr > 0 ? "Pact log" : "Pair a device"} />
            <Row k="Respiratory rate" v={sample ? "14.2 br/min" : "—"} d={sample ? "Sample" : "Needs a device that tracks sleep"} />
            <Row
              k="Skin temp"
              v={body.tempDelta != null ? `${body.tempDelta > 0 ? "+" : ""}${body.tempDelta.toFixed(2)}°C` : "—"}
              d={body.tempDelta != null ? liveOrLog(body.ble.name) : body.ble.links ? "Not on this device" : "Pair a device"}
            />
            <Row
              k="SpO2 avg"
              v={body.spo2 != null ? `${body.spo2}%` : "—"}
              d={body.spo2 != null ? liveOrLog(body.ble.name) : body.ble.links ? "Not on this device" : "Pair a device"}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-acid" />
            <Eyebrow>Reading stat</Eyebrow>
          </div>
          <p className="mt-4 font-mono text-4xl">{store.readingMin} min</p>
          <p className="mt-2 text-sm text-mute">
            Wind-down reading before bed. Consistency beats a sleep cocktail.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[10, 15, 20].map((m) => (
              <Button key={m} tone="ghost" onClick={() => store.addReading(m)}>
                +{m} min tonight
              </Button>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Eyebrow>7-night trend</Eyebrow>
          <div className="mt-4">
            <Sparkline points={store.history.map((h) => h.sleepScore)} color="#8b7cff" height={80} />
          </div>
          <p className="mt-4 text-sm text-mute">
            {sample
              ? "Sample: Thursday ran 70 minutes short and recovery paid for it Friday."
              : store.history.length >= 2
                ? "Protect bedtime like a meeting."
                : "Log a few nights and the trend fills in."}
          </p>
        </Card>
      </div>
      <SunriseNote />
    </div>
  );
}

function Row({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line/60 pb-4">
      <div>
        <p className="text-sm">{k}</p>
        <p className="text-xs text-mute">{d}</p>
      </div>
      <p className="font-mono text-sm">{v}</p>
    </div>
  );
}

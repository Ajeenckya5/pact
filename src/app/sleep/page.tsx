"use client";

import { Hypnogram, Sparkline } from "@/components/charts";
import { SunriseNote } from "@/components/WeatherStrip";
import { Button, Card, Eyebrow, Stat } from "@/components/ui";
import { minutesLabel } from "@/lib/format";
import { usePact } from "@/lib/store";
import { liveOrLog } from "@/lib/wearable-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import { BookOpen } from "lucide-react";

export default function SleepPage() {
  const store = usePact();
  const { body } = useLiveBody();
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
          Whoop tells you a number. Pact shows the night: stages, HRV, respiratory rate, debt, and the wind-down reading that actually put you under.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-6">
          <Stat label="Performance" value={body.sleepScore} hint={liveOrLog(body.authority.sleep)} tone="text-violet" />
        </Card>
        <Card className="p-6">
          <Stat label="Time asleep" value={minutesLabel(body.sleepMin)} hint="In bed 11:08 – 6:41" />
        </Card>
        <Card className="p-6">
          <Stat label="Efficiency" value="91%" hint="12 min to fall asleep" />
        </Card>
        <Card className="p-6">
          <Stat label="Sleep debt" value="24m" hint="Cleared if you repeat tonight" tone="text-gold" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <Eyebrow>Hypnogram</Eyebrow>
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
        </Card>
        <Card className="p-6 lg:col-span-2">
          <Eyebrow>Overnight vitals</Eyebrow>
          <div className="mt-6 space-y-5">
            <Row k="HRV (rMSSD)" v={`${body.hrv} ms`} d={liveOrLog(body.authority.hrv)} />
            <Row k="Resting HR" v={`${body.rhr} bpm`} d="Pact log" />
            <Row k="Respiratory rate" v="14.2 br/min" d="Stable" />
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
            Wind-down reading last night. Screens off at 22:41. Consistency beats a sleep cocktail.
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
            Thursday was the leak — 70 minutes short, recovery paid for it Friday. Protect bedtime like a meeting.
          </p>
        </Card>
      </div>
      <SunriseNote />
    </div>
  );
}

function Row({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-4">
      <div>
        <p className="text-sm">{k}</p>
        <p className="text-xs text-mute">{d}</p>
      </div>
      <p className="font-mono text-sm">{v}</p>
    </div>
  );
}

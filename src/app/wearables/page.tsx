"use client";

import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import { WEARABLES } from "@/lib/data";
import { cn } from "@/lib/cn";
import { liveGet } from "@/lib/use-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import { useEffect, useMemo, useState } from "react";

type Feed = {
  id: string;
  name: string;
  use: string;
  url: string;
  key: boolean;
  ok: boolean;
  ms: number;
};

export default function WearablesPage() {
  const { body, links, bluetooth, pairDevice, disconnectDevice } = useLiveBody();
  const [os, setOs] = useState<"all" | "ios" | "android">("all");
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const list = useMemo(
    () => WEARABLES.filter((w) => os === "all" || w.platforms.includes(os)),
    [os],
  );
  const paired = links.filter((l) => l.connected);
  const canPair = bluetooth.available !== false;

  useEffect(() => {
    liveGet<{ feeds: Feed[] }>("/api/feeds")
      .then((d) => setFeeds(d.feeds ?? []))
      .catch(() => setFeeds([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            Bluetooth · {paired.length} paired
            {body.hr != null ? ` · ${body.hr} bpm` : ""}
          </Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Pair the strap. Pact does the rest.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Live numbers come only from the Bluetooth device you pick in the system sheet. Pact does not invent WHOOP,
            Oura, Apple Watch, or Garmin streams in the background.
          </p>
        </div>
        <Button onClick={() => void pairDevice()} disabled={!canPair || bluetooth.pairing}>
          {bluetooth.pairing ? "Waiting for device…" : "Connect Bluetooth device"}
        </Button>
      </div>
      {bluetooth.available === false ? (
        <Card className="border-heat/40 p-4 text-sm text-mute">
          This browser has no Web Bluetooth. Use Chrome or Edge on a laptop or Android phone. Safari on iPhone cannot
          pair straps — Bluefy can.
        </Card>
      ) : null}
      {bluetooth.error ? <p className="text-sm text-heat">{bluetooth.error}</p> : null}

      {paired.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {links.map((link) => (
            <Card key={link.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-mute">
                    <span className={cn("h-1.5 w-1.5 rounded-full", link.connected ? "bg-acid" : "bg-heat")} />
                    Bluetooth · {link.profiles.join(" · ") || "GATT"}
                  </p>
                  <h2 className="mt-1 text-lg">{link.name}</h2>
                  <p className="mt-2 font-mono text-sm text-acid">
                    {[
                      link.sample.hr != null ? `${link.sample.hr} bpm` : null,
                      link.sample.hrv != null ? `${link.sample.hrv} ms HRV` : null,
                      link.sample.cadence != null ? `${link.sample.cadence} rpm` : null,
                      link.sample.power != null ? `${link.sample.power} W` : null,
                      link.sample.speedKmh != null ? `${link.sample.speedKmh} km/h` : null,
                      link.sample.battery != null ? `${link.sample.battery}%` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || (link.connected ? "Listening for notifications…" : "Disconnected")}
                  </p>
                </div>
                <Button tone="ghost" onClick={() => disconnectDevice(link.id)}>
                  Disconnect
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5 text-sm text-mute">
          Nothing streaming. Tap Connect Bluetooth device, pick your strap or bike, and keep this tab open. Chrome
          remembers it for next time. Until then, recovery / strain / sleep on Overview are your Pact log.
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Chip active={os === "all"} onClick={() => setOs("all")}>
          All
        </Chip>
        <Chip active={os === "ios"} onClick={() => setOs("ios")}>
          iOS
        </Chip>
        <Chip active={os === "android"} onClick={() => setOs("android")}>
          Android
        </Chip>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((w) => {
          const link = links.find((l) => l.wearableId === w.id && l.connected);
          const bits = link
            ? [
                link.sample.hr != null ? `${link.sample.hr} bpm` : null,
                link.sample.hrv != null ? `${link.sample.hrv} ms` : null,
                link.sample.cadence != null ? `${link.sample.cadence} rpm` : null,
                link.sample.power != null ? `${link.sample.power} W` : null,
              ].filter(Boolean)
            : [];
          return (
            <Card key={w.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-mute">
                  <span className={cn("h-1.5 w-1.5 rounded-full", link ? "bg-acid" : "bg-mute")} />
                  {w.maker} · {w.kind}
                  {link ? " · live" : w.kind === "platform" ? " · no GATT" : ""}
                </p>
                <h2 className="mt-1 text-lg">{w.name}</h2>
                <p className="mt-2 text-sm text-mute">{w.metrics.join(" · ")}</p>
                {bits.length ? <p className="mt-2 font-mono text-sm text-acid">{bits.join(" · ")}</p> : null}
              </div>
              {w.kind !== "platform" ? (
                <Button disabled={!canPair || bluetooth.pairing} onClick={() => void pairDevice(w.id)}>
                  {link ? "Paired" : "Pair Bluetooth"}
                </Button>
              ) : (
                <p className="max-w-[9rem] text-right text-xs text-mute">Doesn&apos;t stream here. Pair a BLE strap.</p>
              )}
            </Card>
          );
        })}
      </div>
      <Card className="p-6">
        <Eyebrow>Free live feeds · no API keys</Eyebrow>
        <p className="mt-2 text-sm text-mute">
          These public APIs power weather, the map, calorie search, recipes, and the exercise directory. They are not
          body sensors.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {feeds.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p>{f.name}</p>
                <p className="text-xs text-mute">{f.use}</p>
              </div>
              <span className={`font-mono text-xs ${f.ok ? "text-acid" : "text-heat"}`}>
                {f.ok ? `live ${f.ms}ms` : "down"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-6">
        <Eyebrow>What Bluetooth can and cannot do</Eyebrow>
        <p className="mt-3 max-w-3xl text-sm text-mute">
          Pact talks GATT over Web Bluetooth: heart rate, RR/HRV, cadence, cycling power, running speed, indoor bike
          (FTMS), battery, and SpO2 when the device exposes them. Polar H10, Garmin HRM, Wahoo TICKR, and most smart
          trainers work. Apple Watch, Oura, HealthKit, and some WHOOP units only speak to their own apps — those tiles
          stay listed so you know what to pair, but they do not get a fake stream. Pairing needs a user tap and HTTPS
          (this localhost counts).
        </p>
      </Card>
    </div>
  );
}

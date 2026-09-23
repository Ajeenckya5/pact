"use client";

import { Card, Eyebrow } from "@/components/ui";
import { extraWaterForHeat, formatTemp } from "@/lib/experience";
import { usePact } from "@/lib/store";
import { useLiveWeather } from "@/lib/use-live";
import Link from "next/link";

export function WeatherStrip() {
  const { here, weather, error, ready } = useLiveWeather();
  const units = usePact().prefs.units;

  if (!ready) {
    return (
      <Card className="p-4 text-sm text-mute">
        Set a location on{" "}
        <Link href="/map" className="text-acid">
          Places
        </Link>{" "}
        for live weather, or type a city there.
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-4 text-sm text-mute">
        Open-Meteo is quiet right now. Training advice will use your wearable scores only.
      </Card>
    );
  }
  if (!weather) {
    return <Card className="h-24 animate-pulse bg-white/5" />;
  }

  const train =
    weather.aqi != null && weather.aqi >= 150
      ? "Air is rough — keep it indoors."
      : weather.code >= 95
        ? "Storm risk. Lift inside."
        : weather.code >= 71
          ? "Cold/wet. Warm up longer."
          : weather.tempC >= 29
            ? "Hot. Extra water, easier first set."
            : "Good outdoor training weather.";

  const where =
    here.source === "device" ? "your GPS" : here.source === "search" ? here.label : here.label || "your area";

  return (
    <Card className="grid gap-4 p-5 sm:grid-cols-5">
      <div className="sm:col-span-2">
        <Eyebrow>Open-Meteo · {where}</Eyebrow>
        <p className="mt-2 font-mono text-3xl">
          {formatTemp(weather.tempC, units)} <span className="text-base text-mute">{weather.label}</span>
        </p>
        <p className="mt-1 text-sm text-mute">{train}</p>
        {extraWaterForHeat(weather.tempC) > 0 ? (
          <p className="mt-2 text-xs text-gold">Heat — extra water lives on the Water desk.</p>
        ) : null}
      </div>
      <Stat k="Feels" v={formatTemp(weather.feelsC, units)} />
      <Stat k="Humidity" v={`${weather.humidity}%`} />
      <Stat k="AQI / UV" v={`${weather.aqi ?? "—"} / ${weather.uv ?? "—"}`} />
    </Card>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{k}</p>
      <p className="mt-1 font-mono text-xl">{v}</p>
    </div>
  );
}

export function SunriseNote() {
  const { here, weather, ready } = useLiveWeather();
  if (!ready || !weather?.sunset) return null;
  const set = new Date(weather.sunset);
  const rise = weather.sunrise ? new Date(weather.sunrise) : null;
  return (
    <Card className="p-6">
      <Eyebrow>Sun clock · {here.label || "Open-Meteo"}</Eyebrow>
      <p className="mt-3 font-mono text-2xl">
        {rise ? rise.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}
        <span className="text-mute"> → </span>
        {set.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
      <p className="mt-2 text-sm text-mute">
        Start wind-down reading ~90 minutes before sunset. Screens off after that is the boring intervention that works.
      </p>
    </Card>
  );
}

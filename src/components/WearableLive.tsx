"use client";

import { Card, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useLiveTrack } from "@/lib/live-track-context";
import { useLiveBody } from "@/lib/wearable-live-context";
import Link from "next/link";

export function WearableLiveStrip() {
  const { body, links, pairDevice, bluetooth } = useLiveBody();
  const track = useLiveTrack();
  const paired = links.filter((l) => l.connected);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            {paired.length
              ? `Bluetooth · ${paired.length} ${paired.length === 1 ? "device" : "devices"}`
              : "No wearable connected"}
            {body.ticking ? " · streaming" : ""}
          </Eyebrow>
          <p className="mt-2 text-sm text-mute">
            {paired.length
              ? paired
                  .map((l) => {
                    const bits = [
                      l.sample.hr != null ? `${l.sample.hr} bpm` : null,
                      l.sample.hrv != null ? `${l.sample.hrv} ms HRV` : null,
                      l.sample.cadence != null ? `${l.sample.cadence} rpm` : null,
                      l.sample.power != null ? `${l.sample.power} W` : null,
                    ].filter(Boolean);
                    return `${l.name}${bits.length ? ` ${bits.join(" · ")}` : " · listening"}`;
                  })
                  .join(" · ")
              : "Pair a strap, bike, or cadence sensor. Heart rate shows up here after it connects."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={bluetooth.available === false || bluetooth.pairing}
            onClick={() => void pairDevice()}
            className="rounded-full bg-acid px-3 py-1.5 text-xs font-medium text-ink hover:bg-white disabled:opacity-40"
          >
            {bluetooth.pairing ? "Pairing…" : paired.length ? "Pair another" : "Connect Bluetooth"}
          </button>
          <Link href="/live" className="self-center text-xs text-acid">
            {track.tracking ? "Tracking…" : "Live track"}
          </Link>
          <Link href="/wearables" className="self-center text-xs text-acid">
            Wearables
          </Link>
        </div>
      </div>
      {paired.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {paired.map((l) => (
            <div key={l.id} className="min-w-[148px] shrink-0 rounded-2xl border border-line bg-white/3 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-mute">
                <span className={cn("h-1.5 w-1.5 rounded-full", l.connected ? "bg-acid" : "bg-mute")} />
                {l.name}
              </p>
              <p className="mt-1 font-mono text-sm">
                {[
                  l.sample.hr != null ? `${l.sample.hr} bpm` : null,
                  l.sample.cadence != null ? `${l.sample.cadence} rpm` : null,
                  l.sample.power != null ? `${l.sample.power} W` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "listening"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

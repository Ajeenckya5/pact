"use client";

import { PlaceMap } from "@/components/PlaceMap";
import { Button, Card, Eyebrow, Stat } from "@/components/ui";
import { useLiveTrack } from "@/lib/live-track-context";
import { onNativeApp, runtimeLabel } from "@/lib/runtime";
import { useCoords } from "@/lib/use-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import { Navigation } from "lucide-react";
import Link from "next/link";

export default function LivePage() {
  const here = useCoords();
  const { body, pairDevice, bluetooth, links } = useLiveBody();
  const track = useLiveTrack();
  const pts = track.session?.points ?? [];
  const last = track.last;
  const mapHere = last ?? (here.lat != null && here.lng != null ? { lat: here.lat, lng: here.lng } : null);
  const endAt =
    track.session?.endedAt ?? last?.t ?? track.session?.samples.at(-1)?.t ?? track.session?.startedAt ?? 0;
  const minutes = track.session ? Math.max(0, Math.round((endAt - track.session.startedAt) / 60000)) : 0;
  const hrs = (track.session?.samples ?? []).map((s) => s.hr).filter((n): n is number => n != null);
  const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
  const paired = links.some((l) => l.connected);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {runtimeLabel()} · {track.tracking ? "recording" : track.session?.endedAt ? "last session" : "idle"}
          </Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Live track from the device you paired.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            GPS from this phone. Heart rate, cadence, and power come from the Bluetooth strap you pair.
            apps. Allow Location and Nearby devices when Android asks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={bluetooth.available === false || bluetooth.pairing}
            onClick={() => void pairDevice()}
          >
            {bluetooth.pairing ? "Waiting…" : paired ? "Paired" : "Connect Bluetooth"}
          </Button>
          {track.tracking ? (
            <Button tone="danger" onClick={track.stop}>
              Stop and save
            </Button>
          ) : (
            <Button onClick={() => void track.start()}>
              <Navigation className="h-4 w-4" />
              Start live track
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Distance" value={track.session ? `${track.session.km.toFixed(2)} km` : "—"} />
        <Stat label="Time" value={minutes ? `${minutes} min` : "—"} />
        <Stat
          label="Heart rate"
          value={body.hr != null ? `${body.hr}` : "—"}
          hint={paired ? "from the strap" : "pair a BLE strap"}
        />
        <Stat label="Avg HR" value={avgHr != null ? `${avgHr}` : "—"} hint={hrs.length ? `${hrs.length} samples` : "no samples yet"} />
      </div>

      {mapHere ? (
        <div className="h-[480px]">
          <PlaceMap
            filter="all"
            onSelect={() => {}}
            places={[]}
            here={mapHere}
            flyTo={mapHere}
            youLabel={track.tracking ? "You · live" : "You"}
            track={pts}
          />
        </div>
      ) : (
        <Card className="p-6 text-sm text-mute">
          Allow location (Privacy → approximate or precise) so the trail can draw.{" "}
          <Link href="/privacy" className="text-acid">
            Privacy
          </Link>
        </Card>
      )}

      <Card className="p-5 text-sm text-mute">
        {onNativeApp()
          ? "This APK talks native Bluetooth Low Energy. Keep the screen on during a track. Background recording needs a later Android foreground service."
          : "On GitHub Pages, use Chrome or Edge. Safari cannot pair. The Android APK from GitHub Releases is the build that can keep BLE + GPS on a phone."}
        {body.cadence != null ? ` Cadence ${body.cadence} rpm.` : ""}
        {body.power != null ? ` Power ${body.power} W.` : ""}
      </Card>
    </div>
  );
}

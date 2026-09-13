"use client";

import { ClipResult, ClipScanButton } from "@/components/ClipScan";
import { LocationBar } from "@/components/LocationBar";
import { PlaceMap } from "@/components/PlaceMap";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import type { AppPhotoScan } from "@/lib/app-vision";
import { usePact } from "@/lib/store";
import type { PlaceKind } from "@/lib/types";
import { useNearbyPlaces } from "@/lib/use-live";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function MapInner() {
  const store = usePact();
  const params = useSearchParams();
  const fromUrl = params.get("kind");
  const [filter, setFilter] = useState<"all" | PlaceKind>(
    fromUrl === "gym" || fromUrl === "grocery" ? fromUrl : "all",
  );
  const { here, places, liveOk, retry } = useNearbyPlaces(filter);
  const [picked, setPicked] = useState<{ loc: string; id: string } | null>(null);
  const [clip, setClip] = useState<{ scan: AppPhotoScan; preview: string } | null>(null);
  const locKey = here.ready && here.lat != null && here.lng != null ? `${here.lat},${here.lng}` : "";
  const selected =
    picked?.loc === locKey ? (places.find((p) => p.id === picked.id) ?? places[0]) : places[0];
  const flyTo =
    picked?.loc === locKey && selected
      ? { lat: selected.lat, lng: selected.lng }
      : here.lat != null && here.lng != null
        ? { lat: here.lat, lng: here.lng }
        : null;
  const locOn = store.privacy.location !== "off";
  const youLabel =
    here.source === "search"
      ? `You · ${here.label}`
      : store.privacy.location === "precise" && here.source === "device"
        ? "You · precise GPS"
        : here.source === "device"
          ? "You · approximate location"
          : here.ready
            ? `You · ${here.label}`
            : "You";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Eyebrow>Places · OpenStreetMap</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Gyms and grocers, on the same map.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          Pins load from OpenStreetMap around your GPS or a city you search — nothing is pre-pinned to San Francisco.
          Scan a storefront and CLIP sets Gyms or Grocery.{" "}
          {liveOk === true ? " OSM feed is up." : liveOk === false ? " OSM timed out. Retry or pick another area." : ""}
        </p>
      </div>
      <LocationBar />
      {!locOn ? (
        <Card className="p-4 text-sm">
          Device GPS is off. Search a city above, or turn sharing on in{" "}
          <Link href="/privacy" className="text-acid">
            Privacy
          </Link>
          .
        </Card>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "gym", "grocery"] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "gym" ? "Gyms" : "Grocery"}
          </Chip>
        ))}
        <ClipScanButton
          label="Scan a place"
          onScan={(scan, _file, preview) => {
            setClip({ scan, preview });
            if (scan.kind === "place-gym") setFilter("gym");
            if (scan.kind === "place-grocery") setFilter("grocery");
          }}
        />
      </div>
      {clip ? (
        <Card className="p-5">
          <ClipResult
            scan={clip.scan}
            preview={clip.preview}
            extra={
              <Button type="button" tone="ghost" onClick={() => setClip(null)}>
                Dismiss
              </Button>
            }
          />
        </Card>
      ) : null}
      {!here.ready ? (
        <Card className="p-6 text-sm text-mute">
          Use your location or search a city to load gyms and grocers near you.
        </Card>
      ) : liveOk === false ? (
        <Card className="p-6 text-sm text-mute">
          OpenStreetMap didn&apos;t answer. Pact will not fall back to a preset city.{" "}
          <button type="button" className="text-acid" onClick={retry}>
            Retry
          </button>
        </Card>
      ) : liveOk === null ? (
        <Card className="h-[480px] animate-pulse bg-white/5" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-[480px] lg:col-span-7">
              {flyTo ? (
                <PlaceMap
                  key={locKey}
                  filter={filter}
                  selectedId={picked?.loc === locKey ? picked.id : undefined}
                  onSelect={(p) => setPicked({ loc: locKey, id: p.id })}
                  places={places}
                  here={{ lat: here.lat!, lng: here.lng! }}
                  flyTo={flyTo}
                  youLabel={youLabel}
                />
              ) : null}
            </div>
            <Card className="max-h-[480px] overflow-y-auto lg:col-span-5">
              {places.length === 0 ? (
                <p className="p-5 text-sm text-mute">
                  No gyms or grocers in OSM within 6 km of {here.label}.{" "}
                  <button type="button" className="text-acid" onClick={retry}>
                    Retry
                  </button>
                </p>
              ) : (
                places.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicked({ loc: locKey, id: p.id })}
                    className={`w-full border-b border-line px-5 py-4 text-left hover:bg-white/3 ${selected?.id === p.id ? "bg-white/5" : ""}`}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="font-mono text-xs text-mute">{p.km.toFixed(1)} km</p>
                    </div>
                    <p className="text-xs text-mute">
                      {p.kind} · {p.area} · {p.hours}
                    </p>
                  </button>
                ))
              )}
            </Card>
          </div>
          {selected ? (
            <Card className="p-6">
              <Eyebrow>{selected.kind === "gym" ? "Gym" : "Grocery"}</Eyebrow>
              <h2 className="mt-2 text-2xl">{selected.name}</h2>
              <p className="mt-2 text-sm text-mute">
                {selected.area} · {selected.hours} · {selected.tags.join(" · ")} · {selected.km.toFixed(1)} km
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.kind === "grocery" ? (
                  <Link
                    href={`/fuel?store=${encodeURIComponent(selected.id)}`}
                    onClick={() => store.setStore(selected.id)}
                    className="inline-flex items-center justify-center rounded-full bg-acid px-4 py-2 text-sm font-medium text-ink"
                  >
                    Shop this store
                  </Link>
                ) : (
                  <Link
                    href="/workouts"
                    className="inline-flex items-center justify-center rounded-full bg-acid px-4 py-2 text-sm font-medium text-ink"
                  >
                    Find a session nearby
                  </Link>
                )}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<p className="text-mute">Loading places…</p>}>
      <MapInner />
    </Suspense>
  );
}

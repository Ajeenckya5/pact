"use client";

import { Button, Card, Chip, Field } from "@/components/ui";
import type { GeoHit } from "@/lib/free-apis";
import { clientGeocode } from "@/lib/live-client";
import { useCoords } from "@/lib/use-live";
import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function LocationBar({ hint }: { hint?: string }) {
  const here = useCoords();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);

  function lookup() {
    const needle = q.trim();
    if (needle.length < 2) return;
    setSearching(true);
    void clientGeocode(needle)
      .then((d) => setHits(d.hits ?? []))
      .catch(() => setHits([]))
      .then(() => setSearching(false));
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {here.ready ? here.label : here.locating ? "Finding you…" : "Where should Pact look?"}
          </p>
          <p className="mt-1 text-xs text-mute">
            {hint ?? "Gyms and grocers load from OpenStreetMap around you — not a preset city."}{" "}
            {here.source === "device"
              ? "Using GPS."
              : here.source === "search"
                ? "Using the place you picked."
                : here.source === "saved"
                  ? "Using a saved area."
                  : here.denied
                    ? "GPS blocked — search a city."
                    : ""}
          </p>
        </div>
        <Button tone="ghost" onClick={() => here.locate()} disabled={here.locating}>
          <LocateFixed className="h-4 w-4" />
          Use my location
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Field
          className="min-w-[220px] flex-1"
          placeholder="City, neighborhood, or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") lookup();
          }}
        />
        <Button onClick={lookup} disabled={searching || q.trim().length < 2}>
          {searching ? "Searching" : "Search"}
        </Button>
      </div>
      {hits.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {hits.map((h) => (
            <Chip
              key={`${h.lat},${h.lng}`}
              active={here.lat === h.lat && here.lng === h.lng}
              onClick={() => {
                here.pick(h);
                setHits([]);
                setQ(h.name);
              }}
            >
              {h.name}
            </Chip>
          ))}
        </div>
      ) : null}
      {here.denied && !here.ready ? (
        <p className="mt-3 text-xs text-mute">
          Location is off or blocked. Search a city, or turn sharing on in{" "}
          <Link href="/privacy" className="text-acid">
            Privacy
          </Link>
          .
        </p>
      ) : null}
    </Card>
  );
}

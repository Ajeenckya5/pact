"use client";

import { haversineKm } from "@/lib/data";
import { readFix } from "@/lib/device-location";
import type { LiveWeather } from "@/lib/free-apis";
import { clientPlaces, clientReverse, clientWeather } from "@/lib/live-client";
import { usePact } from "@/lib/store";
import type { Place } from "@/lib/types";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const HERE_KEY = "pact.here.v1";

export type HereSource = "device" | "search" | "saved";

export type Here = {
  lat: number;
  lng: number;
  label: string;
  source: HereSource;
};

export type Coords = {
  lat: number | undefined;
  lng: number | undefined;
  label: string;
  source: HereSource | undefined;
  ready: boolean;
  locating: boolean;
  denied: boolean;
  locate: () => void;
  pick: (hit: { name: string; lat: number; lng: number }) => void;
};

const LocationCtx = createContext<Coords | null>(null);

function readSaved(): Here | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HERE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Here>;
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    const source: HereSource =
      parsed.source === "search" ? "search" : parsed.source === "device" ? "device" : "saved";
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      label: parsed.label || "Saved area",
      source,
    };
  } catch {
    return null;
  }
}

function writeSaved(here: Here) {
  try {
    localStorage.setItem(HERE_KEY, JSON.stringify(here));
  } catch {
    /* private mode */
  }
}

function fuzz(lat: number, lng: number, approximate: boolean) {
  if (!approximate) return { lat, lng };
  const step = 0.008;
  return { lat: Math.round(lat / step) * step, lng: Math.round(lng / step) * step };
}

function useCoordsState(): Coords {
  const { privacy } = usePact();
  const [here, setHere] = useState<Here | null>(() => readSaved());
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  function apply(next: Here) {
    setHere(next);
    writeSaved(next);
  }

  function locate() {
    if (privacy.location === "off") {
      setDenied(true);
      return;
    }
    setLocating(true);
    const approx = privacy.location !== "precise";
    void readFix(!approx)
      .then((fix) => {
        const { lat, lng } = fuzz(fix.lat, fix.lng, approx);
        apply({ lat, lng, label: "Your area", source: "device" });
        setDenied(false);
        setLocating(false);
        void clientReverse(lat, lng)
          .then((d) => {
            if (!d.label) return;
            const label = d.label;
            setHere((current) => {
              if (!current || current.source === "search") return current;
              if (current.lat !== lat || current.lng !== lng) return current;
              const next = { ...current, label };
              writeSaved(next);
              return next;
            });
          })
          .catch(() => {});
      })
      .catch(() => {
        setDenied(true);
        setLocating(false);
      });
  }

  function pick(hit: { name: string; lat: number; lng: number }) {
    apply({ lat: hit.lat, lng: hit.lng, label: hit.name, source: "search" });
    setDenied(false);
  }

  useEffect(() => {
    if (privacy.location === "off") return;
    const approx = privacy.location !== "precise";
    let alive = true;
    void readFix(!approx)
      .then((fix) => {
        if (!alive) return;
        const { lat, lng } = fuzz(fix.lat, fix.lng, approx);
        setHere((current) => {
          if (current) return current;
          const next: Here = { lat, lng, label: "Your area", source: "device" };
          writeSaved(next);
          return next;
        });
        setDenied(false);
        void clientReverse(lat, lng)
          .then((d) => {
            if (!d.label || !alive) return;
            const label = d.label;
            setHere((current) => {
              if (!current || current.source === "search") return current;
              if (current.lat !== lat || current.lng !== lng) return current;
              const next = { ...current, label };
              writeSaved(next);
              return next;
            });
          })
          .catch(() => {});
      })
      .catch(() => {
        if (alive) setDenied(true);
      });
    return () => {
      alive = false;
    };
  }, [privacy.location]);

  return {
    lat: here?.lat,
    lng: here?.lng,
    label: here?.label ?? "",
    source: here?.source,
    ready: Boolean(here),
    locating,
    denied,
    locate,
    pick,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const value = useCoordsState();
  return createElement(LocationCtx.Provider, { value }, children);
}

export function useCoords(): Coords {
  const ctx = useContext(LocationCtx);
  if (!ctx) throw new Error("useCoords must be used within LocationProvider");
  return ctx;
}

export function useNearbyPlaces(kind: "all" | "gym" | "grocery") {
  const here = useCoords();
  const [bundle, setBundle] = useState<{
    key: string;
    places: Array<Place & { km: number }>;
    ok: boolean;
  } | null>(null);
  const [tick, setTick] = useState(0);
  const locKey =
    here.ready && here.lat != null && here.lng != null ? `${here.lat},${here.lng},${kind}:${tick}` : "";

  useEffect(() => {
    if (!here.ready || here.lat == null || here.lng == null) return;
    let alive = true;
    const lat = here.lat;
    const lng = here.lng;
    const key = `${lat},${lng},${kind}:${tick}`;
    clientPlaces(lat, lng, kind)
      .then((d) => {
        if (!alive) return;
        const origin = { lat, lng };
        setBundle({
          key,
          ok: true,
          places: (d.places ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            lat: p.lat,
            lng: p.lng,
            area: p.area,
            hours: p.hours,
            rating: p.rating,
            tags: p.tags,
            km: haversineKm(origin, p),
          })),
        });
      })
      .catch(() => {
        if (alive) setBundle({ key, places: [], ok: false });
      });
    return () => {
      alive = false;
    };
  }, [here.ready, here.lat, here.lng, kind, tick]);

  const matched = bundle?.key === locKey ? bundle : null;
  return {
    here,
    places: matched?.places ?? [],
    liveOk: locKey ? (matched ? matched.ok : null) : null,
    retry: () => setTick((n) => n + 1),
  };
}

export async function liveGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(path);
  return res.json() as Promise<T>;
}

const weatherWait = new Map<string, Promise<{ weather: LiveWeather }>>();

export function fetchLiveWeather(lat: number, lng: number) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  let pending = weatherWait.get(key);
  if (!pending) {
    pending = clientWeather(lat, lng);
    weatherWait.set(key, pending);
    pending.finally(() => {
      const clear = () => {
        if (weatherWait.get(key) === pending) weatherWait.delete(key);
      };
      if (typeof window !== "undefined") window.setTimeout(clear, 30_000);
      else clear();
    });
  }
  return pending;
}

export function useLiveWeather() {
  const here = useCoords();
  const [bundle, setBundle] = useState<{ key: string; weather: LiveWeather | null; error: boolean } | null>(null);
  const locKey = here.ready && here.lat != null && here.lng != null ? `${here.lat.toFixed(3)},${here.lng.toFixed(3)}` : "";

  useEffect(() => {
    if (!here.ready || here.lat == null || here.lng == null) return;
    let alive = true;
    const lat = here.lat;
    const lng = here.lng;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    fetchLiveWeather(lat, lng)
      .then((d) => {
        if (alive) setBundle({ key, weather: d.weather, error: false });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (alive) setBundle({ key, weather: null, error: true });
      });
    return () => {
      alive = false;
    };
  }, [here.ready, here.lat, here.lng]);

  const matched = bundle?.key === locKey ? bundle : null;
  return {
    here,
    ready: here.ready,
    loading: Boolean(here.ready && locKey && !matched),
    weather: matched?.weather ?? null,
    error: matched?.error ?? false,
  };
}

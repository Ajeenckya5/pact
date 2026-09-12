"use client";

import { fitnessRadio, type BleSample } from "@/lib/bluetooth-fitness";
import { haversineKm } from "@/lib/data";
import { watchFix, type GeoFix } from "@/lib/device-location";
import { usePact } from "@/lib/store";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TrackPoint = {
  t: number;
  lat: number;
  lng: number;
  accuracy?: number;
  hr?: number;
  cadence?: number;
  power?: number;
  speedKmh?: number;
};

export type TrackSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  points: TrackPoint[];
  samples: Array<{ t: number } & BleSample>;
  km: number;
};

type LiveTrackValue = {
  tracking: boolean;
  session: TrackSession | null;
  last: TrackPoint | null;
  start: () => Promise<void>;
  stop: () => void;
};

const Ctx = createContext<LiveTrackValue | null>(null);
const KEY = "pact.track.v1";

function kmOf(points: TrackPoint[]) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return Math.round(km * 1000) / 1000;
}

function readSaved(): TrackSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrackSession;
  } catch {
    return null;
  }
}

function writeSaved(session: TrackSession) {
  try {
    const slim: TrackSession = {
      ...session,
      points: session.points.slice(-800),
      samples: session.samples.slice(-800),
    };
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch {
    /* quota */
  }
}

export function LiveTrackProvider({ children }: { children: ReactNode }) {
  const store = usePact();
  const [session, setSession] = useState<TrackSession | null>(() => readSaved());
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (session) writeSaved(session);
  }, [session]);

  const start = useCallback(async () => {
    if (tracking) return;
    if (store.privacy.location === "off") {
      store.flash("Turn location on in Privacy to live-track.");
      return;
    }
    const now = Date.now();
    setSession({ id: `trk-${now}`, startedAt: now, points: [], samples: [], km: 0 });
    setTracking(true);
    store.flash("Live track on — GPS + the paired strap.");
  }, [tracking, store]);

  const stop = useCallback(() => {
    if (!tracking || !session) return;
    const endedAt = session.points.at(-1)?.t ?? session.samples.at(-1)?.t ?? session.startedAt;
    const minutes = Math.max(1, Math.round((endedAt - session.startedAt) / 60000));
    const km = kmOf(session.points);
    const hrs = session.samples.map((s) => s.hr).filter((n): n is number => n != null);
    const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
    setTracking(false);
    setSession({ ...session, endedAt, km });
    store.completeWorkout(Math.max(20, Math.round(km * 65 + minutes * 4)), minutes, {
      title: avgHr ? `Live track · ${avgHr} bpm` : `Live track · ${km.toFixed(2)} km`,
      category: "Cardio",
      source: "manual",
      workoutId: "live-track",
    });
  }, [tracking, session, store]);

  useEffect(() => {
    if (!tracking) return;
    const precise = store.privacy.location === "precise";
    let latest: BleSample = { at: 0 };
    let lastSampleAt = 0;
    const unwatch = watchFix(
      precise,
      (fix: GeoFix) => {
        setSession((cur) => {
          if (!cur || cur.endedAt) return cur;
          const point: TrackPoint = {
            t: latest.at || cur.startedAt,
            lat: fix.lat,
            lng: fix.lng,
            accuracy: fix.accuracy,
            hr: latest.hr,
            cadence: latest.cadence,
            power: latest.power,
            speedKmh:
              latest.speedKmh ??
              (fix.speedMps != null && fix.speedMps > 0 ? Math.round(fix.speedMps * 3.6 * 10) / 10 : undefined),
          };
          const prev = cur.points.at(-1)?.t ?? cur.startedAt;
          const stamped = { ...point, t: point.t > 0 ? Math.max(point.t, prev) : prev + 1000 };
          const points = [...cur.points, stamped].slice(-2000);
          return { ...cur, points, km: kmOf(points) };
        });
      },
      () => store.flash("GPS denied — HR from the strap still records."),
    );
    const unsub = fitnessRadio.subscribe((links) => {
      const live = links.find((l) => l.connected);
      if (!live) return;
      latest = live.sample;
      const at = live.sample.at;
      if (at - lastSampleAt < 1000) return;
      lastSampleAt = at;
      setSession((cur) => {
        if (!cur || cur.endedAt) return cur;
        return { ...cur, samples: [...cur.samples, { ...live.sample, t: at }].slice(-2000) };
      });
    });
    return () => {
      unwatch();
      unsub();
    };
  }, [tracking, store]);

  const last = session?.points[session.points.length - 1] ?? null;
  const value = useMemo(
    () => ({ tracking, session, last, start, stop }),
    [tracking, session, last, start, stop],
  );
  return createElement(Ctx.Provider, { value }, children);
}

export function useLiveTrack() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLiveTrack needs LiveTrackProvider");
  return ctx;
}

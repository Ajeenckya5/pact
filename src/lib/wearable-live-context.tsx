"use client";

import {
  bluetoothAvailable,
  bluetoothSupported,
  fitnessRadio,
  type BleLink,
} from "@/lib/bluetooth-fitness";
import { usePact } from "@/lib/store";
import { fuseLive, type LiveBody } from "@/lib/wearable-live";
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

type WearableLiveValue = {
  body: LiveBody;
  links: BleLink[];
  bluetooth: { supported: boolean; available: boolean | null; pairing: boolean; error: string | null };
  pairDevice: (wearableId?: string) => Promise<void>;
  disconnectDevice: (id: string) => void;
};

const Ctx = createContext<WearableLiveValue | null>(null);

export function WearableLiveProvider({ children }: { children: ReactNode }) {
  const store = usePact();
  const [now, setNow] = useState(0);
  const [links, setLinks] = useState<BleLink[]>([]);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  const period = store.prefs.reducedMotion ? 12000 : 4000;
  const hasBle = links.some((l) => l.connected);

  useEffect(() => {
    let alive = true;
    const start = window.setTimeout(() => {
      if (alive) setNow(Date.now());
    }, 0);
    if (!hasBle) {
      return () => {
        alive = false;
        window.clearTimeout(start);
      };
    }
    const tick = window.setInterval(() => {
      if (alive) setNow(Date.now());
    }, period);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, [period, hasBle]);

  useEffect(() => {
    let alive = true;
    const unsub = fitnessRadio.subscribe((next) => {
      if (alive) setLinks(next);
    });
    bluetoothAvailable()
      .then((ok) => {
        if (alive) setAvailable(ok);
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    fitnessRadio.restore().catch(() => {});
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const body = useMemo(
    () =>
      fuseLive({
        baseline: {
          recovery: store.recovery,
          strain: store.strain,
          sleepScore: store.sleepScore,
          sleepMin: store.sleepMin,
          hrv: store.hrv,
          rhr: store.rhr,
          steps: store.steps,
        },
        now,
        bleLinks: links,
      }),
    [
      store.recovery,
      store.strain,
      store.sleepScore,
      store.sleepMin,
      store.hrv,
      store.rhr,
      store.steps,
      now,
      links,
    ],
  );

  const pairDevice = useCallback(
    async (wearableId?: string) => {
      setPairing(true);
      setError(null);
      try {
        const link = await fitnessRadio.pair({ wearableId });
        const mapped = link.wearableId ?? wearableId;
        if (mapped && !store.connectedWearables.includes(mapped)) store.toggleWearable(mapped);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bluetooth pairing failed";
        if (msg !== "cancelled") setError(msg);
      } finally {
        setPairing(false);
      }
    },
    [store],
  );

  const disconnectDevice = useCallback((id: string) => {
    fitnessRadio.disconnect(id);
  }, []);

  const value = useMemo(
    () => ({
      body,
      links,
      bluetooth: {
        supported: bluetoothSupported(),
        available,
        pairing,
        error,
      },
      pairDevice,
      disconnectDevice,
    }),
    [body, links, available, pairing, error, pairDevice, disconnectDevice],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useLiveBody() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLiveBody needs WearableLiveProvider");
  return ctx;
}

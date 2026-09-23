"use client";

import { PactLive } from "@/components/PactLive";
import { PactProvider, usePact } from "@/lib/store";
import { LiveTrackProvider } from "@/lib/live-track-context";
import { LocationProvider } from "@/lib/use-live";
import { WearableLiveProvider } from "@/lib/wearable-live-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PactProvider>
      <PactLive>
        <LocationProvider>
          <WearableLiveProvider>
            <LiveTrackProvider>{children}</LiveTrackProvider>
          </WearableLiveProvider>
        </LocationProvider>
      </PactLive>
    </PactProvider>
  );
}

export function ToastHost() {
  const { toast, canRedo, redo } = usePact();
  if (!toast) return null;
  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-acid px-5 py-2 text-sm font-medium text-ink shadow-lg" role="status" aria-live="polite">
      <span>{toast}</span>
      {canRedo ? (
        <button type="button" className="min-h-11 underline" onClick={() => redo()}>
          Redo
        </button>
      ) : null}
    </div>
  );
}

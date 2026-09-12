"use client";

import { PactProvider, usePact } from "@/lib/store";
import { LocationProvider } from "@/lib/use-live";
import { WearableLiveProvider } from "@/lib/wearable-live-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PactProvider>
      <LocationProvider>
        <WearableLiveProvider>{children}</WearableLiveProvider>
      </LocationProvider>
    </PactProvider>
  );
}

export function ToastHost() {
  const { toast } = usePact();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-acid px-5 py-2 text-sm font-medium text-ink shadow-lg" role="status" aria-live="polite">
      {toast}
    </div>
  );
}

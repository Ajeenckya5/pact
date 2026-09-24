"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { clearBrowserData, enforceStorageBudget, formatStorageMb, storageUsage } from "@/lib/storage-budget";
import { usePact } from "@/lib/store";
import { useEffect, useState } from "react";

export function StorageMeter() {
  const store = usePact();
  const [bytes, setBytes] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void enforceStorageBudget().then((usage) => {
      if (!cancelled) setBytes(usage);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function clear() {
    await clearBrowserData();
    store.eraseAll();
    setBytes(await storageUsage());
    setConfirming(false);
    window.location.reload();
  }

  return (
    <Card className="space-y-3 p-6">
      <Eyebrow>Settings</Eyebrow>
      <p data-storage-used={bytes ?? 0}>Storage used: {bytes === null ? "…" : formatStorageMb(bytes)}</p>
      {confirming ? (
        <div className="space-y-3" role="dialog" aria-labelledby="clear-app-data-title">
          <p id="clear-app-data-title" className="text-sm text-mute">
            Clear app data on this device? Logs, caches, and settings on this browser are removed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" tone="danger" onClick={() => void clear()}>
              Clear app data
            </Button>
            <Button type="button" tone="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" tone="danger" onClick={() => setConfirming(true)}>
          Clear app data
        </Button>
      )}
    </Card>
  );
}

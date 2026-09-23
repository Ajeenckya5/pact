"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { usePact } from "@/lib/store";

export default function DeletePage() {
  const store = usePact();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Eyebrow>Delete</Eyebrow>
      <Card className="space-y-4 p-6">
        <h1 className="font-display text-3xl tracking-tight">Delete my data and leave all pacts.</h1>
        <p className="text-sm text-mute">This wipes the log on this device. A server pact is wiped when its room is deleted.</p>
        <Button type="button" tone="danger" onClick={() => store.eraseAll()}>
          Erase everything
        </Button>
      </Card>
    </div>
  );
}

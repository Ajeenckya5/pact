"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { formatWater, waterAdds } from "@/lib/experience";
import { usePact } from "@/lib/store";
import Link from "next/link";

export default function LogPage() {
  const store = usePact();
  const adds = waterAdds(store.prefs.units);
  const last = [...(store.waterLog ?? [])].sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  const undo = last ? formatWater(last.ml, store.prefs.units) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Log</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Water, food, and sleep.</h1>
      </div>
      <Card className="space-y-3 p-6">
        <p className="text-sm text-mute">Water today: {store.waterMl} ml</p>
        <div className="flex flex-wrap gap-2">
          {adds.map((add) => (
            <Button key={add.ml} type="button" onClick={() => store.addWater(add.ml)}>
              {add.label}
            </Button>
          ))}
          <Button type="button" tone="quiet" disabled={!last} onClick={() => store.undoWater()}>
            {undo ? `Undo ${undo.value} ${undo.unit}` : "Nothing to undo"}
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/calories">
          Food
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/sleep">
          Sleep
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/water">
          Water details
        </Link>
      </div>
    </div>
  );
}

"use client";

import { Button, Chip } from "@/components/ui";
import {
  marketIdForPantry,
  mealFromPhoto,
  identifyPhoto,
  type AppPhotoScan,
} from "@/lib/app-vision";
import { CLIP_DOWNLOAD_MB, allowClipDownload, clipAllowed } from "@/lib/plate-net";
import { usePact } from "@/lib/store";
import { Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

export function ClipScanButton({
  label = "Scan a photo",
  onScan,
  tone = "ghost",
}: {
  label?: string;
  onScan?: (scan: AppPhotoScan, file: File, preview: string) => void;
  tone?: "accent" | "ghost";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);

  async function onFile(file: File) {
    setErr(null);
    const preview = URL.createObjectURL(file);
    try {
      const scan = await identifyPhoto(file, setPhase);
      onScan?.(scan, file, preview);
    } catch {
      setErr("Could not read that photo.");
    } finally {
      setPhase(null);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        tone={tone}
        disabled={Boolean(phase)}
        onClick={() => {
          if (!clipAllowed()) {
            setAsk(true);
            return;
          }
          ref.current?.click();
        }}
      >
        <Camera className="h-4 w-4" />
        {phase ?? label}
      </Button>
      {ask ? (
        <span className="max-w-xs text-xs text-mute">
          This downloads about {CLIP_DOWNLOAD_MB} MB and keeps the photo on this device.
          <Button
            type="button"
            className="mt-2"
            onClick={() => {
              allowClipDownload();
              setAsk(false);
              ref.current?.click();
            }}
          >
            Download on this connection
          </Button>
        </span>
      ) : null}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
      {err ? <span className="text-xs text-heat">{err}</span> : null}
    </span>
  );
}

export function ClipResult({
  scan,
  preview,
  extra,
}: {
  scan: AppPhotoScan;
  preview?: string | null;
  extra?: ReactNode;
}) {
  const store = usePact();
  const router = useRouter();
  const meal = mealFromPhoto(scan, preview ?? undefined);
  const cartId = marketIdForPantry(scan.food?.ranked[0]?.pantryId);
  const workout = scan.workout?.[0];

  return (
    <div className="space-y-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-40 w-full rounded-2xl object-cover" />
      ) : null}
      <p className="text-sm text-cream">
        {scan.caption}
        <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-mute">
          CLIP · {Math.round(scan.confidence * 100)}%
        </span>
      </p>
      {scan.kind === "food" && scan.food ? (
        <div className="flex flex-wrap gap-2">
          {scan.food.ranked.slice(0, 4).map((c) => (
            <Chip key={c.id}>{c.name}</Chip>
          ))}
        </div>
      ) : null}
      {scan.kind === "workout" && scan.workout ? (
        <div className="flex flex-wrap gap-2">
          {scan.workout.slice(0, 4).map((w) => (
            <Chip key={w.id} onClick={() => router.push(w.href)}>
              {w.name}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {meal && (scan.kind === "food" || scan.kind === "grocery") ? (
          <Button
            type="button"
            onClick={() => {
              store.addMeal(meal);
            }}
          >
            Log {meal.kcal} kcal
          </Button>
        ) : null}
        {scan.kind === "grocery" && cartId ? (
          <Button
            type="button"
            tone="ghost"
            onClick={() => {
              store.addToCart(cartId);
              store.flash(`Added ${scan.caption} to the cart`);
            }}
          >
            Add to cart
          </Button>
        ) : null}
        {workout ? (
          <Link href={workout.href}>
            <Button type="button" tone="ghost">
              Open {workout.name}
            </Button>
          </Link>
        ) : null}
        {scan.kind === "place-gym" ? (
          <Link href="/map?kind=gym">
            <Button type="button">Gyms on the map</Button>
          </Link>
        ) : null}
        {scan.kind === "place-grocery" ? (
          <Link href="/map?kind=grocery">
            <Button type="button">Grocers on the map</Button>
          </Link>
        ) : null}
        {extra}
      </div>
      <details className="rounded-2xl border border-line bg-ink/60 p-3">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-mute">Proof</summary>
        <ul className="mt-2 space-y-1 text-xs text-mute">
          {scan.proof.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

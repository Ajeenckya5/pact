"use client";

import { MUSCLE_META, WGER_BODY, overlayUrl, type MuscleId } from "@/lib/muscles";
import { cn } from "@/lib/cn";

export function MuscleMap({
  primary = [],
  secondary = [],
  size = "hero",
  className,
}: {
  primary?: MuscleId[];
  secondary?: MuscleId[];
  size?: "card" | "hero";
  className?: string;
}) {
  const all = [...primary, ...secondary];
  const frontHits = all.filter((id) => MUSCLE_META[id]?.front).length;
  const backHits = all.filter((id) => MUSCLE_META[id] && !MUSCLE_META[id].front).length;
  const plates: Array<"front" | "back"> =
    size === "card" ? [backHits > frontHits ? "back" : "front"] : ["front", "back"];

  return (
    <div className={cn("flex items-end justify-center gap-3", className)} aria-hidden={size === "card"}>
      {plates.map((side) => (
        <Plate
          key={side}
          side={side}
          primary={primary}
          secondary={secondary}
          size={size}
        />
      ))}
    </div>
  );
}

function Plate({
  side,
  primary,
  secondary,
  size,
}: {
  side: "front" | "back";
  primary: MuscleId[];
  secondary: MuscleId[];
  size: "card" | "hero";
}) {
  const base = side === "front" ? WGER_BODY.front : WGER_BODY.back;
  const mains = primary.filter((id) => MUSCLE_META[id] && MUSCLE_META[id].front === (side === "front"));
  const extras = secondary.filter((id) => MUSCLE_META[id] && MUSCLE_META[id].front === (side === "front"));
  const label = side === "front" ? "Front" : "Back";

  return (
    <figure className="text-center">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-[#efe8d6]",
          size === "card" ? "h-24 w-[4.5rem]" : "h-72 w-44 sm:h-80 sm:w-48",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={base} alt="" className="absolute inset-0 h-full w-full object-contain" />
        {extras.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`s-${id}`}
            src={overlayUrl(MUSCLE_META[id].wger, "secondary")}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        ))}
        {mains.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`m-${id}`}
            src={overlayUrl(MUSCLE_META[id].wger, "main")}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
          />
        ))}
      </div>
      {size === "hero" ? <figcaption className="mt-2 text-[11px] uppercase tracking-[0.16em] text-mute">{label}</figcaption> : null}
    </figure>
  );
}

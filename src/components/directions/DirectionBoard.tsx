"use client";

import { directionById, DIRECTIONS, type Direction, type DirectionPalette, type Tone } from "@/lib/directions";
import { Check, Droplets, Minus, Moon, PersonStanding, Utensils } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

const BOXES = [
  { label: "Sleep", detail: "7h 20m", state: "done" as const, icon: Moon },
  { label: "Protein", detail: "92 g of 140 g", state: "partial" as const, icon: Utensils },
  { label: "Water", detail: "1,250 ml", state: "open" as const, icon: Droplets },
  { label: "Train", detail: "A walk counts", state: "open" as const, icon: PersonStanding },
];

export function DirectionBoard({ id }: { id: string }) {
  const direction = directionById(id);
  const [tone, setTone] = useState<Tone>("light");
  if (!direction) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>That direction is not on the board.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center underline" href="/directions">
          All directions
        </Link>
      </main>
    );
  }
  const palette = direction[tone];
  return (
    <main
      className="min-h-dvh px-4 py-6 sm:px-8"
      style={{
        background: palette.bg,
        color: palette.ink,
        fontFamily: direction.body,
      }}
    >
      <style>{`
        @keyframes dir-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        .dir-pulse { animation: dir-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dir-pulse { animation: none; }
        }
      `}</style>
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: palette.mute }}>
            Direction {direction.explore ? "· the one to explore" : ""}
          </p>
          <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: direction.display }}>
            {direction.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm" style={{ color: palette.mute }}>
            {direction.summary} Static preview. The live app is unchanged.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToneButton palette={palette} pressed={tone === "light"} onClick={() => setTone("light")}>
            Light
          </ToneButton>
          <ToneButton palette={palette} pressed={tone === "dark"} onClick={() => setTone("dark")}>
            Dark
          </ToneButton>
          <Link className="inline-flex min-h-11 items-center px-3 text-sm underline" href="/directions" style={{ color: palette.ink }}>
            All directions
          </Link>
        </div>
      </header>
      <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-2">
        <Scene scene="today" title="Today" palette={palette} wide>
          <TodayScene direction={direction} palette={palette} />
        </Scene>
        <Scene scene="log" title="Log water and food" palette={palette}>
          <LogScene palette={palette} display={direction.display} />
        </Scene>
        <Scene scene="pact" title="Pact and chat" palette={palette}>
          <PactScene palette={palette} display={direction.display} />
        </Scene>
        <Scene scene="streak" title="Streak moment" palette={palette}>
          <StreakScene palette={palette} display={direction.display} />
        </Scene>
        <Scene scene="first-run" title="First run" palette={palette}>
          <FirstRunScene palette={palette} display={direction.display} />
        </Scene>
        <Scene title="Empty state" palette={palette}>
          <EmptyScene palette={palette} display={direction.display} />
        </Scene>
      </div>
    </main>
  );
}

export function DirectionIndex() {
  return (
    <main className="min-h-dvh bg-[#f6efe6] px-4 py-10 text-[#2c2118] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6f6256]">Three directions</p>
        <h1 className="mt-2 max-w-2xl font-display text-5xl tracking-tight">Pick a direction. The app stays as it is until then.</h1>
        <p className="mt-4 max-w-2xl text-sm text-[#6f6256]">
          Each board shows Today with a partner, logging water and food, the pact and chat, the streak moment, first run, and an empty state. Light and dark sit on the board. Resize between a phone and a wide window.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {DIRECTIONS.map((direction) => (
            <Link
              key={direction.id}
              href={`/directions/${direction.id}`}
              className="flex min-h-44 flex-col justify-between rounded-[20px] border p-5"
              style={{
                background: direction.light.surface,
                borderColor: direction.light.line,
                color: direction.light.ink,
                fontFamily: direction.body,
              }}
            >
              <span>
                <span className="text-xs uppercase tracking-[0.14em]" style={{ color: direction.light.mute }}>
                  {direction.explore ? "Explore this one" : "Alternate"}
                </span>
                <span className="mt-2 block text-3xl" style={{ fontFamily: direction.display }}>
                  {direction.name}
                </span>
                <span className="mt-2 block text-sm" style={{ color: direction.light.mute }}>
                  {direction.summary}
                </span>
              </span>
              <span className="mt-6 flex gap-2">
                <Swatch color={direction.light.primary} />
                <Swatch color={direction.light.secondary} />
                <Swatch color={direction.light.bg} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="h-8 w-8 rounded-full border border-black/10" style={{ background: color }} />;
}

function ToneButton({
  palette,
  pressed,
  onClick,
  children,
}: {
  palette: DirectionPalette;
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex min-h-11 items-center rounded-full px-4 text-sm"
      style={{
        background: pressed ? palette.primary : "transparent",
        color: pressed ? palette.onPrimary : palette.ink,
        border: `1px solid ${pressed ? palette.primary : palette.line}`,
      }}
    >
      {children}
    </button>
  );
}

function Scene({
  scene,
  title,
  palette,
  children,
  wide,
}: {
  scene: string;
  title: string;
  palette: DirectionPalette;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section data-scene={scene} className={wide ? "lg:col-span-2" : undefined}>
      <h2 className="mb-3 text-xs uppercase tracking-[0.16em]" style={{ color: palette.mute }}>
        {title}
      </h2>
      <div
        className="p-4 sm:p-5"
        style={{
          background: palette.surface,
          border: `1px solid ${palette.line}`,
          borderRadius: palette.radius,
          boxShadow: palette.shadow,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function TodayScene({ direction, palette }: { direction: Direction; palette: DirectionPalette }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="text-sm" style={{ color: palette.mute }}>
          Wednesday
        </p>
        <p className="mt-1 text-3xl tracking-tight" style={{ fontFamily: direction.display }}>
          800 ml to go before 20:00.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BOXES.map((box) => (
            <BoxTile key={box.label} palette={palette} {...box} />
          ))}
        </div>
      </div>
      <aside className="rounded-[inherit] p-4" style={{ background: palette.bg }}>
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: palette.mute }}>
          Partner
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span
            className="dir-pulse inline-flex h-12 w-12 items-center justify-center rounded-full text-sm"
            style={{ background: palette.secondary, color: palette.onSecondary }}
          >
            J
          </span>
          <span>
            <span className="block text-base">Jordan</span>
            <span className="block text-sm" style={{ color: palette.mute }}>
              Sleep and water are in.
            </span>
          </span>
        </div>
        <p className="mt-4 text-sm">Jordan checked in. Your turn.</p>
      </aside>
    </div>
  );
}

function BoxTile({
  palette,
  label,
  detail,
  state,
  icon: Icon,
}: {
  palette: DirectionPalette;
  label: string;
  detail: string;
  state: "done" | "partial" | "open";
  icon: typeof Moon;
}) {
  const tone = state === "done" ? palette.done : state === "partial" ? palette.partial : palette.open;
  const name = state === "done" ? "Done" : state === "partial" ? "Partial" : "Open";
  const Mark = state === "done" ? Check : state === "partial" ? Minus : Icon;
  return (
    <div className="min-h-28 p-3" style={{ borderRadius: "12px", background: palette.bg }}>
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: tone, color: state === "open" ? palette.ink : palette.onPrimary }}
      >
        <Mark className="h-4 w-4" aria-hidden />
      </span>
      <p className="mt-3 text-sm">{label}</p>
      <p className="text-xs" style={{ color: palette.mute }}>
        {name} · {detail}
      </p>
    </div>
  );
}

function LogScene({ palette, display }: { palette: DirectionPalette; display: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-3xl tabular-nums tracking-tight" style={{ fontFamily: display }}>
          1,250 ml
        </p>
        <p className="text-sm" style={{ color: palette.mute }}>
          800 ml to go before 20:00.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip palette={palette} primary>
            +250 ml
          </Chip>
          <Chip palette={palette}>+500 ml</Chip>
          <Chip palette={palette}>Custom</Chip>
        </div>
      </div>
      <div>
        <p className="text-sm" style={{ color: palette.mute }}>
          Food
        </p>
        <p className="mt-1 text-lg" style={{ fontFamily: display }}>
          Paneer · 50 g · 133 kcal
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip palette={palette} primary>
            Log
          </Chip>
          <Chip palette={palette}>Same as yesterday</Chip>
        </div>
      </div>
    </div>
  );
}

function PactScene({ palette, display }: { palette: DirectionPalette; display: string }) {
  const lines = [
    { who: "You", text: "Protein is in.", status: "Seen" },
    { who: "Jordan", text: "Water is in. Train is next.", status: "Delivered" },
    { who: "You", text: "On my way.", status: "Sending" },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <div>
        <p className="text-2xl" style={{ fontFamily: display }}>
          Jordan
        </p>
        <p className="text-sm" style={{ color: palette.mute }}>
          Pact streak 12 days
        </p>
        <div className="mt-3">
          <Chip palette={palette}>Nudge</Chip>
        </div>
      </div>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.text} className="rounded-[12px] px-3 py-2" style={{ background: palette.bg }}>
            <p className="text-sm">{line.text}</p>
            <p className="text-xs" style={{ color: palette.mute }}>
              {line.who} · {line.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StreakScene({ palette, display }: { palette: DirectionPalette; display: string }) {
  return (
    <div>
      <p className="text-sm" style={{ color: palette.secondary }}>
        All four boxes
      </p>
      <p className="mt-1 text-5xl tabular-nums tracking-tight" style={{ fontFamily: display }}>
        Day 13
      </p>
      <p className="mt-2 max-w-md text-sm" style={{ color: palette.mute }}>
        A short celebration, then it is quiet. Reduced motion and the moments flag leave the number still.
      </p>
    </div>
  );
}

function FirstRunScene({ palette, display }: { palette: DirectionPalette; display: string }) {
  const steps = ["Your name", "The four boxes", "Invite one person"];
  return (
    <div>
      <p className="text-2xl" style={{ fontFamily: display }}>
        Start a pact
      </p>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs"
              style={{
                background: index === 1 ? palette.primary : palette.bg,
                color: index === 1 ? palette.onPrimary : palette.ink,
              }}
            >
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptyScene({ palette, display }: { palette: DirectionPalette; display: string }) {
  return (
    <div>
      <p className="text-2xl" style={{ fontFamily: display }}>
        No score yet
      </p>
      <p className="mt-1 text-sm" style={{ color: palette.mute }}>
        0-day streak. Log a glass of water. That starts today.
      </p>
      <div className="mt-3">
        <Chip palette={palette} primary>
          +250 ml
        </Chip>
      </div>
    </div>
  );
}

function Chip({ palette, primary, children }: { palette: DirectionPalette; primary?: boolean; children: string }) {
  return (
    <span
      className="inline-flex min-h-11 items-center rounded-full px-4 text-sm"
      style={{
        background: primary ? palette.primary : "transparent",
        color: primary ? palette.onPrimary : palette.ink,
        border: `1px solid ${primary ? palette.primary : palette.line}`,
      }}
    >
      {children}
    </span>
  );
}

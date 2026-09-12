"use client";

import { Button, Chip } from "@/components/ui";
import { usePact } from "@/lib/store";
import { useEffect, useState } from "react";

const STEPS = [
  {
    k: "The pact",
    t: "Four boxes. That's the product.",
    d: "Sleep 7h+, hit protein, drink the tank, train today. Tap them on Overview. Protein and water also flip when the log clears the goal.",
  },
  {
    k: "Share less",
    t: "Your circle sees the pact. Not the plate.",
    d: "Calories default private. Recovery can stay with friends. Flip every metric on Privacy — private never leaves this device in the demo.",
  },
  {
    k: "Two desks",
    t: "Coach trains. FAQ explains the app.",
    d: "Ask Coach about a squat, chicken, or sore knees. Ask FAQ how to scan a meal. Friend Chat is people.",
  },
  {
    k: "Move fast",
    t: "Jump with ⌘K.",
    d: "Command-K (Ctrl-K on Windows) opens every desk. Rest timers live on lift films. Repeat last meal on Calories.",
  },
];

export function Onboard() {
  const store = usePact();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    function open() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener("pact-onboard", open);
    return () => window.removeEventListener("pact-onboard", open);
  }, []);

  useEffect(() => {
    if (!store.ready || store.prefs.onboarded) return;
    const t = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(t);
  }, [store.ready, store.prefs.onboarded]);

  if (!open) return null;
  const s = STEPS[step];

  function close() {
    store.setPrefs({ onboarded: true });
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="onboard-title"
        className="w-full max-w-md rounded-3xl border border-line bg-panel p-6"
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-mute">
          {s.k} · {step + 1}/{STEPS.length}
        </p>
        <h2 id="onboard-title" className="mt-3 font-display text-3xl tracking-tight">
          {s.t}
        </h2>
        <p className="mt-3 text-sm text-mute">{s.d}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((_, i) => (
            <Chip key={STEPS[i].k} active={i === step} onClick={() => setStep(i)}>
              {i + 1}
            </Chip>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep((n) => n + 1)}>
              Next
            </Button>
          ) : (
            <Button className="flex-1" onClick={close}>
              Keep the pact
            </Button>
          )}
          <Button tone="quiet" onClick={close}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button, Field } from "@/components/ui";
import { GOALS } from "@/lib/data";
import { usePact } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Onboard() {
  const store = usePact();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  useEffect(() => {
    function show() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener("pact-onboard", show);
    return () => window.removeEventListener("pact-onboard", show);
  }, []);

  useEffect(() => {
    if (!store.ready || store.prefs.onboarded) return;
    const t = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(t);
  }, [store.ready, store.prefs.onboarded]);

  if (!open) return null;

  function close() {
    store.setPrefs({ onboarded: true });
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div role="dialog" aria-labelledby="onboard-title" className="w-full max-w-md rounded-3xl border border-line bg-panel p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Start · {step + 1}/3</p>
        {step === 0 ? (
          <>
            <h2 id="onboard-title" className="mt-3 font-display text-3xl tracking-tight">
              What should Pact call you?
            </h2>
            <div className="mt-4 space-y-3">
              <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-mute">Goal</span>
                <select
                  className="min-h-11 w-full rounded-2xl border border-line bg-ink px-4 text-sm"
                  value={store.goal}
                  aria-label="Goal"
                  onChange={(e) => store.setGoal(e.target.value as typeof store.goal)}
                >
                  {GOALS.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="button" tone={store.prefs.units === "metric" ? "accent" : "ghost"} onClick={() => store.setPrefs({ units: "metric" })}>
                  Metric
                </Button>
                <Button type="button" tone={store.prefs.units === "imperial" ? "accent" : "ghost"} onClick={() => store.setPrefs({ units: "imperial" })}>
                  Imperial
                </Button>
              </div>
            </div>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h2 id="onboard-title" className="mt-3 font-display text-3xl tracking-tight">
              These targets are editable.
            </h2>
            <p className="mt-3 text-sm text-mute">
              Sleep 7 hours, hit protein, drink the water target, and train. Change any of them later in You.
            </p>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2 id="onboard-title" className="mt-3 font-display text-3xl tracking-tight">
              Start a pact with someone.
            </h2>
            <p className="mt-3 text-sm text-mute">
              Share an invite link when you are ready. The secret stays in the link fragment and is not sent to a server.
            </p>
          </>
        ) : null}
        <div className="mt-6 flex gap-2">
          <Button type="button" tone="quiet" onClick={close}>
            Later
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 0 && name.trim()) {
                  const handle = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
                  store.setProfile({ name: name.trim(), handle });
                }
                setStep((n) => n + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                close();
                router.push("/people");
              }}
            >
              Create an invite
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

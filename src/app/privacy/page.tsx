"use client";

import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import type { PrivacyLevel, PrivacySettings } from "@/lib/types";
import { usePact } from "@/lib/store";

const LEVELS: PrivacyLevel[] = ["private", "friends", "circle", "public"];

export default function PrivacyPage() {
  const store = usePact();
  const p = store.privacy;

  function setLevel(key: keyof PrivacySettings, level: PrivacyLevel) {
    store.setPrivacy({ [key]: level } as Partial<PrivacySettings>);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Trust</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Share less than Whoop. Train more than them.</h1>
        <p className="mt-3 text-mute">
          Every metric has a level. Private never leaves the phone. Friends is your pact list. Circle is community posts. Public is the internet — off by default.
        </p>
      </div>

      <Card className="divide-y divide-line">
        <Row
          label="Profile"
          hint="Name, handle, city"
          value={p.profile}
          onChange={(l) => setLevel("profile", l)}
        />
        <Row label="Recovery" hint="The 0–100" value={p.recovery} onChange={(l) => setLevel("recovery", l)} />
        <Row label="Strain" hint="Training load" value={p.strain} onChange={(l) => setLevel("strain", l)} />
        <Row label="Sleep" hint="Duration, stages, HRV" value={p.sleep} onChange={(l) => setLevel("sleep", l)} />
        <Row label="Calories" hint="Meals and photos of plates" value={p.calories} onChange={(l) => setLevel("calories", l)} />
        <Row label="Workouts" hint="Library + Strava syncs" value={p.workouts} onChange={(l) => setLevel("workouts", l)} />
        <Row
          label="New photos"
          hint="Chat and community default"
          value={p.photoDefault}
          onChange={(l) => setLevel("photoDefault", l)}
        />
      </Card>

      <Card className="p-6">
        <Eyebrow>Location</Eyebrow>
        <p className="mt-2 text-sm text-mute">Used for gyms, grocers, and delivery. Approximate is the default — neighborhood, not your doorway.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["off", "approximate", "precise"] as const).map((l) => (
            <Chip key={l} active={p.location === l} onClick={() => store.setPrivacy({ location: l })}>
              {l}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <Toggle
          label="Wearable data sharing with friends"
          on={p.wearableSharing}
          onClick={() => store.setPrivacy({ wearableSharing: !p.wearableSharing })}
        />
        <Toggle
          label="Activity status (green dot)"
          on={p.activityStatus}
          onClick={() => store.setPrivacy({ activityStatus: !p.activityStatus })}
        />
        <Toggle
          label="Read receipts"
          on={p.readReceipts}
          onClick={() => store.setPrivacy({ readReceipts: !p.readReceipts })}
        />
        <Toggle
          label="Searchable by handle"
          on={p.searchable}
          onClick={() => store.setPrivacy({ searchable: !p.searchable })}
        />
      </Card>

      <Card className="p-6">
        <Eyebrow>Experience</Eyebrow>
        <p className="mt-3 text-sm text-mute">
          Units, motion, and the first-run walkthrough. None of this is uploaded.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip active={store.prefs.units === "metric"} onClick={() => store.setPrefs({ units: "metric" })}>
            Metric · ml / °C
          </Chip>
          <Chip active={store.prefs.units === "imperial"} onClick={() => store.setPrefs({ units: "imperial" })}>
            US · oz / °F
          </Chip>
        </div>
        <div className="mt-4 space-y-4">
          <Toggle
            label="Reduce motion"
            on={store.prefs.reducedMotion}
            onClick={() => store.setPrefs({ reducedMotion: !store.prefs.reducedMotion })}
          />
        </div>
        <Button
          className="mt-4"
          tone="ghost"
          onClick={() => {
            store.setPrefs({ onboarded: false });
            window.dispatchEvent(new Event("pact-onboard"));
          }}
        >
          Replay walkthrough
        </Button>
      </Card>

      <Card className="p-6">
        <Eyebrow>Coach vs FAQ</Eyebrow>
        <p className="mt-3 text-sm text-mute">
          Pact Coach answers training and diet from a built-in corpus on this device — no model vendor. FAQ is product
          how-to. Friend Chat is people. None of those threads are uploaded in this demo.
        </p>
      </Card>

      <Card className="p-6">
        <Eyebrow>Your data</Eyebrow>
        <p className="mt-3 text-sm text-mute">
          This demo stores everything in your browser. In production: export JSON, delete remote copies, revoke HealthKit / Health Connect / Strava tokens independently.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            tone="ghost"
            onClick={() => {
              const blob = new Blob([localStorage.getItem("pact.v1") ?? "{}"], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pact-export.json";
              a.click();
            }}
          >
            Download my data
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              localStorage.removeItem("pact.v1");
              window.location.reload();
            }}
          >
            Delete local account
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: PrivacyLevel;
  onChange: (l: PrivacyLevel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p>{label}</p>
        <p className="text-xs text-mute">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {LEVELS.map((l) => (
          <Chip key={l} active={value === l} onClick={() => onChange(l)}>
            {l}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button className="flex w-full items-center justify-between text-left" onClick={onClick}>
      <span>{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs ${on ? "bg-acid text-ink" : "bg-white/8 text-mute"}`}>
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

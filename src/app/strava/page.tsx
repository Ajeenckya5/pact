"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { STRAVA_ACTIVITIES } from "@/lib/data";
import { usePact } from "@/lib/store";
import { Activity } from "lucide-react";

export default function StravaPage() {
  const store = usePact();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Strava</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Runs and rides, without leaving Pact.</h1>
          <p className="mt-3 text-mute">
            Connect Strava to pull GPS, kudos, and segments. Pact maps them onto strain and today&apos;s move check-in. Your feed stays yours under Privacy.
          </p>
        </div>
        <Button tone={store.stravaConnected ? "ghost" : "accent"} onClick={() => store.setStrava(!store.stravaConnected)}>
          {store.stravaConnected ? "Disconnect" : "Connect Strava"}
        </Button>
      </div>

      {!store.stravaConnected ? (
        <Card className="p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-heat" />
          <p className="mt-4 text-mute">OAuth in production. This demo toggles a live-looking feed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {STRAVA_ACTIVITIES.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-heat">{a.type}</p>
                <h2 className="text-xl">{a.name}</h2>
                <p className="text-sm text-mute">{a.when}</p>
              </div>
              <div className="flex gap-6 font-mono text-sm">
                <div>
                  <p className="text-xs text-mute">Distance</p>
                  <p>{a.km} km</p>
                </div>
                <div>
                  <p className="text-xs text-mute">Elev</p>
                  <p>{a.elevation} m</p>
                </div>
                <div>
                  <p className="text-xs text-mute">Moving</p>
                  <p>{a.moving}</p>
                </div>
                <div>
                  <p className="text-xs text-mute">Kudos</p>
                  <p>{a.kudos}</p>
                </div>
              </div>
              <Button
                tone="ghost"
                onClick={() =>
                  store.completeWorkout(Math.round(a.km * 18), 48, {
                    title: a.name,
                    category: a.type,
                    source: "strava",
                  })
                }
              >
                Sync to Pact
              </Button>
            </Card>
          ))}
          <Card className="p-5">
            <Eyebrow>Route sketch</Eyebrow>
            <svg viewBox="0 0 400 140" className="mt-4 h-36 w-full">
              <path
                d="M20 110 C 80 100, 90 40, 150 50 S 240 120, 300 70 S 360 40, 380 30"
                fill="none"
                stroke="#ff6b4a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="20" cy="110" r="5" fill="#d6ff3f" />
              <circle cx="380" cy="30" r="5" fill="#d6ff3f" />
            </svg>
            <p className="text-sm text-mute">Embarcadero tempo — GPS polyline from last Strava run.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

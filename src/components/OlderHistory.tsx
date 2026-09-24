"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { DEVICE_HISTORY_DAYS, type HistorySlice } from "@/lib/device-history";
import { loadArchives, loadRoomMessages } from "@/lib/history-backup";
import { useState } from "react";

type RoomLine = { id: string; text: string };

export function OlderHistory() {
  const [slices, setSlices] = useState<HistorySlice[] | null>(null);
  const [room, setRoom] = useState<RoomLine[] | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");

  async function load() {
    setPhase("loading");
    try {
      const [archives, messages] = await Promise.all([loadArchives(), loadRoomMessages()]);
      setSlices(archives);
      setRoom(messages);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }

  const meals = slices?.flatMap((slice) => slice.meals) ?? [];
  const days = slices?.flatMap((slice) => slice.history) ?? [];
  const notes = slices?.flatMap((slice) => Object.values(slice.messages ?? {}).flat()) ?? [];

  return (
    <Card className="space-y-3 p-6">
      <Eyebrow>Older history</Eyebrow>
      <p className="text-sm text-mute">
        This device keeps the last {DEVICE_HISTORY_DAYS} days. Older logs and messages are sealed to this device and
        load when you ask. The server stores ciphertext only.
      </p>
      <Button type="button" disabled={phase === "loading"} onClick={() => void load()}>
        {phase === "loading" ? "Loading…" : "Load older history"}
      </Button>
      {phase === "error" ? <p className="text-sm text-heat">The backup did not open.</p> : null}
      {phase === "ready" ? (
        <div className="space-y-2 text-sm">
          <p>
            {`${meals.length} older ${meals.length === 1 ? "meal" : "meals"}, ${days.length} older ${days.length === 1 ? "day" : "days"}, ${notes.length} older ${notes.length === 1 ? "message" : "messages"}.`}
          </p>
          {meals.slice(0, 8).map((meal) => (
            <p key={meal.id} className="text-mute">
              {meal.name} · {meal.kcal} kcal
            </p>
          ))}
          {days.slice(0, 8).map((day) => (
            <p key={day.date} className="text-mute">
              {day.date}
            </p>
          ))}
          {notes.slice(0, 8).map((note) => (
            <p key={note.id} className="text-mute">
              {note.text}
            </p>
          ))}
          {room && room.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Pact room</p>
              {room.slice(0, 8).map((line) => (
                <p key={line.id} className="text-mute">
                  {line.text}
                </p>
              ))}
            </div>
          ) : null}
          {meals.length + days.length + notes.length + (room?.length ?? 0) === 0 ? (
            <p className="text-mute">No older history is stored for this device yet.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

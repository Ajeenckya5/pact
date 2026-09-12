"use client";

import { Button, Card, Chip, Eyebrow, Field } from "@/components/ui";
import {
  COACH_CORPUS_SIZE,
  coachReply,
  coachStarters,
  featuredQas,
  searchCoachCorpus,
  type CoachQA,
} from "@/lib/coach";
import { mealTotals, useGoal, usePact } from "@/lib/store";
import { todayLogs } from "@/lib/training";
import type { CoachMessage } from "@/lib/types";
import { USER } from "@/lib/data";
import { clock } from "@/lib/format";
import { useLiveWeather } from "@/lib/use-live";
import { liveSourceLine } from "@/lib/wearable-live";
import { useLiveBody } from "@/lib/wearable-live-context";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

export default function CoachPage() {
  const store = usePact();
  const goal = useGoal();
  const totals = mealTotals(store.meals);
  const { weather } = useLiveWeather();
  const { body } = useLiveBody();
  const [text, setText] = useState("");
  const [deskQuery, setDeskQuery] = useState("");
  const [tab, setTab] = useState<"chat" | "desk">("chat");
  const endRef = useRef<HTMLDivElement>(null);

  const ctx = useMemo(
    () => ({
      name: USER.name,
      goal,
      recovery: body.recovery,
      strain: body.strain,
      sleepScore: body.sleepScore,
      sleepMin: body.sleepMin,
      hrv: body.hrv,
      hr: body.hr,
      rhr: body.rhr,
      cadence: body.cadence,
      power: body.power,
      protein: totals.protein,
      kcal: totals.kcal,
      waterMl: store.waterMl,
      trainedToday: todayLogs(store.workoutLogs).length > 0,
      workoutLogs: store.workoutLogs,
      favoriteWorkouts: store.favoriteWorkouts,
      weather,
      liveNote: liveSourceLine(body),
    }),
    [
      goal,
      body,
      totals.protein,
      totals.kcal,
      store.waterMl,
      store.workoutLogs,
      store.favoriteWorkouts,
      weather,
    ],
  );
  const starters = useMemo(() => coachStarters(ctx), [ctx]);

  const deskHits = useMemo(
    () => (tab === "desk" ? searchCoachCorpus(deskQuery, 18) : []),
    [tab, deskQuery],
  );

  function send(raw?: string) {
    const q = (raw ?? text).trim();
    if (!q) return;
    const turn = coachReply(q, ctx);
    const at = new Date().toISOString();
    const mine: CoachMessage = { id: `u-${at}`, role: "me", text: q, at };
    const bot: CoachMessage = {
      id: `c-${at}`,
      role: "coach",
      text: turn.text,
      at,
      qaId: turn.matched?.id,
      topic: turn.topic,
    };
    store.appendCoach([mine, bot]);
    setText("");
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 40);
  }

  function askFromCard(qa: CoachQA) {
    setTab("chat");
    send(qa.q);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Coach — not FAQ, not friend chat</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Train. Eat. Don&apos;t negotiate.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Coach scores today&apos;s session from the Bluetooth device you paired (if any), your Pact log, protein, and
            weather — same pick as Overview. Unpaired watches are not invented.
            Name a lift or a food and it will gate the answer on those numbers. App how-tos live in{" "}
            <Link href="/faq" className="text-acid">
              FAQ
            </Link>
            . People live in{" "}
            <Link href="/chat" className="text-acid">
              Chat
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={tab === "chat"} onClick={() => setTab("chat")}>
            Chat
          </Chip>
          <Chip active={tab === "desk"} onClick={() => setTab("desk")}>
            Browse desk · {COACH_CORPUS_SIZE.toLocaleString()}
          </Chip>
        </div>
      </div>

      {tab === "desk" ? (
        <div className="space-y-4">
          <Field
            placeholder="Browse the corpus — chicken, squat, PPL, sore knees…"
            value={deskQuery}
            onChange={(e) => setDeskQuery(e.target.value)}
          />
          <p className="text-xs text-mute">
            {deskQuery.trim()
              ? `${deskHits.length} cards from the ${COACH_CORPUS_SIZE.toLocaleString()} combination desk.`
              : `Empty search shows a sample. Type a food or lift to pull cards from ${COACH_CORPUS_SIZE.toLocaleString()} built-in Q&As.`}
          </p>
          <div className="space-y-3">
            {(deskHits.length ? deskHits : featuredQas()).map((qa) => (
              <Card key={qa.id} className="p-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-mute">{qa.topic}</p>
                <p className="mt-1 font-medium">{qa.q}</p>
                <p className="mt-2 text-sm text-mute">{qa.a}</p>
                <button type="button" className="mt-3 text-sm text-acid" onClick={() => askFromCard(qa)}>
                  Ask this in chat
                </button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <Chip key={s} onClick={() => send(s)}>
                {s}
              </Chip>
            ))}
          </div>

          <Card className="flex min-h-[48vh] flex-col p-4">
            <div className="flex-1 space-y-3 overflow-y-auto">
              {store.coachMessages.length === 0 ? (
                <p className="p-4 text-sm text-mute">
                  Recovery {body.recovery}, {goal.name}, protein {Math.round(totals.protein)}/{goal.protein}g. Ask a
                  lift or a food. I will not pretend to be a clinician.
                </p>
              ) : (
                store.coachMessages.map((m) => {
                  const mine = m.role === "me";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-acid text-ink" : "bg-white/8"}`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-ink/60" : "text-mute"}`}>
                          {mine ? "you" : m.topic ?? "coach"} · <span suppressHydrationWarning>{clock(m.at)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Field
                value={text}
                placeholder="Ask the coach — not the FAQ"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <Button type="button" onClick={() => send()}>
                Send
              </Button>
            </div>
          </Card>

          {store.coachMessages.length > 0 ? (
            <button type="button" className="text-sm text-mute hover:text-heat" onClick={store.clearCoach}>
              Clear thread
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

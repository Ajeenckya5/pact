"use client";

import { Button, Card, Chip, Eyebrow, Progress } from "@/components/ui";
import { usePact } from "@/lib/store";
import { COMMON_WORKOUTS, findTemplate, groupBoard, groupOpen, initials, metricLabel, peopleInCircle, personById } from "@/lib/training";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function GroupWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const store = usePact();
  const group = store.groups.find((g) => g.id === id);
  const circle = peopleInCircle(store.friends, store.extraFriends, store.demo);
  const [invite, setInvite] = useState<string[]>([]);

  if (!group) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p>That group isn&apos;t on the board.</p>
        <Link href="/workouts" className="mt-4 inline-block text-acid">
          Back to workouts
        </Link>
      </div>
    );
  }

  const board = groupBoard(group, store.extraFriends);
  const lead = board[0]?.value || 1;
  const template = findTemplate(group.templateId) ?? COMMON_WORKOUTS[0];
  const open = groupOpen(group);
  const onBoard = group.memberIds.includes("me");
  const invited = group.pendingIds.includes("me");
  const extras = circle.filter((f) => !group.memberIds.includes(f.id));

  function logForGroup() {
    store.logWorkout({
      title: group!.title,
      category: group!.category,
      minutes: template?.minutes ?? group!.minutes,
      kcal: template?.kcal ?? group!.kcal,
      source: "group",
      workoutId: group!.templateId,
      groupId: group!.id,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/workouts" className="text-sm text-mute hover:text-cream">
        ← Workouts
      </Link>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-mute">
          {group.mode === "race" ? "Race" : "Together"} · {group.category} · {open ? "live" : "closed"}
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-4xl tracking-tight">
          {group.title}
          {group.mode === "race" ? <Trophy className="h-7 w-7 text-gold" /> : null}
        </h1>
        <p className="mt-3 text-mute">
          Scored on {metricLabel(group.metric)}. Hosted by {personById(group.hostId, store.extraFriends)?.name ?? group.hostId}.{" "}
          Window through {new Date(group.endsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.
        </p>
      </div>

      {invited ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-acid/40 p-5">
          <p className="text-sm">You&apos;re invited. Join to land on the board.</p>
          <div className="flex gap-2">
            <Button onClick={() => store.acceptGroup(group.id)}>Join</Button>
            <Button tone="ghost" onClick={() => store.declineGroup(group.id)}>
              Pass
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <Eyebrow>{group.mode === "race" ? "Leaderboard" : "Crew log"}</Eyebrow>
        <ul className="mt-4 space-y-4">
          {board.map((row) => (
            <li key={row.id}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 font-mono text-sm text-mute">{row.place}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-xs">
                    {initials(row.name)}
                  </span>
                  <div>
                    <p className="font-medium">
                      {row.name}
                      {row.id === "me" ? " · you" : ""}
                    </p>
                    <p className="text-xs text-mute">
                      {row.score.sessions} sessions · {row.score.minutes} min · {row.score.kcal} kcal
                    </p>
                  </div>
                </div>
                <p className="font-mono text-lg">
                  {row.value}
                  <span className="ml-1 text-xs text-mute">{metricLabel(group.metric)}</span>
                </p>
              </div>
              <Progress value={(row.value / Math.max(lead, 1)) * 100} tone={row.place === 1 ? "gold" : "acid"} />
            </li>
          ))}
        </ul>
      </Card>

      {onBoard ? (
        <Card className="p-5">
          <Eyebrow>Log this session</Eyebrow>
          <p className="mt-2 text-sm text-mute">
            {template?.title ?? group.title} · {template?.minutes ?? group.minutes} min · ~{template?.kcal ?? group.kcal} kcal.
            Hits your week and this {group.mode === "race" ? "race" : "group"}.
          </p>
          <Button className="mt-4" onClick={logForGroup} disabled={!open && group.mode === "race"}>
            Log {group.mode === "race" ? "and score" : "with the crew"}
          </Button>
        </Card>
      ) : null}

      {onBoard && extras.length ? (
        <Card className="p-5">
          <Eyebrow>Invite more</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {extras.map((f) => (
              <Chip key={f.id} active={invite.includes(f.id)} onClick={() => setInvite((cur) => (cur.includes(f.id) ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}>
                {f.name.split(" ")[0]}
              </Chip>
            ))}
          </div>
          <Button
            className="mt-4"
            tone="ghost"
            disabled={!invite.length}
            onClick={() => {
              store.inviteToGroup(group.id, invite);
              setInvite([]);
            }}
          >
            Send invites
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

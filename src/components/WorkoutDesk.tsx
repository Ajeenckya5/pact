"use client";

import { ClipResult, ClipScanButton } from "@/components/ClipScan";
import { TodaySession } from "@/components/TodaySession";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { Button, Card, Chip, Eyebrow, Field, Stat } from "@/components/ui";
import type { AppPhotoScan } from "@/lib/app-vision";
import { timeAgo } from "@/lib/format";
import { usePact } from "@/lib/store";
import {
  COMMON_WORKOUTS,
  WORKOUT_CATEGORIES,
  groupedTemplates,
  estimateKcal,
  groupBoard,
  groupOpen,
  initials,
  metricLabel,
  peopleInCircle,
  personById,
  rankedCommon,
  readDeviceContacts,
  todayLogs,
  weekStats,
} from "@/lib/training";
import type { GroupMetric, GroupMode } from "@/lib/types";
import { Phone, Trophy, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const TABS = ["Track", "Common", "Create", "Groups", "Library"] as const;
type Tab = (typeof TABS)[number];

const SELECT =
  "w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm text-cream outline-none focus:border-acid/60";

export function WorkoutDesk() {
  const store = usePact();
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const fromUrl: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "Track";
  const [tab, setTabState] = useState<Tab>(fromUrl);
  const [clip, setClip] = useState<{ scan: AppPhotoScan; preview: string } | null>(null);
  const [groupSeed, setGroupSeed] = useState<{ title: string; templateId: string } | null>(null);
  const circle = peopleInCircle(store.friends, store.extraFriends);
  const week = weekStats(store.workoutLogs);
  const today = todayLogs(store.workoutLogs);
  const common = rankedCommon(store.workoutLogs);
  const pending = store.groups.filter((g) => g.pendingIds.includes("me"));
  const mine = store.groups.filter((g) => g.memberIds.includes("me") || g.hostId === "me");

  function setTab(next: Tab) {
    setTabState(next);
    const href = next === "Track" ? "/workouts" : `/workouts?tab=${next}`;
    router.replace(href, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Eyebrow>Train</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Log it. Repeat it. Race your circle.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          The library is the desk: programs, split days, single-lift form, and follow-alongs — each with a muscle map
          and a log button. Scan a rack or a machine with CLIP and it opens the matching film.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ClipScanButton
          label="Scan a lift"
          onScan={(scan, _file, preview) => {
            setClip({ scan, preview });
          }}
        />
      </div>
      {clip ? (
        <Card className="p-5">
          <ClipResult
            scan={clip.scan}
            preview={clip.preview}
            extra={
              <Button type="button" tone="ghost" onClick={() => setClip(null)}>
                Dismiss
              </Button>
            }
          />
        </Card>
      ) : null}

      {pending.length ? (
        <Card className="border-acid/40 p-5">
          <Eyebrow>Invites</Eyebrow>
          <div className="mt-3 space-y-3">
            {pending.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-mute">
                    {g.hostId === "me" ? "You" : peopleInCircle(store.friends, store.extraFriends).find((f) => f.id === g.hostId)?.name ?? g.hostId}{" "}
                    · {g.mode === "race" ? "Race" : "Together"} · {g.category}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => store.acceptGroup(g.id)}>Join</Button>
                  <Button tone="ghost" onClick={() => store.declineGroup(g.id)}>
                    Pass
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
            {t === "Groups" && mine.length ? ` · ${mine.length}` : ""}
          </Chip>
        ))}
      </div>

      {tab === "Track" ? (
        <div className="space-y-4">
          <TodaySession />
          <TrackPanel
            week={week}
            today={today}
            logs={store.workoutLogs}
            onRemove={(id) => store.removeWorkoutLog(id)}
          />
        </div>
      ) : null}

      {tab === "Common" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {common.map((w) => (
            <Card key={w.id} className="flex flex-col p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-mute">
                {w.category} · {w.why}
              </p>
              <h2 className="mt-1 text-lg font-medium">{w.title}</h2>
              <p className="mt-1 text-sm text-mute">
                {w.minutes} min · ~{w.kcal} kcal
                {w.times ? ` · logged ${w.times}×` : ""}
              </p>
              <p className="mt-3 flex-1 text-sm text-mute">{w.cue}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    store.logWorkout({
                      title: w.title,
                      category: w.category,
                      minutes: w.minutes,
                      kcal: w.kcal,
                      source: "common",
                      workoutId: w.id,
                    })
                  }
                >
                  Log session
                </Button>
                <Button
                  tone="ghost"
                  onClick={() => {
                    setGroupSeed({ title: w.title, templateId: w.id });
                    setTab("Groups");
                  }}
                >
                  Group this
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "Create" ? <CreatePanel /> : null}

      {tab === "Groups" ? (
        <GroupsPanel
          seed={groupSeed}
          circle={circle}
          groups={store.groups}
          contacts={store.contacts}
          syncedAt={store.contactsSyncedAt}
        />
      ) : null}

      {tab === "Library" ? <WorkoutLibrary /> : null}
    </div>
  );
}

function TrackPanel({
  week,
  today,
  logs,
  onRemove,
}: {
  week: ReturnType<typeof weekStats>;
  today: ReturnType<typeof todayLogs>;
  logs: ReturnType<typeof usePact>["workoutLogs"];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-5">
          <Stat label="This week" value={week.sessions} hint="sessions" />
        </Card>
        <Card className="p-5">
          <Stat label="Minutes" value={week.minutes} hint={`${week.days} days trained`} />
        </Card>
        <Card className="p-5">
          <Stat label="Load" value={week.kcal} hint="kcal estimated" />
        </Card>
        <Card className="p-5">
          <Stat label="Today" value={today.length} hint={today.length ? today.map((t) => t.title).join(" · ") : "Nothing logged yet"} />
        </Card>
      </div>
      <Card className="p-5">
        <Eyebrow>History</Eyebrow>
        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-mute">No sessions yet. Common and Create are one tap.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-xs text-mute">
                    {l.category} · {l.minutes} min · {l.kcal} kcal · {l.source}
                    {l.groupId && l.source !== "group" ? " · scored" : ""} · {timeAgo(l.at)}
                  </p>
                </div>
                <button className="text-xs text-mute hover:text-heat" onClick={() => onRemove(l.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CreatePanel() {
  const store = usePact();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Strength");
  const [minutes, setMinutes] = useState(30);
  const [kcal, setKcal] = useState(estimateKcal("Strength", 30));
  const [cue, setCue] = useState("");
  const [equipment, setEquipment] = useState("None");

  function save(logAfter: boolean) {
    if (!title.trim()) return;
    const mins = Math.max(1, minutes);
    const burn = kcal || estimateKcal(category, mins);
    const row = store.addCustomWorkout({
      title: title.trim(),
      category,
      minutes: mins,
      kcal: burn,
      equipment: [equipment],
      muscles: [category],
      cue: cue.trim() || "Honest reps. Leave one in the tank.",
    });
    if (logAfter) {
      store.logWorkout({
        title: row.title,
        category: row.category,
        minutes: row.minutes,
        kcal: row.kcal,
        source: "manual",
        workoutId: row.id,
      });
    }
    setTitle("");
    setCue("");
  }

  return (
    <Card className="p-5">
      <Eyebrow>Manual session</Eyebrow>
      <p className="mt-2 text-sm text-mute">Name the work, set minutes, Pact estimates the burn. Save it to reuse or log it now.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Title</span>
          <Field className="mt-1" placeholder="e.g. Garage deadlifts" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Category</span>
          <select
            className={`mt-1 ${SELECT}`}
            value={category}
            onChange={(e) => {
              const next = e.target.value;
              setCategory(next);
              setKcal(estimateKcal(next, minutes));
            }}
          >
            {WORKOUT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Minutes</span>
          <Field
            className="mt-1"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              setMinutes(n);
              setKcal(estimateKcal(category, n));
            }}
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">kcal</span>
          <Field className="mt-1" type="number" min={0} value={kcal} onChange={(e) => setKcal(Number(e.target.value) || 0)} />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Equipment</span>
          <Field className="mt-1" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Cue</span>
          <Field className="mt-1" placeholder="What to protect" value={cue} onChange={(e) => setCue(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!title.trim()} onClick={() => save(true)}>
          Save and log
        </Button>
        <Button tone="ghost" disabled={!title.trim()} onClick={() => save(false)}>
          Save template only
        </Button>
      </div>
      {store.customWorkouts.length ? (
        <ul className="mt-6 divide-y divide-line">
          {store.customWorkouts.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{w.title}</p>
                <p className="text-xs text-mute">
                  {w.category} · {w.minutes} min · {w.kcal} kcal
                </p>
              </div>
              <Button
                tone="ghost"
                onClick={() =>
                  store.logWorkout({
                    title: w.title,
                    category: w.category,
                    minutes: w.minutes,
                    kcal: w.kcal,
                    source: "manual",
                    workoutId: w.id,
                  })
                }
              >
                Log
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function GroupsPanel({
  seed,
  circle,
  groups,
  contacts,
  syncedAt,
}: {
  seed: { title: string; templateId: string } | null;
  circle: ReturnType<typeof peopleInCircle>;
  groups: ReturnType<typeof usePact>["groups"];
  contacts: ReturnType<typeof usePact>["contacts"];
  syncedAt: string | null;
}) {
  const store = usePact();
  const router = useRouter();
  const [title, setTitle] = useState(seed?.title ?? "Hill repeats");
  const [templateId, setTemplateId] = useState(seed?.templateId ?? COMMON_WORKOUTS[1]?.id ?? "c-5k");
  const [mode, setMode] = useState<GroupMode>("race");
  const [metric, setMetric] = useState<GroupMetric>("minutes");
  const [hours, setHours] = useState(48);
  const [picked, setPicked] = useState<string[]>(["maya", "riley"]);
  const templateGroups = groupedTemplates();
  const templates = templateGroups.flatMap((g) => g.items);

  const template = templates.find((t) => t.id === templateId);

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const waiting = contacts.filter((c) => !c.friendId || !store.friends.includes(c.friendId));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Contacts</Eyebrow>
            <p className="mt-2 max-w-xl text-sm text-mute">
              Sync the whole address book, then add anyone who isn&apos;t in Pact yet. On phones with the Contact Picker this
              reads the real list; otherwise Pact loads a local dump so the circle still fills.
            </p>
            {syncedAt ? <p className="mt-1 text-xs text-mute">{contacts.length} synced · {timeAgo(syncedAt)}</p> : null}
          </div>
          <Button
            onClick={() => {
              void readDeviceContacts().then(({ contacts: rows }) => {
                store.syncContacts(rows);
              });
            }}
          >
            <Phone className="h-4 w-4" />
            Sync all contacts
          </Button>
        </div>
        {contacts.length ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {contacts.map((c) => {
              const inCircle = Boolean(c.friendId && store.friends.includes(c.friendId));
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-mute">{c.phone || c.email || c.source}</p>
                  </div>
                  {inCircle ? (
                    <span className="text-xs text-acid">In circle</span>
                  ) : (
                    <Button tone="ghost" className="px-3 text-xs" onClick={() => store.addFriendFromContact(c.id)}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {waiting.length && syncedAt ? (
          <p className="mt-3 text-xs text-mute">{waiting.length} contacts are not in your Pact circle yet.</p>
        ) : null}
      </Card>

      <Card className="p-5">
        <Eyebrow>New group</Eyebrow>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Title</span>
            <Field className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Workout</span>
            <select className={`mt-1 ${SELECT}`} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templateGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} · {t.minutes} min
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Chip active={mode === "together"} onClick={() => setMode("together")}>
              Together
            </Chip>
            <Chip active={mode === "race"} onClick={() => setMode("race")}>
              Race
            </Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["minutes", "kcal", "sessions"] as GroupMetric[]).map((m) => (
              <Chip key={m} active={metric === m} onClick={() => setMetric(m)}>
                {metricLabel(m)}
              </Chip>
            ))}
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-mute">Window (hours)</span>
            <Field className="mt-1" type="number" min={6} value={hours} onChange={(e) => setHours(Number(e.target.value) || 24)} />
          </label>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-mute">Invite the circle</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {circle.map((f) => (
            <Chip key={f.id} active={picked.includes(f.id)} onClick={() => toggle(f.id)}>
              {f.name.split(" ")[0]}
            </Chip>
          ))}
        </div>
        <Button
          className="mt-5"
          disabled={!title.trim() || !template}
          onClick={() => {
            if (!template) return;
            const group = store.createGroupWorkout({
              title: title.trim(),
              category: template.category,
              minutes: template.minutes,
              kcal: template.kcal,
              mode,
              metric,
              hours,
              memberIds: picked,
              templateId: template.id,
            });
            router.push(`/workouts/group/${group.id}`);
          }}
        >
          {mode === "race" ? "Start race" : "Create group session"}
        </Button>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {groups
          .filter((g) => g.memberIds.includes("me") || g.pendingIds.includes("me") || g.hostId === "me")
          .map((g) => {
            const board = groupBoard(g, store.extraFriends);
            const lead = board[0];
            const open = groupOpen(g);
            return (
              <Link key={g.id} href={`/workouts/group/${g.id}`}>
                <Card className="p-5 transition hover:border-acid/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-mute">
                      {g.mode === "race" ? "Race" : "Together"} · {g.category}
                    </p>
                    {g.mode === "race" ? <Trophy className="h-4 w-4 text-gold" /> : null}
                  </div>
                  <h2 className="mt-1 text-xl">{g.title}</h2>
                  <p className="mt-1 text-sm text-mute">
                    {g.memberIds.length} moving · {open ? "live" : "closed"} · scored on {metricLabel(g.metric)}
                  </p>
                  {lead ? (
                    <p className="mt-3 text-sm">
                      Leading: {lead.name} · {lead.value} {metricLabel(g.metric)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex -space-x-2">
                    {g.memberIds.slice(0, 6).map((id) => (
                      <span
                        key={id}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink bg-white/10 text-[10px]"
                      >
                        {initials(personById(id, store.extraFriends)?.name ?? id)}
                      </span>
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

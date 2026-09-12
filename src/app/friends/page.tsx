"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { usePact } from "@/lib/store";
import { initials, peopleInCircle, personById, readDeviceContacts } from "@/lib/training";
import { Phone, UserPlus } from "lucide-react";
import Link from "next/link";

export default function FriendsPage() {
  const store = usePact();
  const circle = peopleInCircle(store.friends, store.extraFriends);
  const pendingGroups = store.groups.filter((g) => g.pendingIds.includes("me"));
  const waiting = store.contacts.filter((c) => !c.friendId || !store.friends.includes(c.friendId));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Accountability</Eyebrow>
          <h1 className="mt-2 font-display text-4xl tracking-tight">Friends who can see the work.</h1>
          <p className="mt-3 max-w-2xl text-mute">
            Recovery comparison only if they share it. Nudges land in chat. Sync every contact, add them to the circle, then
            throw them into a group session or a race.
          </p>
        </div>
        <Button
          onClick={() => {
            void readDeviceContacts().then(({ contacts }) => store.syncContacts(contacts));
          }}
        >
          <Phone className="h-4 w-4" />
          Sync all contacts
        </Button>
      </div>

      {pendingGroups.length ? (
        <Card className="border-acid/40 p-5">
          <Eyebrow>Group invites</Eyebrow>
          <ul className="mt-3 space-y-3">
            {pendingGroups.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-sm text-mute">
                    {g.mode === "race" ? "Race" : "Together"} · {personById(g.hostId, store.extraFriends)?.name ?? g.hostId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/workouts/group/${g.id}`}>
                    <Button tone="ghost">Board</Button>
                  </Link>
                  <Button onClick={() => store.acceptGroup(g.id)}>Join</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {store.contacts.length ? (
        <Card className="p-5">
          <Eyebrow>Address book</Eyebrow>
          <p className="mt-2 text-sm text-mute">
            {store.contacts.length} contacts synced
            {store.contactsSyncedAt ? ` · ${timeAgo(store.contactsSyncedAt)}` : ""}. {waiting.length} not in the circle.
          </p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {store.contacts.map((c) => {
              const inCircle = Boolean(c.friendId && store.friends.includes(c.friendId));
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-mute">{c.phone || c.email || "No number"}</p>
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
        </Card>
      ) : (
        <p className="text-sm text-mute">No contacts yet. Sync to pull Maya, Priya, and the rest of the dump — or your real phonebook on a supporting browser.</p>
      )}

      <div className="grid gap-3">
        {circle.map((f) => (
          <Card key={f.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 font-display text-lg">
                {initials(f.name)}
              </div>
              <div>
                <p className="font-medium">
                  {f.name}{" "}
                  {f.online && store.privacy.activityStatus ? (
                    <span className="ml-1 inline-block h-2 w-2 rounded-full bg-acid" />
                  ) : null}
                </p>
                <p className="text-sm text-mute">
                  @{f.handle} · {f.city} · {f.pace} · {f.streak} day streak
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {store.privacy.recovery !== "private" ? (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-mute">Recovery</p>
                  <p className="font-mono text-lg text-acid">{f.recovery}</p>
                </div>
              ) : null}
              {store.privacy.strain !== "private" ? (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-mute">Strain</p>
                  <p className="font-mono text-lg text-heat">{f.strain}</p>
                </div>
              ) : null}
              <Link href={`/chat/${f.id}`}>
                <Button tone="ghost">Chat</Button>
              </Link>
              <Button onClick={() => store.nudge(f.id)}>Nudge</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

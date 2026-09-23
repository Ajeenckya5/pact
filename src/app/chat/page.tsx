"use client";

import { timeAgo } from "@/lib/format";
import { usePact } from "@/lib/store";
import { initials, peopleInCircle } from "@/lib/training";
import Link from "next/link";

export default function ChatIndexPage() {
  const store = usePact();
  const threads = peopleInCircle(store.friends, store.extraFriends, store.demo);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Chat</h1>
      <p className="text-mute">
        Photos, nudges, and session shares with people. Training and diet sit in{" "}
        <Link href="/coach" className="text-acid">
          Pact Coach
        </Link>
        . App how-tos sit in{" "}
        <Link href="/faq" className="text-acid">
          FAQ
        </Link>
        . Read receipts stay off unless you flip them in Privacy.
      </p>
      <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {threads.map((f) => {
          const msgs = store.messages[f.id] ?? [];
          const last = msgs[msgs.length - 1];
          return (
            <Link key={f.id} href={`/chat/${f.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-sm">
                {initials(f.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-mute">{last ? timeAgo(last.at) : ""}</p>
                </div>
                <p className="truncate text-sm text-mute">{last?.text ?? "Say something."}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

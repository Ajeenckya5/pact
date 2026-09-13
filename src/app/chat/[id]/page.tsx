"use client";

import { ClipScanButton } from "@/components/ClipScan";
import { Button, Field } from "@/components/ui";
import { clock } from "@/lib/format";
import { usePact } from "@/lib/store";
import { personById } from "@/lib/training";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const store = usePact();
  const friend = personById(id, store.extraFriends);
  const [text, setText] = useState("");
  const msgs = store.messages[id] ?? [];

  if (!friend) {
    return (
      <div className="py-16 text-center">
        <p>No such thread.</p>
        <Link href="/chat" className="text-acid">
          Inbox
        </Link>
      </div>
    );
  }

  function send() {
    if (!text.trim()) return;
    store.sendMessage(id, text.trim());
    setText("");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/chat" className="text-xs text-mute">
            ← Inbox
          </Link>
          <h1 className="font-display text-3xl">{friend.name}</h1>
          <p className="text-sm text-mute">@{friend.handle} · CLIP captions the photo here; it is not uploaded</p>
        </div>
        <Button tone="ghost" onClick={() => store.nudge(friend.id)}>
          Nudge
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-line bg-card p-4">
        {msgs.map((m) => {
          const mine = m.from === "me";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-acid text-ink" : "bg-white/8"}`}
              >
                {m.kind === "photo" && m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt="" className="mb-2 max-h-56 rounded-xl object-cover" />
                ) : null}
                <p>{m.text}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-ink/60" : "text-mute"}`}>
                  {m.kind !== "text" ? `${m.kind} · ` : ""}
                  {clock(m.at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <ClipScanButton
          label="Photo"
          onScan={(scan, _file, preview) => {
            const caption =
              scan.kind === "food" && scan.food?.top
                ? `${scan.food.top.name} · ${scan.food.top.kcal} kcal`
                : scan.caption;
            store.sendMessage(id, caption, "photo", preview);
          }}
        />
        <Field
          value={text}
          placeholder={`Message ${friend.name.split(" ")[0]}`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}

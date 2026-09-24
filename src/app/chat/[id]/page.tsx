"use client";

import { ClipScanButton } from "@/components/ClipScan";
import { Button, Field } from "@/components/ui";
import { reportApi } from "@/lib/api-origin";
import { clock } from "@/lib/format";
import { deviceIdentity } from "@/lib/identity";
import { fetchJson } from "@/lib/http";
import { pactHeaders } from "@pact/core";
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
  const [reportId, setReportId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [share, setShare] = useState(false);
  const blocked = store.blocked.includes(id);
  const msgs = (store.messages[id] ?? []).filter((message) => message.from === "me" || !blocked);

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
          <p className="text-sm text-mute">@{friend.handle} · A photo stays on this device</p>
        </div>
        <div className="flex gap-2">
          <Button tone="ghost" disabled={blocked} onClick={() => store.nudge(friend.id)}>
            Nudge
          </Button>
          <Button tone="ghost" disabled={blocked} onClick={() => store.blockPerson(friend.id)}>
            Block
          </Button>
        </div>
      </div>
      {blocked ? (
        <p className="mb-3 text-sm text-mute">Their messages stay hidden and nudges are off.</p>
      ) : null}
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
                  {mine && m.status === "seen" ? " · Seen" : ""}
                  {mine && m.status === "delivered" ? " · Delivered" : ""}
                  {mine && m.status === "pending" ? " · Sending" : ""}
                  {mine && m.status === "failed" ? " · Not delivered" : ""}
                </p>
                {mine ? null : (
                  <button type="button" className="mt-2 text-[11px] underline underline-offset-2" onClick={() => setReportId(m.id)}>
                    Report
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {reportId ? (
          <form
            className="space-y-2 rounded-2xl border border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!share) {
                store.flash("Choose to share that one message");
                return;
              }
              const saved = store.reportMessage(id, reportId, reason);
              if (!saved) return;
              const message = (store.messages[id] ?? []).find((row) => row.id === reportId);
              void deviceIdentity().then(async (keys) => {
                const body = JSON.stringify({
                  v: 1,
                  pactId: id,
                  reporter: store.profile.handle || "you",
                  messageId: reportId,
                  reason: reason.trim(),
                  text: message?.text ?? "",
                });
                const path = `/pacts/${id}/reports`;
                const headers = await pactHeaders(keys, { method: "POST", path, body });
                await fetchJson(reportApi(id), {
                  method: "POST",
                  headers: { "content-type": "application/json", ...headers },
                  retries: 0,
                  body,
                });
              });
              setReportId(null);
              setReason("");
              setShare(false);
            }}
          >
            <Field label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
              Share this one message
            </label>
            <p className="text-xs text-mute">
              The report contact is in{" "}
              <Link href="/you" className="underline underline-offset-2">
                You → About
              </Link>
              .
            </p>
            <Button type="submit">Send report</Button>
          </form>
        ) : null}
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
          label="Message"
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

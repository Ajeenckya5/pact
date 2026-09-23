"use client";

import { Button, Card, Eyebrow, Field } from "@/components/ui";
import { inviteFragment, openMessage, parseInviteFragment, randomSecret, sealMessage } from "@pact/core";
import { fetchJson } from "@/lib/http";
import { usePact } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function PeoplePage() {
  const store = usePact();
  const [link, setLink] = useState("");
  const [pactId, setPactId] = useState("");
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  const [inbox, setInbox] = useState<string[]>([]);

  async function createInvite() {
    const nextId = crypto.randomUUID();
    const nextSecret = await randomSecret();
    const base = window.location.pathname.startsWith("/pact") ? "/pact" : "";
    const url = `${window.location.origin}${base}/join#${inviteFragment(nextId, nextSecret)}`;
    sessionStorage.setItem(`pact.secret.${nextId}`, nextSecret);
    setPactId(nextId);
    setSecret(nextSecret);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      store.flash("Invite link copied");
    } catch {
      store.flash("Copy the invite link");
    }
  }

  function applyInvite(value: string) {
    const parsed = parseInviteFragment(value.includes("#") ? value.slice(value.indexOf("#")) : value);
    if (!parsed) {
      store.flash("That invite link is missing its secret");
      return;
    }
    sessionStorage.setItem(`pact.secret.${parsed.pactId}`, parsed.inviteSecret);
    setPactId(parsed.pactId);
    setSecret(parsed.inviteSecret);
    setLink(value);
  }

  async function send() {
    const text = note.trim();
    if (!pactId || !secret || !text) return;
    const box = await sealMessage(secret, text);
    const body = { v: 1 as const, pactId, sender: store.profile.handle || "you", box };
    const sent = await fetchJson(`/api/pacts/${encodeURIComponent(pactId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      retries: 0,
    });
    if (sent.ok) {
      store.flash("Message sent");
    } else {
      const queued = JSON.parse(localStorage.getItem("pact.outbox") || "[]") as unknown[];
      queued.push(body);
      localStorage.setItem("pact.outbox", JSON.stringify(queued));
      store.flash("Saved on this device. It sends when the pact server answers.");
    }
    setInbox((lines) => [...lines, text]);
    setNote("");
  }

  async function refresh() {
    if (!pactId || !secret) return;
    const result = await fetchJson<{ messages?: Array<{ box: string }> }>(`/api/pacts/${encodeURIComponent(pactId)}/messages`, {
      retries: 0,
    });
    if (!result.ok) {
      store.flash("The pact server did not answer");
      return;
    }
    const data = result.data;
    const lines: string[] = [];
    for (const message of data.messages ?? []) lines.push(await openMessage(secret, message.box));
    setInbox(lines);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>People</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Pacts, chat, and invites.</h1>
        <p className="mt-3 max-w-xl text-sm text-mute">
          No account and no contacts permission. The invite secret stays in the link. Partners see the four boxes you send.
        </p>
      </div>
      <Card className="space-y-3 p-6">
        <Button type="button" onClick={() => void createInvite()}>
          Create an invite
        </Button>
        <Field
          label="Invite link"
          value={link}
          onChange={(event) => {
            const value = event.target.value;
            setLink(value);
            if (value.includes("#")) applyInvite(value);
          }}
        />
        <Field label="Message" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!note.trim() || !secret} onClick={() => void send()}>
            Send
          </Button>
          <Button type="button" tone="ghost" disabled={!secret} onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {inbox.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/chat">
          Chat
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/friends">
          Friends
        </Link>
      </div>
    </div>
  );
}

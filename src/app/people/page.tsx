"use client";

import { Button, Card, Eyebrow, Field } from "@/components/ui";
import { inviteFragment, openEnvelope, parseInviteFragment, pactHeaders, randomSecret, type PactEnvelope } from "@pact/core";
import { queueEnvelope } from "@/lib/deliver";
import { deviceIdentity } from "@/lib/identity";
import { fetchJson } from "@/lib/http";
import { rememberPact } from "@/lib/pact-session";
import { usePact } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function PeoplePage() {
  const store = usePact();
  const [link, setLink] = useState("");
  const [pactId, setPactId] = useState("");
  const [secret, setSecret] = useState("");
  const [note, setNote] = useState("");
  const [inbox, setInbox] = useState<Array<{ id: string; sender: string; text: string }>>([]);
  const [reason, setReason] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [selfPk, setSelfPk] = useState("");

  async function createInvite() {
    const nextId = crypto.randomUUID();
    const nextSecret = await randomSecret();
    const base = window.location.pathname.startsWith("/pact") ? "/pact" : "";
    const url = `${window.location.origin}${base}/join#${inviteFragment(nextId, nextSecret)}`;
    rememberPact(nextId, nextSecret);
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
    rememberPact(parsed.pactId, parsed.inviteSecret);
    setPactId(parsed.pactId);
    setSecret(parsed.inviteSecret);
    setLink(value);
  }

  async function send() {
    const text = note.trim();
    if (!pactId || !secret || !text) return;
    const keys = await deviceIdentity();
    setSelfPk(keys.pk);
    const ok = await queueEnvelope(pactId, secret, "chat", { text });
    store.flash(ok ? "Message sent" : "Saved on this device. It sends when the pact server answers.");
    setInbox((lines) => [...lines, { id: crypto.randomUUID(), sender: keys.pk, text }]);
    setNote("");
  }

  async function refresh() {
    if (!pactId || !secret) return;
    const keys = await deviceIdentity();
    setSelfPk(keys.pk);
    const path = `/pacts/${pactId}/messages`;
    const headers = await pactHeaders(keys, { method: "GET", path, body: "" });
    const result = await fetchJson<{ messages?: PactEnvelope[] }>(`/api${path}?viewer=${encodeURIComponent(keys.pk)}`, {
      headers,
      retries: 0,
    });
    if (!result.ok) {
      store.flash("The pact server did not answer");
      return;
    }
    const lines: Array<{ id: string; sender: string; text: string }> = [];
    for (const message of result.data.messages ?? []) {
      if (store.blocked.includes(message.senderPk)) continue;
      const payload = (await openEnvelope(secret, message)) as { text?: string };
      lines.push({
        id: crypto.randomUUID(),
        sender: message.senderPk,
        text: typeof payload.text === "string" ? payload.text : message.kind,
      });
    }
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
        <ul className="space-y-3 text-sm">
          {inbox.map((line) => (
            <li key={line.id} className="rounded-2xl border border-line px-3 py-3">
              <p>{line.text}</p>
              <p className="mt-1 text-xs text-mute">{line.sender}</p>
              {line.sender === selfPk ? null : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    tone="ghost"
                    onClick={() => {
                      store.blockPerson(line.sender);
                      if (pactId) {
                        void deviceIdentity().then(async (keys) => {
                          const body = JSON.stringify({ by: keys.pk, target: line.sender });
                          const path = `/pacts/${pactId}/blocks`;
                          const headers = await pactHeaders(keys, { method: "POST", path, body });
                          await fetchJson(`/api${path}`, {
                            method: "POST",
                            headers: { "content-type": "application/json", ...headers },
                            retries: 0,
                            body,
                          });
                        });
                      }
                      setInbox((rows) => rows.filter((row) => row.sender !== line.sender));
                    }}
                  >
                    Block
                  </Button>
                  <Button type="button" tone="ghost" onClick={() => setShareId(line.id)}>
                    Report
                  </Button>
                </div>
              )}
              {shareId === line.id ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!reason.trim()) return;
                    void deviceIdentity().then(async (keys) => {
                      const body = JSON.stringify({
                        v: 1,
                        pactId: pactId || line.id,
                        reporter: store.profile.handle || "you",
                        messageId: line.id,
                        reason: reason.trim(),
                        text: line.text,
                      });
                      const path = `/pacts/${pactId || line.id}/reports`;
                      const headers = await pactHeaders(keys, { method: "POST", path, body });
                      await fetchJson("/api/reports", {
                        method: "POST",
                        headers: { "content-type": "application/json", ...headers },
                        retries: 0,
                        body,
                      });
                    });
                    store.reportMessage(pactId || line.id, line.id, reason, line.text);
                    setShareId(null);
                    setReason("");
                  }}
                >
                  <Field label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
                  <p className="text-xs text-mute">This sends only the message above.</p>
                  <Button type="submit">Share this message</Button>
                </form>
              ) : null}
            </li>
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

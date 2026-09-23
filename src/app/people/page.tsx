"use client";

import { Button, Card, Eyebrow, Field } from "@/components/ui";
import { inviteFragment, randomSecret } from "@pact/core";
import { usePact } from "@/lib/store";
import Link from "next/link";
import { useState } from "react";

export default function PeoplePage() {
  const store = usePact();
  const [link, setLink] = useState("");

  async function createInvite() {
    const pactId = crypto.randomUUID();
    const secret = await randomSecret();
    const base = window.location.pathname.startsWith("/pact") ? "/pact" : "";
    const url = `${window.location.origin}${base}/join#${inviteFragment(pactId, secret)}`;
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      store.flash("Invite link copied");
    } catch {
      store.flash("Copy the invite link");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>People</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Pacts, chat, and invites.</h1>
        <p className="mt-3 max-w-xl text-sm text-mute">
          No account and no contacts permission. Partners see the four boxes only if you share them.
        </p>
      </div>
      <Card className="space-y-3 p-6">
        <Button type="button" onClick={() => void createInvite()}>
          Create an invite
        </Button>
        {link ? <Field label="Invite link" readOnly value={link} /> : null}
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

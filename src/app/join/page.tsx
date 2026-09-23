"use client";

import { Card, Eyebrow } from "@/components/ui";
import { parseInviteFragment } from "@pact/core";
import { useEffect, useState } from "react";

export default function JoinPage() {
  const [label, setLabel] = useState("Reading the invite…");

  useEffect(() => {
    const parsed = parseInviteFragment(window.location.hash);
    const key = "pact.memberships";
    if (parsed) {
      const current = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      if (!current.includes(parsed.pactId)) localStorage.setItem(key, JSON.stringify([...current, parsed.pactId]));
      sessionStorage.setItem(`pact.secret.${parsed.pactId}`, parsed.inviteSecret);
    }
    const next = parsed
      ? "You joined this pact on this device. Messages stay encrypted."
      : "This invite link is missing its secret. Ask for a new link.";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the URL fragment after mount
    setLabel(next);
  }, []);

  return (
    <div className="mx-auto max-w-xl">
      <Eyebrow>Join</Eyebrow>
      <Card className="mt-4 p-6">
        <h1 className="font-display text-3xl tracking-tight">{label}</h1>
      </Card>
    </div>
  );
}

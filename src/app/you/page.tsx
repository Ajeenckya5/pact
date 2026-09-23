"use client";

import { InstallApp } from "@/components/InstallApp";
import { Button, Card, Eyebrow } from "@/components/ui";
import { GOALS } from "@/lib/data";
import { REPORT_CONTACT_URL } from "@/lib/report";
import { PERMISSIONS } from "@pact/core";
import { usePact } from "@/lib/store";
import Link from "next/link";

export default function YouPage() {
  const store = usePact();

  function download(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    download("pact.json", JSON.stringify(store, null, 2), "application/json");
  }

  function exportCsv() {
    const rows = ["id,ml,at", ...(store.waterLog ?? []).map((sip) => `${sip.id},${sip.ml},${sip.at}`)];
    download("pact-water.csv", rows.join("\n"), "text/csv");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>You</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">{store.profile.name.trim() || "You"}</h1>
      </div>
      <Card className="space-y-3 p-6">
        <p className="text-sm">Goal</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <Button key={goal.id} type="button" tone={store.goal === goal.id ? "accent" : "ghost"} onClick={() => store.setGoal(goal.id)}>
              {goal.name}
            </Button>
          ))}
        </div>
        <Button type="button" tone="ghost" onClick={() => store.setPrefs({ theme: store.prefs.theme === "light" ? "dark" : "light" })}>
          {store.prefs.theme === "light" ? "Use dark theme" : "Use light theme"}
        </Button>
        <Button type="button" tone="ghost" onClick={() => store.setPrefs({ seenReceipts: store.prefs.seenReceipts === false })}>
          {store.prefs.seenReceipts === false ? "Seen receipts are off" : "Seen receipts are on"}
        </Button>
        <p className="text-sm text-mute">Seen is encrypted. It is sent only while this is on.</p>
        {!store.demo ? (
          <Button type="button" tone="ghost" onClick={() => store.loadSample()}>
            Explore with sample data
          </Button>
        ) : (
          <Button type="button" tone="ghost" onClick={() => store.leaveSample()}>
            Leave sample data
          </Button>
        )}
      </Card>
      <Card className="space-y-2 p-6 text-sm text-mute">
        <InstallApp />
      </Card>
      <Card className="space-y-2 p-6 text-sm text-mute">
        <p className="text-cream">Permissions</p>
        <p>{PERMISSIONS.health.body}</p>
        <p>{PERMISSIONS.bluetooth.body}</p>
        <p>{PERMISSIONS.location.body}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button type="button" tone="ghost" onClick={exportJson}>
          Export JSON
        </Button>
        <Button type="button" tone="ghost" onClick={exportCsv}>
          Export water CSV
        </Button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm">
          Import JSON
          <input
            className="sr-only"
            type="file"
            accept="application/json"
            aria-label="Import JSON"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text()) as Parameters<typeof store.importAccount>[0];
                store.importAccount(parsed);
              } catch {
                store.flash("That file is not a Pact export");
              }
            }}
          />
        </label>
        <Button type="button" tone="danger" onClick={() => store.eraseAll()}>
          Delete my data
        </Button>
      </div>
      <Card className="space-y-2 p-6">
        <Eyebrow>About</Eyebrow>
        <p className="text-sm text-mute">
          To report a message, open the chat, choose that one message, and add a reason. The report includes only the message you share.
        </p>
        <a className="text-sm text-acid underline underline-offset-2" href={REPORT_CONTACT_URL}>
          Published report contact
        </a>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/wearables">
          Devices
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/privacy">
          Privacy
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/faq">
          FAQ
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/strava">
          Strava
        </Link>
        <Link className="min-h-11 rounded-2xl border border-line px-4 py-4" href="/map">
          Places
        </Link>
      </div>
    </div>
  );
}

"use client";

import { pactApi } from "@/lib/api-origin";
import { deviceIdentity } from "@/lib/identity";
import { fetchJson } from "@/lib/http";
import { readPact } from "@/lib/pact-session";
import { pactHeaders } from "@pact/core";
import { useEffect, useState } from "react";

const RELEASE = "https://github.com/Ajeenckya5/pact/releases/tag/mobile-v1.0.0";

type BeforeInstall = Event & { prompt: () => Promise<void> };

export function InstallApp() {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstall | null>(null);
  const [ios, setIos] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- install state is only known in the browser */
    const media = window.matchMedia("(display-mode: standalone)").matches;
    const apple = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(media || apple);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstall);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function enableNudges() {
    const room = readPact();
    if (!room) {
      setNote("Open a pact invite first. Alerts go to that pact.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setNote("This browser does not offer alerts.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNote("Alerts stay off until you allow them.");
      return;
    }
    const ready = await navigator.serviceWorker.ready;
    const config = await fetchJson<{ publicKey?: string }>(pactApi("/push/vapid"), { retries: 0 });
    if (!config.ok || !config.data.publicKey) {
      setNote("Nudge alerts are not on this server yet.");
      return;
    }
    const subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytesFromKey(config.data.publicKey),
    });
    const json = subscription.toJSON();
    const keys = await deviceIdentity();
    const body = JSON.stringify({
      endpoint: subscription.endpoint,
      pactId: room.pactId,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    });
    const path = "/push/subscribe";
    const headers = await pactHeaders(keys, { method: "POST", path, body });
    const saved = await fetchJson(pactApi(path), {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      retries: 0,
    });
    setNote(saved.ok ? "Nudge alerts are on for this pact." : "The alert signup did not save.");
  }

  return (
    <div id="install" className="space-y-3">
      <p className="text-cream">Install</p>
      {installed ? <p>Pact is on your home screen.</p> : null}
      {ios && !installed ? (
        <ol className="list-decimal space-y-1 pl-5">
          <li>Tap the Share button in Safari.</li>
          <li>Choose Add to Home Screen.</li>
          <li>Open Pact from the icon, then turn on nudge alerts.</li>
        </ol>
      ) : null}
      {!ios && !installed ? <p>Add Pact to your home screen. iPhone uses this web app until an Apple account exists.</p> : null}
      {prompt ? (
        <button type="button" className="min-h-11 rounded-full bg-acid px-4 text-sm font-medium text-ink" onClick={() => void prompt.prompt()}>
          Install Pact
        </button>
      ) : null}
      <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => void enableNudges()}>
        Turn on nudge alerts
      </button>
      {note ? <p>{note}</p> : null}
      <p>
        Android build{" "}
        <a className="text-acid underline underline-offset-2" href={RELEASE}>
          mobile-v1.0.0
        </a>
        . iPhone stays on this installed site.
      </p>
    </div>
  );
}

function bytesFromKey(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad);
  return Uint8Array.from(bin, (char) => char.charCodeAt(0));
}

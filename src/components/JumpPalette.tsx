"use client";

import { Field } from "@/components/ui";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const TARGETS = [
  { href: "/", label: "Overview", hint: "Pact boxes, today's session" },
  { href: "/live", label: "Track", hint: "GPS + live HR from the paired strap" },
  { href: "/sleep", label: "Sleep", hint: "Night + reading" },
  { href: "/calories", label: "Calories", hint: "CLIP plate scan, pantry, repeat last" },
  { href: "/water", label: "Water", hint: "Tank + units" },
  { href: "/workouts", label: "Workouts", hint: "Track / race" },
  { href: "/workouts?tab=Library", label: "Library", hint: "Films and lifts" },
  { href: "/coach", label: "Coach", hint: "Train and diet, not FAQ" },
  { href: "/fuel", label: "Market", hint: "Goal cart" },
  { href: "/recipes", label: "Recipes", hint: "Kitchen solver" },
  { href: "/map", label: "Places", hint: "Gyms and grocers" },
  { href: "/strava", label: "Strava", hint: "Pull a ride" },
  { href: "/wearables", label: "Wearables", hint: "Bluetooth pair" },
  { href: "/friends", label: "Friends", hint: "Circle" },
  { href: "/chat", label: "Chat", hint: "People" },
  { href: "/community", label: "Community", hint: "Posts" },
  { href: "/privacy", label: "Privacy", hint: "Units and motion" },
  { href: "/faq", label: "FAQ", hint: "App how-tos" },
];

export function JumpPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return TARGETS;
    return TARGETS.filter((t) => `${t.label} ${t.hint} ${t.href}`.toLowerCase().includes(n));
  }, [q]);

  useEffect(() => {
    function openPalette() {
      setOpen(true);
      setQ("");
      setActive(0);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setActive(0);
      }
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(hits.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && hits[active]) {
        e.preventDefault();
        router.push(hits[active].href);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pact-jump", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pact-jump", openPalette);
    };
  }, [open, hits, active, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <Field
          autoFocus
          className="rounded-none border-0 border-b"
          placeholder="Jump — calories, coach, squat…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          aria-label="Jump to a desk"
        />
        <ul className="max-h-80 overflow-y-auto p-2">
          {hits.length === 0 ? (
            <li className="px-3 py-4 text-sm text-mute">Nothing matches.</li>
          ) : (
            hits.map((t, i) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cn(
                    "flex w-full items-baseline justify-between rounded-2xl px-3 py-2 text-left",
                    i === active ? "bg-acid/15 text-acid" : "hover:bg-white/5",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setOpen(false)}
                >
                  <span>{t.label}</span>
                  <span className="text-xs text-mute">{t.hint}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Esc to close · ↑↓ to move · Enter to go</p>
      </div>
    </div>
  );
}

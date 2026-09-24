"use client";

import { JumpPalette } from "@/components/JumpPalette";
import { PwaRegister } from "@/components/PwaRegister";
import { Onboard } from "@/components/Onboard";
import { ToastHost } from "@/components/Providers";
import { hasPactData } from "@/lib/score-ready";
import { pactScore, usePact } from "@/lib/store";
import { useLiveBody } from "@/lib/wearable-live-context";
import { cn } from "@/lib/cn";
import {
  Activity,
  Bot,
  Droplets,
  Dumbbell,
  LayoutGrid,
  MapPin,
  Menu,
  Navigation,
  Shield,
  ChefHat,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const LIVE_WEB = process.env.NEXT_PUBLIC_PACT_WEB || "https://pact-aj.pages.dev";

function PagesHome() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hostname is only known in the browser
    setShow(window.location.hostname === "ajeenckya5.github.io");
  }, []);
  if (!show) return null;
  return (
    <p className="border-b border-line bg-acid/10 px-4 py-2 text-center text-sm text-cream">
      The live app is at{" "}
      <a className="text-acid underline underline-offset-2" href={LIVE_WEB}>
        {LIVE_WEB.replace("https://", "")}
      </a>
      .
    </p>
  );
}

const NAV = [
  { href: "/", label: "Today", icon: LayoutGrid, group: "Pact" },
  { href: "/log", label: "Log", icon: Droplets, group: "Pact" },
  { href: "/workouts", label: "Train", icon: Dumbbell, group: "Pact" },
  { href: "/people", label: "People", icon: Users, group: "Pact" },
  { href: "/you", label: "You", icon: Shield, group: "Pact" },
  { href: "/live", label: "Track", icon: Navigation, group: "More" },
  { href: "/coach", label: "Coach", icon: Bot, group: "More" },
  { href: "/fuel", label: "Market", icon: ShoppingBag, group: "More" },
  { href: "/recipes", label: "Recipes", icon: ChefHat, group: "More" },
  { href: "/map", label: "Places", icon: MapPin, group: "More" },
  { href: "/strava", label: "Strava", icon: Activity, group: "More" },
];

const MOBILE = [
  { href: "/", label: "Today", icon: LayoutGrid },
  { href: "/log", label: "Log", icon: Droplets },
  { href: "/workouts", label: "Train", icon: Dumbbell },
  { href: "/people", label: "People", icon: Users },
  { href: "/you", label: "You", icon: Shield },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const store = usePact();
  const { body } = useLiveBody();
  const [open, setOpen] = useState(false);
  const scored = hasPactData(store);
  const score = pactScore({ ...store, recovery: body.recovery, sleepScore: body.sleepScore });
  const unread = Object.values(store.messages).reduce(
    (n, thread) => n + thread.filter((m) => m.from !== "me").length,
    0,
  );

  return (
    <div className="min-h-dvh bg-ink text-cream">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_circle_at_0%_-10%,rgba(194,77,50,0.14),transparent_42%),radial-gradient(700px_circle_at_100%_0%,rgba(63,107,76,0.12),transparent_36%)]" />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-line bg-panel/95 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="font-display text-2xl tracking-tight" onClick={() => setOpen(false)}>
            PACT
          </Link>
          <button className="inline-flex min-h-11 min-w-11 items-center justify-center lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-4 mb-4 rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-sm font-medium">{store.profile.name.trim() || "You"}</p>
          <p className="text-xs text-mute">
            @{store.profile.handle || "you"} · {store.streak} day streak
            {store.demo ? " · sample" : ""}
          </p>
          <p className="mt-2 font-mono text-sm text-acid">{scored ? `Pact score ${score}` : "No score yet"}</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-8">
          {groups(NAV).map(([group, items]) => (
            <div key={group}>
              <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-mute">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                        active ? "bg-acid/15 text-acid" : "text-mute hover:bg-white/5 hover:text-cream",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {item.href === "/chat" && unread > 0 ? (
                        <span className="ml-auto rounded-full bg-acid px-2 py-0.5 font-mono text-[10px] text-ink">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      ) : null}

      <div className="relative lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line/70 bg-ink/75 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-white/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-mute lg:block">
            {store.demo ? "Sample data · " : ""}
            {body.ble.links
              ? `BT ${body.ble.name ?? "device"} · Recovery ${body.recovery} · Strain ${body.strain.toFixed(1)}${body.hr != null ? ` · ${body.hr} bpm` : ""}`
              : store.demo
                ? `Recovery ${body.recovery} · Strain ${body.strain.toFixed(1)}`
                : "No wearable connected"}
          </p>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="hidden rounded-full border border-line px-3 py-1 text-[11px] text-mute hover:text-cream md:inline"
              onClick={() => window.dispatchEvent(new Event("pact-jump"))}
            >
              Jump ⌘K
            </button>
            <Link href="/privacy" className="text-xs uppercase tracking-[0.16em] text-mute hover:text-cream">
              Privacy on
            </Link>
          </div>
        </header>
        <PagesHome />
        {store.demo ? (
          <p className="bg-[repeating-linear-gradient(135deg,rgba(194,77,50,0.18)_0_10px,transparent_10px_20px)] px-4 py-2 text-center text-xs font-semibold tracking-wide text-acid">
            Sample data
          </p>
        ) : null}
        <main id="main" className="px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel/95 px-1 py-2 backdrop-blur-xl lg:hidden">
        {MOBILE.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 py-1 text-[10px]",
                active ? "text-acid" : "text-mute",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <PwaRegister />
      <ToastHost />
      <Onboard />
      <JumpPalette />
      <PrefsFx />
    </div>
  );
}

function groups<T extends { group: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return Array.from(map.entries());
}

function PrefsFx() {
  const { prefs } = usePact();
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);
    document.documentElement.classList.toggle("light", prefs.theme === "light");
  }, [prefs.reducedMotion, prefs.theme]);
  return null;
}

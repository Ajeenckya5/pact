"use client";

import { JumpPalette } from "@/components/JumpPalette";
import { Onboard } from "@/components/Onboard";
import { ToastHost } from "@/components/Providers";
import { USER } from "@/lib/data";
import { pactScore, usePact } from "@/lib/store";
import { useLiveBody } from "@/lib/wearable-live-context";
import { cn } from "@/lib/cn";
import {
  Activity,
  Bot,
  Droplets,
  Dumbbell,
  HelpCircle,
  LayoutGrid,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Navigation,
  Radio,
  Shield,
  ChefHat,
  ShoppingBag,
  Utensils,
  Users,
  Watch,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid, group: "Live" },
  { href: "/live", label: "Track", icon: Navigation, group: "Live" },
  { href: "/sleep", label: "Sleep", icon: Moon, group: "Body" },
  { href: "/calories", label: "Calories", icon: Utensils, group: "Body" },
  { href: "/water", label: "Water", icon: Droplets, group: "Body" },
  { href: "/workouts", label: "Workouts", icon: Dumbbell, group: "Body" },
  { href: "/coach", label: "Coach", icon: Bot, group: "Body" },
  { href: "/fuel", label: "Market", icon: ShoppingBag, group: "Fuel" },
  { href: "/recipes", label: "Recipes", icon: ChefHat, group: "Fuel" },
  { href: "/map", label: "Places", icon: MapPin, group: "World" },
  { href: "/strava", label: "Strava", icon: Activity, group: "World" },
  { href: "/wearables", label: "Wearables", icon: Watch, group: "World" },
  { href: "/friends", label: "Friends", icon: Users, group: "People" },
  { href: "/chat", label: "Chat", icon: MessageCircle, group: "People" },
  { href: "/community", label: "Community", icon: Radio, group: "People" },
  { href: "/privacy", label: "Privacy", icon: Shield, group: "Trust" },
  { href: "/faq", label: "FAQ", icon: HelpCircle, group: "Trust" },
];

const MOBILE = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/calories", label: "Fuel", icon: Utensils },
  { href: "/workouts", label: "Train", icon: Dumbbell },
  { href: "/community", label: "Circle", icon: Radio },
  { href: "/chat", label: "Chat", icon: MessageCircle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const store = usePact();
  const { body } = useLiveBody();
  const [open, setOpen] = useState(false);
  const score = pactScore({ ...store, recovery: body.recovery, sleepScore: body.sleepScore });
  const unread = Object.values(store.messages).reduce(
    (n, thread) => n + thread.filter((m) => m.from !== "me").length,
    0,
  );

  useEffect(() => {
    void import("@/lib/plate-net")
      .then((m) => m.preloadFoodNet())
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh bg-ink text-cream">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_circle_at_10%_-10%,rgba(214,255,63,0.08),transparent_40%),radial-gradient(800px_circle_at_90%_0%,rgba(92,200,255,0.07),transparent_35%)]" />
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
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-4 mb-4 rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-sm font-medium">{USER.name}</p>
          <p className="text-xs text-mute">
            @{USER.handle} · {USER.streak} day streak
          </p>
          <p className="mt-2 font-mono text-sm text-acid">Pact score {score}</p>
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
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
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
          <button className="rounded-full p-2 hover:bg-white/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-mute lg:block">
            {body.ble.links
              ? `BT ${body.ble.name ?? "device"} · Recovery ${body.recovery} · Strain ${body.strain.toFixed(1)}${body.hr != null ? ` · ${body.hr} bpm` : ""}`
              : `Recovery ${body.recovery} · Strain ${body.strain.toFixed(1)} · Pact log · no wearable`}
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
                "flex flex-col items-center gap-1 py-1 text-[10px]",
                active ? "text-acid" : "text-mute",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
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
  }, [prefs.reducedMotion]);
  return null;
}

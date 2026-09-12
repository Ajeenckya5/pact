import { FRIENDS, USER, WORKOUTS } from "./data";
import { workoutKind } from "./muscles";
import type {
  DeviceContact,
  Friend,
  GroupMetric,
  GroupScore,
  GroupWorkout,
  WorkoutLog,
} from "./types";

export type CommonWorkout = {
  id: string;
  title: string;
  category: string;
  minutes: number;
  kcal: number;
  equipment: string[];
  muscles: string[];
  cue: string;
  why: string;
};

/** ACS / CDC-style sessions people actually repeat — one-tap logs, not films. */
export const COMMON_WORKOUTS: CommonWorkout[] = [
  { id: "c-walk", title: "Brisk walk", category: "Cardio", minutes: 30, kcal: 140, equipment: ["Shoes"], muscles: ["Legs"], cue: "Talk test: you can speak, not sing.", why: "Most logged session worldwide" },
  { id: "c-5k", title: "5K run", category: "Running", minutes: 32, kcal: 320, equipment: ["Shoes"], muscles: ["Legs", "Engine"], cue: "Even splits. Land under you.", why: "Default race-pace day" },
  { id: "c-strength", title: "Full-body strength", category: "Strength", minutes: 40, kcal: 280, equipment: ["Dumbbells"], muscles: ["Full body"], cue: "Two hard sets per pattern.", why: "Gym-floor staple" },
  { id: "c-pushups", title: "Push-up pyramid", category: "Calisthenics", minutes: 12, kcal: 80, equipment: ["None"], muscles: ["Chest", "Triceps", "Core"], cue: "Hollow ribs. Screw the floor.", why: "Zero-kit classic" },
  { id: "c-yoga", title: "Yoga flow", category: "Yoga", minutes: 25, kcal: 90, equipment: ["Mat"], muscles: ["Mobility", "Breath"], cue: "If the neck gripes, look down.", why: "Recovery day default" },
  { id: "c-hiit", title: "20 min HIIT", category: "HIIT", minutes: 20, kcal: 280, equipment: ["None"], muscles: ["Cardio", "Legs"], cue: "Sprint the work, own the rest.", why: "Hotel-room finisher" },
  { id: "c-cycle", title: "Zone-2 bike", category: "Cycling", minutes: 45, kcal: 360, equipment: ["Bike"], muscles: ["Quads", "Engine"], cue: "Nose breathing. Conversation pace.", why: "Aerobic base builder" },
  { id: "c-swim", title: "Easy swim", category: "Swim", minutes: 30, kcal: 240, equipment: ["Pool"], muscles: ["Lats", "Engine"], cue: "Tall body, quiet kick.", why: "Low-impact engine work" },
  { id: "c-pilates", title: "Pilates core", category: "Pilates", minutes: 25, kcal: 140, equipment: ["Mat"], muscles: ["Core", "Glutes"], cue: "Exhale on the effort.", why: "Desk-body reset" },
  { id: "c-stretch", title: "Stretch + mobility", category: "Mobility", minutes: 15, kcal: 50, equipment: ["None"], muscles: ["Hips", "T-spine"], cue: "End-range is a conversation.", why: "Most skipped, most needed" },
  { id: "c-stairs", title: "Stair repeats", category: "Cardio", minutes: 18, kcal: 200, equipment: ["None"], muscles: ["Glutes", "Engine"], cue: "Quiet feet. Drive the knee.", why: "City-block session" },
  { id: "c-ruck", title: "Ruck / weighted walk", category: "Cardio", minutes: 40, kcal: 280, equipment: ["Pack"], muscles: ["Posterior", "Core"], cue: "Pack high. Shorten the stride.", why: "Hyrox-adjacent volume" },
];

export const WORKOUT_CATEGORIES = [
  "Cardio",
  "Running",
  "Strength",
  "HIIT",
  "Yoga",
  "Pilates",
  "Barre",
  "Mobility",
  "Cycling",
  "Swim",
  "Boxing",
  "Calisthenics",
  "Sports",
  "Core",
  "Dance",
];

/** Local address-book dump used when the Contact Picker API is missing or cancelled. */
export const DEVICE_CONTACTS: DeviceContact[] = [
  { id: "dc-maya", name: "Maya Chen", phone: "+1 415 555 0142", email: "maya@splits.club", friendId: "maya", source: "dump" },
  { id: "dc-jordan", name: "Jordan Blake", phone: "+1 510 555 0190", email: "j.blake@oak.run", friendId: "jordan", source: "dump" },
  { id: "dc-priya", name: "Priya Shah", phone: "+1 415 555 0118", email: "priya.shah@gmail.com", handle: "priya.km", source: "dump" },
  { id: "dc-luis", name: "Luis Ortega", phone: "+1 628 555 0177", email: "luis.ortega@icloud.com", handle: "l.ortega", source: "dump" },
  { id: "dc-nina", name: "Nina Kowalski", phone: "+1 415 555 0104", email: "nina.k@berkeley.edu", handle: "nina.k", source: "dump" },
  { id: "dc-devon", name: "Devon Hale", phone: "+1 925 555 0166", email: "devon.hale@pm.me", handle: "devon.hale", source: "dump" },
  { id: "dc-amira", name: "Amira Hassan", phone: "+1 415 555 0133", email: "amira.h@outlook.com", handle: "amira.h", source: "dump" },
  { id: "dc-theo", name: "Theo Marin", phone: "+1 650 555 0129", email: "theo.marin@me.com", handle: "theo.m", source: "dump" },
];

export function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

export function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

export function estimateKcal(category: string, minutes: number) {
  const per: Record<string, number> = {
    HIIT: 14,
    Running: 10,
    Cycling: 8,
    Swim: 8,
    Strength: 7,
    Split: 8,
    Boxing: 13,
    Cardio: 7,
    Yoga: 3.5,
    Pilates: 5.5,
    Barre: 6,
    Mobility: 3,
    Calisthenics: 7,
    Sports: 9,
    Core: 7,
    Dance: 9,
  };
  return Math.max(20, Math.round(minutes * (per[category] ?? 7)));
}

export function weekStats(logs: WorkoutLog[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const recent = logs.filter((l) => new Date(l.at) >= start);
  const days = new Set(recent.map((l) => dayKey(l.at)));
  return {
    sessions: recent.length,
    minutes: recent.reduce((n, l) => n + l.minutes, 0),
    kcal: recent.reduce((n, l) => n + l.kcal, 0),
    days: days.size,
  };
}

export function todayLogs(logs: WorkoutLog[]) {
  const k = todayKey();
  return logs.filter((l) => dayKey(l.at) === k);
}

export function rankedCommon(logs: WorkoutLog[]): Array<CommonWorkout & { times: number }> {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const key = l.workoutId || l.title.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return COMMON_WORKOUTS.map((w) => ({
    ...w,
    times: counts.get(w.id) ?? counts.get(w.title.toLowerCase()) ?? 0,
  })).sort((a, b) => b.times - a.times || a.title.localeCompare(b.title));
}

export function peopleInCircle(friendIds: string[], extra: Friend[]): Friend[] {
  const known = FRIENDS.filter((f) => friendIds.includes(f.id));
  const seen = new Set(known.map((f) => f.id));
  return [...known, ...extra.filter((f) => friendIds.includes(f.id) && !seen.has(f.id))];
}

export function personById(id: string, extra: Friend[] = []): Friend | undefined {
  if (id === "me" || id === USER.id) {
    return {
      id: "me",
      name: USER.name,
      handle: USER.handle,
      city: USER.city,
      recovery: 86,
      strain: 11.2,
      streak: USER.streak,
      pace: "You",
      online: true,
    };
  }
  return FRIENDS.find((f) => f.id === id) ?? extra.find((f) => f.id === id);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function metricValue(score: GroupScore, metric: GroupMetric) {
  if (metric === "kcal") return score.kcal;
  if (metric === "sessions") return score.sessions;
  return score.minutes;
}

export function metricLabel(metric: GroupMetric) {
  if (metric === "kcal") return "kcal";
  if (metric === "sessions") return "sessions";
  return "min";
}

export function emptyScore(): GroupScore {
  return { sessions: 0, minutes: 0, kcal: 0 };
}

export function seedScore(memberId: string, groupId: string): GroupScore {
  if (memberId === "me") return emptyScore();
  let h = 0;
  const s = memberId + groupId;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  const sessions = (h % 4) + 1;
  const minutes = sessions * (18 + (h % 22));
  return { sessions, minutes, kcal: minutes * (7 + (h % 6)) };
}

export function groupBoard(group: GroupWorkout, extra: Friend[]) {
  const rows = group.memberIds.map((id) => {
    const person = personById(id, extra);
    const score = group.scores[id] ?? emptyScore();
    return {
      id,
      name: person?.name ?? id,
      handle: person?.handle ?? id,
      score,
      value: metricValue(score, group.metric),
    };
  });
  rows.sort((a, b) => b.value - a.value);
  return rows.map((row, i) => ({ ...row, place: i + 1 }));
}

export function groupOpen(group: GroupWorkout, now = Date.now()) {
  return now >= Date.parse(group.startsAt) && now <= Date.parse(group.endsAt);
}

export function findTemplate(id?: string): { title: string; category: string; minutes: number; kcal: number } | null {
  if (!id) return null;
  const common = COMMON_WORKOUTS.find((w) => w.id === id);
  if (common) return common;
  const film = WORKOUTS.find((w) => w.id === id);
  if (film) return film;
  return null;
}

export function allTemplates(): Array<{ id: string; title: string; category: string; minutes: number; kcal: number }> {
  return groupedTemplates().flatMap((g) => g.items);
}

export function groupedTemplates(): Array<{
  label: string;
  items: Array<{ id: string; title: string; category: string; minutes: number; kcal: number }>;
}> {
  const asRow = (w: { id: string; title: string; category: string; minutes: number; kcal: number }) => ({
    id: w.id,
    title: w.title,
    category: w.category,
    minutes: w.minutes,
    kcal: w.kcal,
  });
  return [
    { label: "Common", items: COMMON_WORKOUTS.map(asRow) },
    { label: "Programs", items: WORKOUTS.filter((w) => workoutKind(w) === "program").map(asRow) },
    { label: "Split days", items: WORKOUTS.filter((w) => workoutKind(w) === "split").map(asRow) },
    { label: "Follow-alongs", items: WORKOUTS.filter((w) => workoutKind(w) === "session").map(asRow) },
  ];
}

export function matchContactToFriend(name: string): Friend | undefined {
  const n = name.trim().toLowerCase();
  const first = n.split(/\s+/)[0] ?? "";
  return FRIENDS.find((f) => {
    const fn = f.name.toLowerCase();
    if (fn === n || fn.includes(n) || n.includes(fn)) return true;
    return first.length > 2 && fn.startsWith(first);
  });
}

export function mergeContacts(existing: DeviceContact[], incoming: DeviceContact[]): DeviceContact[] {
  const out = [...existing];
  for (const c of incoming) {
    const hit = out.find(
      (x) =>
        x.id === c.id ||
        (c.phone && x.phone === c.phone) ||
        (c.email && x.email?.toLowerCase() === c.email.toLowerCase()) ||
        x.name.toLowerCase() === c.name.toLowerCase(),
    );
    if (hit) {
      hit.phone = hit.phone || c.phone;
      hit.email = hit.email || c.email;
      hit.friendId = hit.friendId || c.friendId;
      continue;
    }
    const friend = c.friendId ? FRIENDS.find((f) => f.id === c.friendId) : matchContactToFriend(c.name);
    out.push({ ...c, friendId: c.friendId ?? friend?.id });
  }
  return out;
}

export function friendFromContact(contact: DeviceContact): Friend {
  const n = contact.name.trim() || "New contact";
  const slug = (contact.handle || n.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")).slice(0, 18);
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h + n.charCodeAt(i) * (i + 3)) % 97;
  return {
    id: contact.friendId || `c-${contact.id}`,
    name: n,
    handle: slug || contact.id,
    city: "Bay Area",
    recovery: 62 + (h % 28),
    strain: Number((6 + (h % 12) * 0.7).toFixed(1)),
    streak: 1 + (h % 30),
    pace: "Just joined the circle",
    online: h % 3 === 0,
  };
}

type PickedContact = { name?: string[]; email?: string[]; tel?: string[] };

export async function readDeviceContacts(): Promise<{ contacts: DeviceContact[]; via: "picker" | "dump" }> {
  const nav = navigator as Navigator & {
    contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<PickedContact[]> };
  };
  if (nav.contacts?.select) {
    try {
      const rows = await nav.contacts.select(["name", "email", "tel"], { multiple: true });
      if (rows?.length) {
        const contacts: DeviceContact[] = rows.map((row, i) => {
          const name = row.name?.[0]?.trim() || `Contact ${i + 1}`;
          const phone = row.tel?.[0];
          const email = row.email?.[0];
          return {
            id: `pick-${(phone || email || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
            name,
            phone,
            email,
            source: "device" as const,
            friendId: matchContactToFriend(name)?.id,
          };
        });
        return { contacts, via: "picker" };
      }
    } catch {
      /* user cancelled or unsupported properties */
    }
  }
  return { contacts: DEVICE_CONTACTS, via: "dump" };
}

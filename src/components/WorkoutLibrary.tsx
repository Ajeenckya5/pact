"use client";

import { MuscleMap } from "@/components/MuscleMap";
import { Button, Card, Chip, Eyebrow, Field } from "@/components/ui";
import {
  categoryList,
  countsByKind,
  equipmentList,
  filterLibrary,
  LIB_DURATIONS,
  LIB_KINDS,
  LIB_LEVELS,
  LIBRARY,
  patternList,
  type LibDuration,
  type LibKind,
  type LibLevel,
} from "@/lib/catalog";
import type { LiveExercise } from "@/lib/free-apis";
import { labelsFor, MUSCLE_GROUPS, PATTERN_LABEL, targetsOf, workoutKind, type MuscleGroup } from "@/lib/muscles";
import type { Workout, WorkoutPattern } from "@/lib/types";
import { liveGet } from "@/lib/use-live";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const KIND_LABEL: Record<LibKind, string> = {
  All: "All",
  Programs: "Programs",
  Splits: "Split days",
  Lifts: "Single lifts",
  Sessions: "Follow-alongs",
};

export function WorkoutLibrary() {
  const [kind, setKind] = useState<LibKind | "Directory">("All");
  const [muscle, setMuscle] = useState<"All" | MuscleGroup>("All");
  const [category, setCategory] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const [level, setLevel] = useState<LibLevel>("All");
  const [duration, setDuration] = useState<LibDuration>("All");
  const [pattern, setPattern] = useState<"All" | WorkoutPattern>("All");
  const [q, setQ] = useState("");
  const [directory, setDirectory] = useState<LiveExercise[]>([]);
  const [dirOk, setDirOk] = useState<boolean | null>(null);

  const counts = useMemo(() => countsByKind(LIBRARY), []);
  const cats = useMemo(() => categoryList(), []);
  const gear = useMemo(() => equipmentList(), []);
  const patterns = useMemo(() => patternList(), []);
  const films = useMemo(
    () =>
      kind === "Directory"
        ? []
        : filterLibrary(LIBRARY, {
            kind,
            muscle,
            category,
            equipment,
            level,
            duration,
            pattern,
            q,
          }),
    [kind, muscle, category, equipment, level, duration, pattern, q],
  );
  const programs = films.filter((w) => workoutKind(w) === "program");
  const rest = films.filter((w) => workoutKind(w) !== "program" || kind === "Programs");
  const grid = kind === "All" ? rest : films;
  const featured = kind === "All" ? programs : [];

  const dirty =
    kind !== "All" ||
    muscle !== "All" ||
    category !== "All" ||
    equipment !== "All" ||
    level !== "All" ||
    duration !== "All" ||
    pattern !== "All" ||
    q.trim().length > 0;

  useEffect(() => {
    if (kind !== "Directory" && q.trim().length < 2) return;
    const ac = new AbortController();
    const path =
      kind === "Directory"
        ? `/api/exercises${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`
        : `/api/exercises?q=${encodeURIComponent(q.trim())}`;
    liveGet<{ exercises: LiveExercise[] }>(path, { signal: ac.signal })
      .then((d) => {
        setDirectory(d.exercises ?? []);
        setDirOk(true);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setDirectory([]);
        setDirOk(false);
      });
    return () => ac.abort();
  }, [kind, q]);

  function reset() {
    setKind("All");
    setMuscle("All");
    setCategory("All");
    setEquipment("All");
    setLevel("All");
    setDuration("All");
    setPattern("All");
    setQ("");
  }

  const showDirectory = kind === "Directory" || (q.trim().length >= 2 && directory.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Pact library · {LIBRARY.length} films</Eyebrow>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Programs, split days, single-lift form, and follow-alongs — each with a muscle map, prescription, and a log
          button. The wger directory is a searchable extra, not a dead dump at the bottom.
        </p>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
        <Field
          className="pl-11"
          placeholder="Search squat, hinge, Adriene, cables…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Kind</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LIB_KINDS.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {KIND_LABEL[k]} · {counts[k]}
            </Chip>
          ))}
          <Chip active={kind === "Directory"} onClick={() => setKind("Directory")}>
            Directory
          </Chip>
        </div>
      </div>

      {kind !== "Directory" ? (
        <>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Primary muscle</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip active={muscle === "All"} onClick={() => setMuscle("All")}>
                All
              </Chip>
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} active={muscle === g} onClick={() => setMuscle(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {LIB_LEVELS.map((lv) => (
              <Chip key={lv} active={level === lv} onClick={() => setLevel(lv)}>
                {lv === "All" ? "Any level" : lv}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {LIB_DURATIONS.map((d) => (
              <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
                {d === "All" ? "Any length" : d}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {patterns.map((p) => (
              <Chip key={p} active={pattern === p} onClick={() => setPattern(p)}>
                {p === "All" ? "Any pattern" : PATTERN_LABEL[p]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {gear.map((e) => (
              <Chip key={e} active={equipment === e} onClick={() => setEquipment(e)}>
                {e === "All" ? "Any kit" : e}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c === "All" ? "Any category" : c}
              </Chip>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-mute">
          Live from wger. Search a movement, open the plate, log it — same desk as the films.
        </p>
      )}

      {dirty ? (
        <button type="button" className="inline-flex items-center gap-1 text-xs text-acid" onClick={reset}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      ) : null}

      {kind !== "Directory" && featured.length ? (
        <div>
          <Eyebrow>Week programs</Eyebrow>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {featured.map((w) => (
              <ProgramCard key={w.id} w={w} />
            ))}
          </div>
        </div>
      ) : null}

      {kind !== "Directory" && !films.length ? (
        <Card className="p-6">
          <p className="text-sm text-mute">Nothing in that cut. Clear filters or search the directory.</p>
          <Button className="mt-4" tone="ghost" onClick={reset}>
            Reset library
          </Button>
        </Card>
      ) : null}

      {kind !== "Directory" && grid.length ? (
        <div>
          {kind === "All" && featured.length ? <Eyebrow>Lifts, splits, films</Eyebrow> : null}
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${kind === "All" && featured.length ? "mt-3" : ""}`}>
            {grid.map((w) => (
              <FilmCard key={w.id} w={w} />
            ))}
          </div>
        </div>
      ) : null}

      {showDirectory ? (
        <div>
          <Eyebrow>wger directory{dirOk === false ? " · offline" : ""}</Eyebrow>
          {kind === "Directory" && dirOk === null ? (
            <Card className="mt-3 h-32 animate-pulse bg-white/5" />
          ) : directory.length === 0 && kind === "Directory" ? (
            <p className="mt-3 text-sm text-mute">No directory hits. Try a simpler name — squat, row, plank.</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {directory.map((ex) => (
                <DirectoryCard key={ex.id} ex={ex} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilmCard({ w }: { w: Workout }) {
  const { primary, secondary } = targetsOf(w);
  const kind = workoutKind(w);
  const tag = kind === "lift" ? "Lift" : kind === "split" ? "Split" : kind === "program" ? "Program" : "Film";
  return (
    <Link href={`/workouts/${w.id}`}>
      <Card className="overflow-hidden transition hover:border-acid/40">
        <div className="relative aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${w.youtubeId}/hqdefault.jpg`}
            alt={w.title}
            className="h-full w-full object-cover opacity-90"
          />
          {primary.length ? (
            <div className="absolute right-2 top-2 rounded-xl bg-[#efe8d6]/95 p-1 shadow-lg">
              <MuscleMap primary={primary} secondary={secondary} size="card" />
            </div>
          ) : null}
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2 py-1 text-xs">
            {tag} · {w.minutes} min
          </span>
        </div>
        <div className="p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-mute">
            {w.category}
            {w.pattern ? ` · ${PATTERN_LABEL[w.pattern]}` : ""}
          </p>
          <h2 className="mt-1 text-lg font-medium">{w.title}</h2>
          <p className="text-sm text-mute">
            {w.trainer} · {w.level}
            {w.prescription ? ` · ${w.prescription}` : ""}
          </p>
          {primary.length ? (
            <p className="mt-2 text-xs text-acid">
              {labelsFor(primary).join(" · ")}
              {secondary.length ? ` · +${labelsFor([], secondary).join(", ")}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-mute">{w.muscles.join(" · ")}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ProgramCard({ w }: { w: Workout }) {
  const { primary, secondary } = targetsOf(w);
  return (
    <Link href={`/workouts/${w.id}`}>
      <Card className="flex h-full flex-col p-5 transition hover:border-acid/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-mute">
              Program · {w.days?.length ?? 0} days · {w.level}
            </p>
            <h2 className="mt-1 text-xl font-medium">{w.title}</h2>
          </div>
          {primary.length ? <MuscleMap primary={primary} secondary={secondary} size="card" /> : null}
        </div>
        <p className="mt-3 flex-1 text-sm text-mute">{w.cue}</p>
        {w.days?.length ? (
          <ol className="mt-4 space-y-1 text-xs text-mute">
            {w.days.slice(0, 6).map((d) => (
              <li key={d.label}>{d.label}</li>
            ))}
          </ol>
        ) : null}
      </Card>
    </Link>
  );
}

function DirectoryCard({ ex }: { ex: LiveExercise }) {
  return (
    <Link href={`/workouts/${ex.id}`}>
      <Card className="overflow-hidden transition hover:border-acid/40">
        <div className="relative aspect-video bg-[#efe8d6]">
          {ex.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ex.image} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <MuscleMap primary={ex.primary} secondary={ex.secondary} size="card" />
            </div>
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2 py-1 text-xs text-cream">
            Directory · {ex.category}
          </span>
        </div>
        <div className="p-5">
          <h2 className="text-lg font-medium">{ex.name}</h2>
          <p className="mt-1 text-sm text-mute">{ex.equipment.join(" · ") || "No kit listed"}</p>
          {ex.primary.length ? (
            <p className="mt-2 text-xs text-acid">{labelsFor(ex.primary, ex.secondary).join(" · ")}</p>
          ) : (
            <p className="mt-2 text-xs text-mute">{ex.cue.slice(0, 90)}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

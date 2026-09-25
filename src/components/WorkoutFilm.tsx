"use client";

import { MuscleMap } from "@/components/MuscleMap";
import { RestTimer } from "@/components/RestTimer";
import { Button, Card, Eyebrow } from "@/components/ui";
import { findWorkout, programWorkouts, relatedWorkouts } from "@/lib/catalog";
import type { LiveExercise } from "@/lib/free-apis";
import { labelsFor, MUSCLE_META, PATTERN_LABEL, targetsOf, workoutKind } from "@/lib/muscles";
import { usePact } from "@/lib/store";
import type { Workout } from "@/lib/types";
import { clientExercises } from "@/lib/live-client";
import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function WorkoutFilm({ id }: { id: string }) {
  const catalog = findWorkout(id);
  const [remote, setRemote] = useState<LiveExercise | null | undefined>(
    id.startsWith("wger-") ? undefined : null,
  );

  useEffect(() => {
    if (!id.startsWith("wger-")) return;
    let alive = true;
    clientExercises(undefined, id)
      .then((d) => {
        if (alive) setRemote(d.exercises?.[0] ?? null);
      })
      .catch(() => {
        if (alive) setRemote(null);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (catalog) return <FilmBody workout={catalog} />;
  if (id.startsWith("wger-") && remote === undefined) {
    return <Card className="mx-auto h-80 max-w-5xl animate-pulse bg-white/5" />;
  }
  if (remote) return <DirectoryBody ex={remote} />;

  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p>That session isn&apos;t in the library.</p>
      <Link href="/workouts?tab=Library" className="mt-4 inline-block text-acid">
        Back to library
      </Link>
    </div>
  );
}

function FilmBody({ workout }: { workout: Workout }) {
  const store = usePact();
  const { primary, secondary } = targetsOf(workout);
  const kind = workoutKind(workout);
  const kindLabel =
    kind === "lift" ? "Single lift" : kind === "split" ? "Split day" : kind === "program" ? "Program" : "Follow-along";
  const related = relatedWorkouts(workout);
  const days = programWorkouts(workout);
  const alts = (workout.alternatives ?? []).map((altId) => findWorkout(altId)).filter(Boolean) as Workout[];
  const fav = store.favoriteWorkouts.includes(workout.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/workouts?tab=Library" className="text-sm text-mute hover:text-cream">
        ← Library
      </Link>

      <div className="overflow-hidden rounded-3xl border border-line bg-black">
        <div
          className="aspect-video bg-cover bg-center"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${workout.youtubeId}/hqdefault.jpg)` }}
        >
          <iframe
            title={workout.title}
            src={`https://www.youtube-nocookie.com/embed/${workout.youtubeId}?rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          <div>
            <Eyebrow>
              {kindLabel} · {workout.category}
              {workout.pattern ? ` · ${PATTERN_LABEL[workout.pattern]}` : ""}
            </Eyebrow>
            <h1 className="mt-2 font-display text-4xl tracking-tight">{workout.title}</h1>
            <p className="mt-3 text-mute">
              {workout.trainer} · {workout.level} · {workout.minutes} min · ~{workout.kcal} kcal
            </p>
            <p className="mt-6 text-lg">{workout.cue}</p>
            <button
              type="button"
              className={`mt-4 inline-flex items-center gap-2 text-sm ${fav ? "text-acid" : "text-mute hover:text-cream"}`}
              aria-pressed={fav}
              onClick={() => store.toggleFavoriteWorkout(workout.id)}
            >
              <Star className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
              {fav ? "In favorites" : "Save lift"}
            </button>
          </div>

          {workout.prescription || workout.rest || workout.progression ? (
            <Card className="grid gap-4 p-5 sm:grid-cols-3">
              {workout.prescription ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Prescription</p>
                  <p className="mt-1 font-medium">{workout.prescription}</p>
                </div>
              ) : null}
              {workout.rest ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Rest</p>
                  <p className="mt-1 font-medium">{workout.rest}</p>
                </div>
              ) : null}
              {workout.progression ? (
                <div className={workout.prescription || workout.rest ? "sm:col-span-3" : ""}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Progression</p>
                  <p className="mt-1 text-sm text-mute">{workout.progression}</p>
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-5">
            <Eyebrow>Working tissue</Eyebrow>
            {primary.length ? (
              <>
                <p className="mt-2 text-sm text-mute">
                  Red is prime mover, orange is assistance — wger muscular system plates, the same maps gym apps use.
                </p>
                <div className="mt-5">
                  <MuscleMap primary={primary} secondary={secondary} />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Primary</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {labelsFor(primary).map((m) => (
                        <span key={m} className="rounded-full bg-acid px-3 py-1 text-xs font-medium text-ink">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  {secondary.length ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Secondary</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {labelsFor([], secondary).map((m) => (
                          <span key={m} className="rounded-full border border-line px-3 py-1 text-xs text-mute">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {workout.muscles.map((m) => (
                  <span key={m} className="rounded-full border border-line px-3 py-1 text-sm text-mute">
                    {m}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-mute">
              {workout.equipment.map((m) => (
                <span key={m} className="rounded-full border border-line px-3 py-1">
                  {m}
                </span>
              ))}
            </div>
          </Card>

          {workout.moves?.length ? (
            <Card className="p-5">
              <Eyebrow>In this session</Eyebrow>
              <ol className="mt-4 space-y-2 text-sm">
                {workout.moves.map((move, i) => (
                  <li key={move} className="flex gap-3">
                    <span className="font-mono text-mute">{String(i + 1).padStart(2, "0")}</span>
                    <span>{move}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {days.length ? (
            <Card className="p-5">
              <Eyebrow>{kind === "program" ? "This week" : "Days in the split"}</Eyebrow>
              <ul className="mt-4 divide-y divide-line">
                {days.map((d) => (
                  <li key={d.label}>
                    <Link href={`/workouts/${d.workout.id}`} className="flex justify-between gap-3 py-3 hover:text-acid">
                      <span>
                        {d.label}
                        <span className="mt-0.5 block text-xs text-mute">{d.workout.title}</span>
                      </span>
                      <span className="font-mono text-xs text-mute">{d.workout.minutes} min</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {alts.length ? (
            <Card className="p-5">
              <Eyebrow>Swap if you need to</Eyebrow>
              <ul className="mt-3 space-y-2">
                {alts.map((w) => (
                  <li key={w.id}>
                    <Link href={`/workouts/${w.id}`} className="text-sm hover:text-acid">
                      {w.title}
                      <span className="block text-xs text-mute">{w.level} · {w.equipment.join(", ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <Eyebrow>Log to Pact</Eyebrow>
            <p className="mt-3 text-sm text-mute">
              Completing writes strain, checks off today&apos;s move pact, and can share to your circle if workouts aren&apos;t private.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() =>
                store.completeWorkout(workout.kcal, workout.minutes, {
                  title: workout.title,
                  category: workout.category,
                  source: "library",
                  workoutId: workout.id,
                })
              }
            >
              Mark complete
            </Button>
            <Link href="/strava" className="mt-3 block text-center text-sm text-acid">
              Or pull from Strava
            </Link>
          </Card>

          {kind === "lift" || workout.rest ? <RestTimer rest={workout.rest} /> : null}

          {related.length ? (
            <Card className="p-5">
              <Eyebrow>
                {kind === "program" ? "Days and lifts" : kind === "split" ? "Lifts in this pattern" : "Same tissue"}
              </Eyebrow>
              <ul className="mt-3 space-y-2">
                {related.map((w) => (
                  <li key={w.id}>
                    <Link href={`/workouts/${w.id}`} className="text-sm hover:text-acid">
                      {w.title}
                      <span className="block text-xs text-mute">
                        {workoutKind(w) === "lift" ? "Lift" : workoutKind(w) === "split" ? "Split" : workoutKind(w) === "program" ? "Program" : "Film"}
                        {w.primary?.length
                          ? ` · ${w.primary.map((mid) => MUSCLE_META[mid]?.label).filter(Boolean).join(" · ")}`
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DirectoryBody({ ex }: { ex: LiveExercise }) {
  const store = usePact();
  const minutes = 8;
  const kcal = 30;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/workouts?tab=Library" className="text-sm text-mute hover:text-cream">
        ← Library
      </Link>
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-5 lg:col-span-2">
          <div>
            <Eyebrow>Directory · {ex.category}</Eyebrow>
            <h1 className="mt-2 font-display text-4xl tracking-tight">{ex.name}</h1>
            <p className="mt-3 text-mute">wger · {ex.equipment.join(" · ") || "no kit listed"}</p>
            <p className="mt-6 text-lg">{ex.cue}</p>
          </div>
          {ex.image ? (
            <Card className="overflow-hidden bg-[#efe8d6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ex.image} alt="" className="mx-auto max-h-80 object-contain" />
            </Card>
          ) : null}
          <Card className="p-5">
            <Eyebrow>Working tissue</Eyebrow>
            {ex.primary.length || ex.secondary.length ? (
              <div className="mt-5">
                <MuscleMap primary={ex.primary} secondary={ex.secondary} />
                <div className="mt-5 flex flex-wrap gap-2">
                  {labelsFor(ex.primary).map((m) => (
                    <span key={m} className="rounded-full bg-acid px-3 py-1 text-xs font-medium text-ink">
                      {m}
                    </span>
                  ))}
                  {labelsFor([], ex.secondary).map((m) => (
                    <span key={m} className="rounded-full border border-line px-3 py-1 text-xs text-mute">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-mute">wger didn&apos;t tag muscles on this one. Log it anyway if you know the pattern.</p>
            )}
          </Card>
        </div>
        <Card className="h-fit p-6">
          <Eyebrow>Log to Pact</Eyebrow>
          <p className="mt-3 text-sm text-mute">Directory entries log as an 8-minute skill set. Edit minutes later from Track if you went longer.</p>
          <Button
            className="mt-6 w-full"
            onClick={() =>
              store.completeWorkout(kcal, minutes, {
                title: ex.name,
                category: ex.category,
                source: "library",
                workoutId: ex.id,
              })
            }
          >
            Mark complete
          </Button>
        </Card>
      </div>
    </div>
  );
}

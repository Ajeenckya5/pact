"use client";

import { WorkoutFilm } from "@/components/WorkoutFilm";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OpenFilm() {
  const id = useSearchParams().get("id") ?? "";
  return <WorkoutFilm id={id} />;
}

export default function OpenWorkoutPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-5xl animate-pulse rounded-3xl bg-white/5" />}>
      <OpenFilm />
    </Suspense>
  );
}

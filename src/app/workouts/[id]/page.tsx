"use client";

import { WorkoutFilm } from "@/components/WorkoutFilm";
import { useParams } from "next/navigation";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <WorkoutFilm id={id} />;
}
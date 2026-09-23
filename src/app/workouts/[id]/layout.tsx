import type { Metadata } from "next";
import type { ReactNode } from "react";
import { findWorkout } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const workout = findWorkout(id);
  const name = workout?.title ?? "Workout";
  return { title: name, description: `${name} in the Pact training library.` };
}

export default function WorkoutLayout({ children }: { children: ReactNode }) {
  return children;
}

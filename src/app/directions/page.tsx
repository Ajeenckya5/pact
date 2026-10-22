import type { Metadata } from "next";
import { DirectionIndex } from "@/components/directions/DirectionBoard";

export const metadata: Metadata = { title: "Directions" };

export default function DirectionsPage() {
  return <DirectionIndex />;
}

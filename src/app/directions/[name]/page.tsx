import type { Metadata } from "next";
import { DirectionBoard } from "@/components/directions/DirectionBoard";
import { directionById } from "@/lib/directions";

export function generateStaticParams() {
  return [{ name: "hearth" }, { name: "daylight" }, { name: "studio" }];
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const direction = directionById(name);
  return { title: direction ? direction.name : "Direction" };
}

export default async function DirectionPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <DirectionBoard id={name} />;
}

import { FRIENDS } from "@/lib/data";
import type { ReactNode } from "react";

export function generateStaticParams() {
  return FRIENDS.map((f) => ({ id: f.id }));
}

export const dynamicParams = false;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

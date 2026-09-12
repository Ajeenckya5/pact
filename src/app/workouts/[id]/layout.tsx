import { LIBRARY } from "@/lib/catalog";
import type { ReactNode } from "react";

export function generateStaticParams() {
  return LIBRARY.map((w) => ({ id: w.id }));
}

export const dynamicParams = false;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

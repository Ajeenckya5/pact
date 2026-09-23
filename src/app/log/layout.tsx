import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Log",
  description: "Water, food, and sleep.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

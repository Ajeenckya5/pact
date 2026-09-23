import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Food",
  description: "Search foods, scan a plate, and confirm the portion.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

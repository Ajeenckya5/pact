import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Meals matched to what you have.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

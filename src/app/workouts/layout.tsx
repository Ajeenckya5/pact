import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Train",
  description: "The workout library and today's session.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

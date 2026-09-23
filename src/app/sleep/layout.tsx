import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sleep",
  description: "Log last night and the wind-down.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

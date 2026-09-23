import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Open workout",
  description: "Start an open training session.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

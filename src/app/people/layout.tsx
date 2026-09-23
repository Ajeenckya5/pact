import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "People",
  description: "Create an invite and open chat.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

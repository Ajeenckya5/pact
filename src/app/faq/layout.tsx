import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How Pact works.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

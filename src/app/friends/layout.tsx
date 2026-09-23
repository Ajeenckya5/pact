import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Friends",
  description: "People you share a pact with.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

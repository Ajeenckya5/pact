import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Coach",
  description: "Today's training pick from your log and the strap you paired.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

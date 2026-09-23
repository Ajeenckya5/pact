import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Water",
  description: "Log water and undo the latest pour.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

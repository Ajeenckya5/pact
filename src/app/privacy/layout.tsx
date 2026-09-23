import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Choose what a partner can see.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

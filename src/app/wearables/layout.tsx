import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Devices",
  description: "Pair a heart-rate strap or connect Health.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

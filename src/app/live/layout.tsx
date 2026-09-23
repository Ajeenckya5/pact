import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Track",
  description: "Record GPS and the heart rate from the strap you paired.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

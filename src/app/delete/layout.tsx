import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Delete my data",
  description: "Erase this device and leave pacts.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

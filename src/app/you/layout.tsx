import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "You",
  description: "Goals, devices, export, and delete.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

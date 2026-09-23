import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Strava",
  description: "Connect Strava when the token exchange is available.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Places",
  description: "Gyms near you and a city search for weather.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

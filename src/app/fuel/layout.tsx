import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Market",
  description: "Build a cart from foods you already keep.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

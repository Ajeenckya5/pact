import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Chat",
  description: "Messages with your pact.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

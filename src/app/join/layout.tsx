import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Join a pact",
  description: "Accept an invite link on this device.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

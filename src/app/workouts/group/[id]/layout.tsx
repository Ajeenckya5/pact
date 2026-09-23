import type { Metadata } from "next";
import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ id: "g-hills" }];
}

export const metadata: Metadata = {
  title: "Group workout",
  description: "A shared training session with your pact.",
};

export default function GroupLayout({ children }: { children: ReactNode }) {
  return children;
}

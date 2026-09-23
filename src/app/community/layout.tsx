import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Community",
  description: "Posts you choose to share.",
};

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}

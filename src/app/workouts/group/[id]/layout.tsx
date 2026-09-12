import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ id: "g-hills" }];
}

export const dynamicParams = false;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = id.slice(0, 1).toUpperCase() + id.slice(1);
  return { title: `Chat with ${name}`, description: `Encrypted pact chat with ${name}.` };
}

export default function ChatThreadLayout({ children }: { children: ReactNode }) {
  return children;
}

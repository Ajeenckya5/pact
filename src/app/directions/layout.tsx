import { Fraunces, Manrope, Newsreader, Nunito } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const hearthDisplay = Fraunces({ subsets: ["latin"], variable: "--font-hearth-display" });
const hearthBody = Nunito({ subsets: ["latin"], variable: "--font-hearth-body" });
const daylight = Manrope({ subsets: ["latin"], variable: "--font-daylight" });
const studio = Newsreader({ subsets: ["latin"], variable: "--font-studio" });

export default function DirectionsLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className={`${hearthDisplay.variable} ${hearthBody.variable} ${daylight.variable} ${studio.variable}`}>
      {children}
    </div>
  );
}

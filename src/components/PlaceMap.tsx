"use client";

import dynamic from "next/dynamic";

export const PlaceMap = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[420px] animate-pulse rounded-3xl bg-white/5" />,
});

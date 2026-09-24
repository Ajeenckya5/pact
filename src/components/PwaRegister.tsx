"use client";

import { enforceStorageBudget } from "@/lib/storage-budget";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    void enforceStorageBudget();
    if (!("serviceWorker" in navigator)) return;
    const base = window.location.pathname.startsWith("/pact") ? "/pact" : "";
    void navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
  }, []);
  return null;
}

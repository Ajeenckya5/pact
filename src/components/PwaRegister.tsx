"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const base = window.location.pathname.startsWith("/pact") ? "/pact" : "";
    void navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
  }, []);
  return null;
}

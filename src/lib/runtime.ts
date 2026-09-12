import { Capacitor } from "@capacitor/core";

export function onNativeApp() {
  return Capacitor.isNativePlatform();
}

export function runtimeLabel() {
  if (onNativeApp()) return Capacitor.getPlatform() === "android" ? "Android APK" : "native app";
  if (typeof window === "undefined") return "Pact";
  if (window.location.hostname.endsWith("github.io")) return "GitHub Pages";
  return "web";
}

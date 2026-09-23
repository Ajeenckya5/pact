export function originAllowed(origin: string) {
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (origin === "https://ajeenckya5.github.io" || origin === "https://pact-aj.pages.dev") return origin;
  if (/^https:\/\/[a-z0-9-]+\.pact-aj\.pages\.dev$/.test(origin)) return origin;
  return "";
}

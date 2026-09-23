/** Store builds wait until the Apple and Google accounts exist. */

export const WIDGETS = [
  { size: "small" as const, shows: ["boxes", "streak"] },
  { size: "medium" as const, shows: ["boxes", "water", "call"] },
];

export const LIVE_ACTIVITY = {
  kind: "workout" as const,
  fields: ["title", "elapsed", "heartRate"] as const,
  startsWhen: "a workout log is running",
};

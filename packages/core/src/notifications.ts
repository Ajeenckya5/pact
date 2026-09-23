export const QUIET_HOURS = { start: "22:00", end: "07:00" } as const;

export const NOTIFICATIONS = [
  {
    id: "partner-nudge",
    channel: "Partner nudges",
    when: "A partner sends a nudge.",
    payload: "Opaque update. The device decrypts the text.",
  },
  {
    id: "check-in",
    channel: "Check-in reminders",
    when: "A box is still open in the evening.",
    payload: "Opaque update. The device decrypts the text.",
  },
  {
    id: "streak",
    channel: "Streak at risk",
    when: "Local evening, outside quiet hours, if today is not logged.",
    payload: "Opaque update. The device decrypts the text.",
  },
  {
    id: "workout",
    channel: "Workouts",
    when: "A live session is running.",
    payload: "Session timer on the device. No health values on the server.",
  },
] as const;

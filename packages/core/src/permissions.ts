export const PERMISSIONS = {
  health: {
    title: "Connect your data",
    body: "Pact reads steps, heart rate, sleep, and workouts from Apple Health or Health Connect so Today can fill in.",
    continue: "Continue",
    later: "Not now",
  },
  healthWrite: {
    title: "Save workouts and meals",
    body: "Pact can write workouts, water, protein, and energy back to Apple Health. This is separate from reading.",
    continue: "Continue",
    later: "Not now",
  },
  notifications: {
    title: "Partner reminders",
    body: "Pact can remind you about a nudge, an open box, or a streak. Quiet hours are 22:00 to 07:00.",
    continue: "Continue",
    later: "Not now",
  },
  bluetooth: {
    title: "Pair a heart-rate strap",
    body: "Pact uses Bluetooth only after you tap pair, to read heart rate from a strap.",
    continue: "Continue",
    later: "Not now",
  },
  camera: {
    title: "Scan a barcode or a plate",
    body: "The camera stays on this device. Photos are not uploaded.",
    continue: "Continue",
    later: "Not now",
  },
  location: {
    title: "Weather for this session",
    body: "Approximate location is used only while Pact is open, to fetch weather. You can type a city instead.",
    continue: "Continue",
    later: "Not now",
  },
} as const;

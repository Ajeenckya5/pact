import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.pact.fitness",
  appName: "Pact",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for straps…",
        cancel: "Cancel",
        availableDevices: "Nearby Bluetooth devices",
        noDeviceFound: "No BLE fitness radios found",
      },
    },
  },
};

export default config;

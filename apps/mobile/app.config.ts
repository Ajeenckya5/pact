import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Pact",
  slug: "pact",
  scheme: "pact",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.ajeenckya.pact",
    supportsTablet: false,
    infoPlist: {
      NSHealthShareUsageDescription: "Pact reads steps, heart rate, sleep, and workouts so Today can fill in.",
      NSHealthUpdateUsageDescription: "Pact can save workouts, water, protein, and energy when you allow it.",
      NSBluetoothAlwaysUsageDescription: "Pact reads heart rate from a strap after you tap pair.",
      NSCameraUsageDescription: "Pact scans barcodes and plates on this device. Photos are not uploaded.",
      NSLocationWhenInUseUsageDescription: "Pact uses approximate location only for weather while the app is open.",
      UIBackgroundModes: ["bluetooth-central", "remote-notification"],
    },
  },
  android: {
    package: "com.ajeenckya.pact",
    permissions: [
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.CAMERA",
      "android.permission.ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-camera",
      { cameraPermission: "Pact scans barcodes and plates on this device. Photos are not uploaded." },
    ],
    [
      "expo-location",
      { locationWhenInUsePermission: "Pact uses approximate location only for weather while the app is open." },
    ],
  ],
  extra: {
    privacyPolicy: "https://ajeenckya5.github.io/pact/privacy/",
    deletion: "https://ajeenckya5.github.io/pact/delete/",
  },
};

export default config;

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PERMISSIONS } from "../../../packages/core/src/permissions";

export default function YouScreen() {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 32 }}>You</Text>
      <Text>Settings</Text>
      <Text>Storage used: 0.0 MB</Text>
      {confirming ? (
        <View style={{ gap: 12 }}>
          <Text>Clear app data on this device? This phone app is not storing a log yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}>
            <Text>Clear app data</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setConfirming(true)}>
          <Text>Clear app data</Text>
        </Pressable>
      )}
      <Text>{PERMISSIONS.health.body}</Text>
      <Text>{PERMISSIONS.notifications.body}</Text>
      <Text>{PERMISSIONS.bluetooth.body}</Text>
    </View>
  );
}

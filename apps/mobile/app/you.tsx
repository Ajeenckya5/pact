import { Text, View } from "react-native";
import { PERMISSIONS } from "../../../packages/core/src/permissions";

export default function YouScreen() {
  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 32 }}>You</Text>
      <Text>{PERMISSIONS.health.body}</Text>
      <Text>{PERMISSIONS.notifications.body}</Text>
      <Text>{PERMISSIONS.bluetooth.body}</Text>
    </View>
  );
}

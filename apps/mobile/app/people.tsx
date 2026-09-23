import { Text, View } from "react-native";
import { PERMISSIONS } from "../../../packages/core/src/permissions";

export default function PeopleScreen() {
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 32 }}>People</Text>
      <Text>{PERMISSIONS.notifications.body}</Text>
      <Text>Invite links keep the secret in the fragment. Messages on the server are ciphertext.</Text>
    </View>
  );
}

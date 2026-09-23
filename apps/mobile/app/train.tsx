import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { parseHeartRate } from "../../../packages/core/src/ble";

export default function TrainScreen() {
  const [bpm, setBpm] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 32 }}>Train</Text>
      <Text>Pair a strap to read Heart Rate Service 0x180D. A phone timer is the fallback.</Text>
      <Text style={{ fontSize: 28 }}>{bpm == null ? "— bpm" : `${bpm} bpm`}</Text>
      <Pressable
        style={{ minHeight: 48, justifyContent: "center" }}
        onPress={() => setBpm(parseHeartRate(new Uint8Array([0x00, 72])).bpm)}
      >
        <Text>Use a sample strap reading</Text>
      </Pressable>
    </View>
  );
}

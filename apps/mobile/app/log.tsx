import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { pushSip, totalWater, undoLatestSip, type WaterSip } from "../../../src/lib/water-log";

export default function LogScreen() {
  const [log, setLog] = useState<WaterSip[]>([]);
  const last = [...log].sort((a, b) => a.at.localeCompare(b.at)).at(-1);

  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 32 }}>Log</Text>
      <Text>Water {totalWater(log)} ml</Text>
      <Pressable
        style={{ minHeight: 48, justifyContent: "center" }}
        onPress={() =>
          setLog((current) => pushSip(current, { id: String(Date.now()), ml: 250, at: new Date().toISOString() }))
        }
      >
        <Text>Add 250 ml</Text>
      </Pressable>
      <Pressable
        style={{ minHeight: 48, justifyContent: "center" }}
        onPress={() => setLog((current) => undoLatestSip(current).log)}
      >
        <Text>{last ? `Undo ${last.ml} ml` : "Nothing to undo"}</Text>
      </Pressable>
    </View>
  );
}

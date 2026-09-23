import { Text, View } from "react-native";

const boxes = ["Sleep 7h+", "Protein", "Water", "Train"];

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 32 }}>Today</Text>
      <Text>No wearable connected. The four boxes fill in after you log them or connect Health.</Text>
      {boxes.map((box) => (
        <Text key={box} style={{ fontSize: 18, minHeight: 48 }}>
          {box}
        </Text>
      ))}
    </View>
  );
}

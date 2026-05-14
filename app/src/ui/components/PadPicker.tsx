import { Pressable, Text, View } from "react-native";
import type { Pad } from "../../domain/types";

export function PadPicker({
  pads,
  selectedId,
  onSelect,
}: {
  pads: Pad[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {pads.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onSelect(p.id)}
          className={`rounded-xl border px-4 py-3 ${selectedId === p.id ? "border-blue-600 bg-blue-50" : "border-neutral-300"}`}
        >
          <Text className="text-base">{p.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

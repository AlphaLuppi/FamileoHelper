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
  if (pads.length === 0) {
    return (
      <View className="rounded-xl border border-dashed border-stone-300 px-4 py-6 items-center">
        <Text className="text-sm text-stone-500">Aucun pad disponible pour le moment.</Text>
      </View>
    );
  }
  return (
    <View className="gap-2">
      {pads.map((p) => {
        const isSel = selectedId === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSel }}
            className={`rounded-xl border px-4 py-3 flex-row items-center justify-between ${
              isSel ? "border-brand-600 bg-brand-50" : "border-stone-200 active:bg-stone-50"
            }`}
          >
            <Text className={`text-base ${isSel ? "text-brand-700 font-semibold" : "text-stone-800"}`}>
              {p.name}
            </Text>
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                isSel ? "border-brand-600" : "border-stone-300"
              }`}
            >
              {isSel ? <View className="w-2.5 h-2.5 rounded-full bg-brand-600" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

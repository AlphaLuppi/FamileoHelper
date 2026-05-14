import { Image, View, Text } from "react-native";

export function PhotoTile({
  uri,
  size = 80,
  selected = false,
  index,
}: {
  uri: string;
  size?: number;
  selected?: boolean;
  index?: number;
}) {
  return (
    <View
      style={{ width: size, height: size }}
      className={`rounded-xl overflow-hidden bg-stone-200 ${selected ? "ring-2" : ""}`}
    >
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      {selected ? (
        <View className="absolute inset-0 bg-brand-600/15" pointerEvents="none">
          <View className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-brand-600 items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {typeof index === "number" ? index + 1 : "✓"}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

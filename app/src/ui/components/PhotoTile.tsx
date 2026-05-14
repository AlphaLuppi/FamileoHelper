import { Image, View } from "react-native";

export function PhotoTile({ uri, size = 80 }: { uri: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="rounded-xl overflow-hidden bg-neutral-200">
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

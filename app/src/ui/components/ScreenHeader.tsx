import { View, Text } from "react-native";

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-4 pb-3 flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-stone-900">{title}</Text>
        {subtitle ? <Text className="text-sm text-stone-500 mt-0.5">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

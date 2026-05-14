import { Pressable, Text } from "react-native";

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-6 py-4 items-center ${disabled ? "bg-neutral-300" : "bg-blue-600 active:bg-blue-700"}`}
    >
      <Text className="text-white font-semibold text-base">{label}</Text>
    </Pressable>
  );
}

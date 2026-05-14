import { Pressable, Text, ActivityIndicator, View } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
}) {
  const isDisabled = disabled || loading;

  const base = "rounded-2xl px-6 py-4 items-center justify-center flex-row";
  const styles =
    variant === "primary"
      ? isDisabled
        ? "bg-stone-200"
        : "bg-brand-600 active:bg-brand-700"
      : variant === "secondary"
        ? isDisabled
          ? "bg-stone-100 border border-stone-200"
          : "bg-brand-50 active:bg-brand-100 border border-brand-200"
        : isDisabled
          ? "bg-transparent"
          : "bg-transparent active:bg-stone-100";

  const textStyles =
    variant === "primary"
      ? isDisabled
        ? "text-stone-400"
        : "text-white"
      : variant === "secondary"
        ? isDisabled
          ? "text-stone-400"
          : "text-brand-700"
        : isDisabled
          ? "text-stone-400"
          : "text-stone-700";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      className={`${base} ${styles}`}
    >
      {loading ? (
        <View className="mr-2">
          <ActivityIndicator size="small" color={variant === "primary" ? "#ffffff" : "#cf4321"} />
        </View>
      ) : null}
      <Text className={`font-semibold text-base ${textStyles}`}>{label}</Text>
    </Pressable>
  );
}

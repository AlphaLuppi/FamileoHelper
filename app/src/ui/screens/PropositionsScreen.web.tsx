import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";

export function PropositionsScreen() {
  const nav = useNavigation<any>();
  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Suggestions" />
      <View className="flex-1 items-center justify-center px-8 gap-4">
        <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center">
          <Text className="text-3xl">🖼️</Text>
        </View>
        <Text className="text-base font-medium text-stone-800 text-center">
          Indisponible sur le web
        </Text>
        <Text className="text-sm text-stone-500 text-center max-w-md">
          Le navigateur n'accède pas à ta photothèque automatiquement. Passe par « Manuel »
          pour sélectionner tes photos toi-même.
        </Text>
        <View className="mt-2 min-w-[200px]">
          <PrimaryButton label="Aller au picker" onPress={() => nav.navigate("Manuel" as never)} />
        </View>
      </View>
    </View>
  );
}

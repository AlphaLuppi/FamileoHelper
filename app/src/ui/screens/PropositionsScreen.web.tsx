import { View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PrimaryButton } from "../components/PrimaryButton";

export function PropositionsScreen() {
  const nav = useNavigation<any>();
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 p-6 gap-4">
      <Text className="text-base text-neutral-700 text-center">
        Sur le web, les propositions automatiques ne sont pas dispo (le navigateur n'accède pas à la
        photothèque sans ton intervention). Passe par l'onglet « Manuel » pour choisir tes photos.
      </Text>
      <PrimaryButton label="Aller au picker" onPress={() => nav.navigate("Manuel" as never)} />
    </View>
  );
}

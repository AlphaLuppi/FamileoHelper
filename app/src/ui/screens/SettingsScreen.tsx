import { View, Text, Alert } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { clearBearerToken } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { useNavigation } from "@react-navigation/native";

export function SettingsScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const nav = useNavigation<any>();

  const onLogout = async () => {
    Alert.alert("Déconnexion", "Confirmer ?", [
      { text: "Annuler" },
      {
        text: "Oui",
        style: "destructive",
        onPress: async () => {
          await clearBearerToken();
          setAuth(null, null);
          nav.reset({ index: 0, routes: [{ name: "Onboarding" }] });
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4">
      <Text className="text-xl font-bold">Réglages</Text>
      <PrimaryButton label="Se déconnecter" onPress={onLogout} />
    </View>
  );
}

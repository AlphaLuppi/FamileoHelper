import { View, Text, Alert, Platform } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { clearBearerToken } from "../../state/secureStore";
import { useAppStore } from "../../state/store";

export function SettingsScreen() {
  const user = useAppStore((s) => s.user);
  const backendUrl = useAppStore((s) => s.backendUrl);
  const setAuth = useAppStore((s) => s.setAuth);
  const setUser = useAppStore((s) => s.setUser);
  const setHasFamileoSession = useAppStore((s) => s.setHasFamileoSession);

  const doLogout = async () => {
    await clearBearerToken();
    setAuth(null, backendUrl);
    setUser(null);
    setHasFamileoSession(false);
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Se déconnecter ?")) doLogout();
    } else {
      Alert.alert("Déconnexion", "Confirmer ?", [
        { text: "Annuler" },
        { text: "Oui", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4">
      <Text className="text-xl font-bold">Réglages</Text>
      {user ? (
        <Text className="text-base text-neutral-700">Connecté en tant que {user.email}</Text>
      ) : null}
      <PrimaryButton label="Se déconnecter" onPress={onLogout} />
    </View>
  );
}

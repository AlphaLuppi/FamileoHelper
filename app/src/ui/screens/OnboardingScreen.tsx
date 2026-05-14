import { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBearerToken, setBackendUrl } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { useNavigation } from "@react-navigation/native";

export function OnboardingScreen() {
  const [url, setUrl] = useState("https://familieohelper.alphaluppi.fr");
  const [token, setToken] = useState("");
  const setAuth = useAppStore((s) => s.setAuth);
  const nav = useNavigation<any>();

  const onSave = async () => {
    if (!url || !token) {
      Alert.alert("Champs requis", "Renseigne l'URL et le token.");
      return;
    }
    await setBackendUrl(url);
    await setBearerToken(token);
    setAuth(token, url);
    nav.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4 justify-center">
      <Text className="text-2xl font-bold">FamileoHelper</Text>
      <Text className="text-base text-neutral-600">URL du backend :</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <Text className="text-base text-neutral-600">Token :</Text>
      <TextInput
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <PrimaryButton label="Connexion" onPress={onSave} />
    </View>
  );
}

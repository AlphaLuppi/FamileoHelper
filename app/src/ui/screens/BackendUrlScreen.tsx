import { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBackendUrl } from "../../state/secureStore";
import { useAppStore } from "../../state/store";

export function BackendUrlScreen({ onContinue }: { onContinue: () => void }) {
  const [url, setUrl] = useState("https://familieohelper.alphaluppi.fr");
  const setAuth = useAppStore((s) => s.setAuth);
  const bearer = useAppStore((s) => s.bearer);

  const onSave = async () => {
    if (!url) {
      Alert.alert("Champ requis", "Renseigne l'URL du backend.");
      return;
    }
    await setBackendUrl(url);
    setAuth(bearer, url);
    onContinue();
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
      <PrimaryButton label="Continuer" onPress={onSave} />
    </View>
  );
}

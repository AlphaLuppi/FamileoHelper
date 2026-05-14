import { useState } from "react";
import { View, Text, TextInput, Alert, ScrollView } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppStore } from "../../state/store";
import { BackendClient } from "../../services/backend/BackendClient";

export function ConnectFamileoScreen() {
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);
  const backendUrl = useAppStore((s) => s.backendUrl);
  const bearer = useAppStore((s) => s.bearer);
  const setHasFamileoSession = useAppStore((s) => s.setHasFamileoSession);

  const onSubmit = async () => {
    if (!cookies.trim()) {
      Alert.alert("Champ requis", "Colle au moins le cookie PHPSESSID.");
      return;
    }
    if (!backendUrl || !bearer) {
      Alert.alert("Erreur", "Session interne manquante.");
      return;
    }
    setLoading(true);
    try {
      const client = new BackendClient({ baseUrl: backendUrl, bearer });
      await client.setFamileoCookies(cookies.trim());
      setHasFamileoSession(true);
    } catch (e) {
      Alert.alert("Échec", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text className="text-2xl font-bold">Connecter Famileo</Text>
      <Text className="text-base text-neutral-700">
        Famileo protège son login par un captcha invisible, donc on ne peut pas s'y connecter directement.
        Tu dois te connecter dans ton navigateur et copier deux cookies ici.
      </Text>
      <Text className="text-base font-semibold mt-3">Comment faire :</Text>
      <Text className="text-base text-neutral-700">
        1. Sur ordinateur, ouvre <Text className="font-semibold">famileo.com</Text> et connecte-toi.
      </Text>
      <Text className="text-base text-neutral-700">
        2. Ouvre les outils développeur (clic-droit → Inspecter, ou F12).
      </Text>
      <Text className="text-base text-neutral-700">
        3. Onglet <Text className="font-semibold">Application</Text> (Chrome) ou{" "}
        <Text className="font-semibold">Stockage</Text> (Firefox) → Cookies → famileo.com
      </Text>
      <Text className="text-base text-neutral-700">
        4. Copie les valeurs de <Text className="font-semibold">PHPSESSID</Text> et{" "}
        <Text className="font-semibold">REMEMBERME</Text>, et colle-les ci-dessous au format
        suivant :
      </Text>
      <Text className="text-sm text-neutral-500 font-mono">
        PHPSESSID=abc123; REMEMBERME=def456
      </Text>
      <TextInput
        value={cookies}
        onChangeText={setCookies}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={4}
        placeholder="PHPSESSID=...; REMEMBERME=..."
        className="border border-neutral-300 rounded-xl px-4 py-3 mt-2 min-h-[100px]"
      />
      <PrimaryButton label="Enregistrer" onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
}

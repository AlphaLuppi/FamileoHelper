import { useState } from "react";
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBearerToken, setBackendUrl } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { useNavigation } from "@react-navigation/native";

export function OnboardingScreen() {
  const [url, setUrl] = useState("https://famileohelper.toam.tech");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);
  const nav = useNavigation<any>();

  const onSave = async () => {
    if (!url || !token) {
      Alert.alert("Champs requis", "Renseigne l'URL et le token.");
      return;
    }
    setBusy(true);
    try {
      await setBackendUrl(url);
      await setBearerToken(token);
      setAuth(token, url);
      nav.reset({ index: 0, routes: [{ name: "Main" }] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-10 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-3">
          <View className="w-16 h-16 rounded-3xl bg-brand-600 items-center justify-center">
            <Text className="text-2xl font-bold text-white">F</Text>
          </View>
          <Text className="text-3xl font-bold text-stone-900">FamileoHelper</Text>
          <Text className="text-sm text-stone-500 text-center max-w-sm">
            Connecte ton backend pour commencer à proposer des posts à partir de tes photos.
          </Text>
        </View>

        <View className="gap-4 mt-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-stone-700">URL du backend</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-base text-stone-900"
              placeholder="https://…"
              placeholderTextColor="#a8a29e"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-stone-700">Token d'accès</Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              className="bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-base text-stone-900"
              placeholder="Colle ton token ici"
              placeholderTextColor="#a8a29e"
            />
            <Text className="text-xs text-stone-500">
              Tu le retrouves dans la config du backend (variable AUTH_TOKEN).
            </Text>
          </View>
        </View>

        <View className="mt-2">
          <PrimaryButton
            label="Se connecter"
            onPress={onSave}
            loading={busy}
            disabled={!url || !token}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

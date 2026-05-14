import { useState } from "react";
import { View, Text, TextInput, Alert, Pressable } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBearerToken } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { BackendClient } from "../../services/backend/BackendClient";

export function RegisterScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const backendUrl = useAppStore((s) => s.backendUrl);
  const setAuth = useAppStore((s) => s.setAuth);
  const setUser = useAppStore((s) => s.setUser);
  const setHasFamileoSession = useAppStore((s) => s.setHasFamileoSession);

  const onSubmit = async () => {
    if (!email || !password || !inviteCode) {
      Alert.alert("Champs requis", "Tous les champs sont obligatoires.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Mot de passe trop court", "Au moins 8 caractères.");
      return;
    }
    if (!backendUrl) {
      Alert.alert("Erreur", "URL backend manquante.");
      return;
    }
    setLoading(true);
    try {
      const client = new BackendClient({ baseUrl: backendUrl, bearer: null });
      const out = await client.register(email.trim(), password, inviteCode.trim());
      await setBearerToken(out.token);
      setAuth(out.token, backendUrl);
      setUser(out.user);
      setHasFamileoSession(false);
    } catch (e) {
      Alert.alert("Inscription impossible", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4 justify-center">
      <Text className="text-2xl font-bold">Créer un compte</Text>
      <Text className="text-base text-neutral-600">
        Tu as besoin d'un code d'invitation pour t'inscrire.
      </Text>
      <Text className="text-base text-neutral-600">Email :</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <Text className="text-base text-neutral-600">Mot de passe (8+ caractères) :</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <Text className="text-base text-neutral-600">Code d'invitation :</Text>
      <TextInput
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        autoCorrect={false}
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <PrimaryButton label="Créer mon compte" onPress={onSubmit} loading={loading} />
      <Pressable onPress={onSwitchToLogin}>
        <Text className="text-brand-700 text-center mt-2">Déjà un compte ? Se connecter</Text>
      </Pressable>
    </View>
  );
}

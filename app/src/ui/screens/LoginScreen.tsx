import { useState } from "react";
import { View, Text, TextInput, Alert, Pressable } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBearerToken } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { BackendClient } from "../../services/backend/BackendClient";

export function LoginScreen({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const backendUrl = useAppStore((s) => s.backendUrl);
  const setAuth = useAppStore((s) => s.setAuth);
  const setUser = useAppStore((s) => s.setUser);
  const setHasFamileoSession = useAppStore((s) => s.setHasFamileoSession);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Champs requis", "Email et mot de passe sont obligatoires.");
      return;
    }
    if (!backendUrl) {
      Alert.alert("Erreur", "URL backend manquante.");
      return;
    }
    setLoading(true);
    try {
      const client = new BackendClient({ baseUrl: backendUrl, bearer: null });
      const out = await client.login(email.trim(), password);
      await setBearerToken(out.token);
      setAuth(out.token, backendUrl);
      setUser(out.user);
      const me = await new BackendClient({ baseUrl: backendUrl, bearer: out.token }).me();
      setHasFamileoSession(me.hasFamileoSession);
    } catch (e) {
      Alert.alert("Connexion impossible", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4 justify-center">
      <Text className="text-2xl font-bold">Connexion</Text>
      <Text className="text-base text-neutral-600">Email :</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <Text className="text-base text-neutral-600">Mot de passe :</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <PrimaryButton label="Se connecter" onPress={onSubmit} loading={loading} />
      <Pressable onPress={onSwitchToRegister}>
        <Text className="text-brand-700 text-center mt-2">
          Pas de compte ? S'inscrire avec un code d'invitation
        </Text>
      </Pressable>
    </View>
  );
}

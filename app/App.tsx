import "./global.css";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator, type RootStage } from "./src/ui/navigation";
import {
  getBearerToken,
  getBackendUrl,
  clearBearerToken,
} from "./src/state/secureStore";
import { useAppStore } from "./src/state/store";
import { BackendClient } from "./src/services/backend/BackendClient";

export default function App() {
  const bearer = useAppStore((s) => s.bearer);
  const backendUrl = useAppStore((s) => s.backendUrl);
  const user = useAppStore((s) => s.user);
  const hasFamileoSession = useAppStore((s) => s.hasFamileoSession);
  const setAuth = useAppStore((s) => s.setAuth);
  const setUser = useAppStore((s) => s.setUser);
  const setHasFamileoSession = useAppStore((s) => s.setHasFamileoSession);

  const [ready, setReady] = useState(false);

  // Boot: hydrate from storage + check /auth/me if we have a token.
  useEffect(() => {
    (async () => {
      const [storedToken, storedUrl] = await Promise.all([getBearerToken(), getBackendUrl()]);
      setAuth(storedToken, storedUrl);
      if (storedToken && storedUrl) {
        try {
          const me = await new BackendClient({ baseUrl: storedUrl, bearer: storedToken }).me();
          setUser(me.user);
          setHasFamileoSession(me.hasFamileoSession);
        } catch {
          // Token invalid/expired — wipe and let the user log in again.
          await clearBearerToken();
          setAuth(null, storedUrl);
          setUser(null);
          setHasFamileoSession(false);
        }
      }
      setReady(true);
    })();
  }, [setAuth, setUser, setHasFamileoSession]);

  if (!ready) return null;

  const stage: RootStage = !user || !bearer || !backendUrl
    ? "auth"
    : !hasFamileoSession
      ? "connectFamileo"
      : "main";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator stage={stage} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

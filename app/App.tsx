import "./global.css";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/ui/navigation";
import { getBearerToken, getBackendUrl } from "./src/state/secureStore";
import { useAppStore } from "./src/state/store";

export default function App() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const [bearer, url] = await Promise.all([getBearerToken(), getBackendUrl()]);
      setAuth(bearer, url);
      setNeedsOnboarding(!bearer || !url);
      setReady(true);
    })();
  }, [setAuth]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator needsOnboarding={needsOnboarding} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

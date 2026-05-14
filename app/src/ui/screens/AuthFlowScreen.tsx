import { useState } from "react";
import { useAppStore } from "../../state/store";
import { BackendUrlScreen } from "./BackendUrlScreen";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";

export function AuthFlowScreen() {
  const backendUrl = useAppStore((s) => s.backendUrl);
  const [, force] = useState(0);
  const [mode, setMode] = useState<"login" | "register">("login");

  if (!backendUrl) {
    return <BackendUrlScreen onContinue={() => force((n) => n + 1)} />;
  }
  return mode === "login" ? (
    <LoginScreen onSwitchToRegister={() => setMode("register")} />
  ) : (
    <RegisterScreen onSwitchToLogin={() => setMode("login")} />
  );
}

import * as SecureStore from "expo-secure-store";

const BEARER_KEY = "familieohelper.bearer";
const BACKEND_URL_KEY = "familieohelper.backendUrl";

export async function setBearerToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(BEARER_KEY, token);
}

export async function getBearerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(BEARER_KEY);
}

export async function clearBearerToken(): Promise<void> {
  await SecureStore.deleteItemAsync(BEARER_KEY);
}

export async function setBackendUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(BACKEND_URL_KEY, url);
}

export async function getBackendUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(BACKEND_URL_KEY);
}

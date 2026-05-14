const BEARER_KEY = "familieohelper.bearer";
const BACKEND_URL_KEY = "familieohelper.backendUrl";

function ls(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export async function setBearerToken(token: string): Promise<void> {
  ls()?.setItem(BEARER_KEY, token);
}

export async function getBearerToken(): Promise<string | null> {
  return ls()?.getItem(BEARER_KEY) ?? null;
}

export async function clearBearerToken(): Promise<void> {
  ls()?.removeItem(BEARER_KEY);
}

export async function setBackendUrl(url: string): Promise<void> {
  ls()?.setItem(BACKEND_URL_KEY, url);
}

export async function getBackendUrl(): Promise<string | null> {
  return ls()?.getItem(BACKEND_URL_KEY) ?? null;
}

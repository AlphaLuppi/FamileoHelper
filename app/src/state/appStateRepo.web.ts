const LAST_POST_AT = "familieohelper.lastPostAt";

export async function getLastPostAt(defaultIso: string): Promise<string> {
  if (typeof window === "undefined") return defaultIso;
  return window.localStorage.getItem(LAST_POST_AT) ?? defaultIso;
}

export async function setLastPostAt(iso: string): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_POST_AT, iso);
}

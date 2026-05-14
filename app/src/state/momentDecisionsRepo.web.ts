export type Decision = "posted" | "rejected";

const KEY = "familieohelper.momentDecisions";

type Store = Record<string, { decision: Decision; decidedAt: string }>;

function read(): Store {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function write(s: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export async function getDecision(hash: string): Promise<Decision | null> {
  return read()[hash]?.decision ?? null;
}

export async function setDecision(hash: string, decision: Decision): Promise<void> {
  const s = read();
  s[hash] = { decision, decidedAt: new Date().toISOString() };
  write(s);
}

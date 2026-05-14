import type { Pad } from "../domain/types";

const KEY = "familieohelper.padsCache";

type Entry = { id: string; name: string; lastUsedAt?: string };

function read(): Entry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

function write(entries: Entry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
}

export async function upsertPads(pads: Pick<Pad, "id" | "name">[]): Promise<void> {
  const existing = read();
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const p of pads) {
    const prev = byId.get(p.id);
    byId.set(p.id, { id: p.id, name: p.name, lastUsedAt: prev?.lastUsedAt });
  }
  write(Array.from(byId.values()));
}

export async function listCachedPads(): Promise<Pad[]> {
  return read()
    .slice()
    .sort((a, b) => {
      const aT = a.lastUsedAt ?? "";
      const bT = b.lastUsedAt ?? "";
      if (aT !== bT) return aT < bT ? 1 : -1;
      return a.name.localeCompare(b.name);
    }) as Pad[];
}

export async function markPadUsed(padId: string): Promise<void> {
  const entries = read();
  const idx = entries.findIndex((e) => e.id === padId);
  if (idx >= 0) {
    entries[idx].lastUsedAt = new Date().toISOString();
    write(entries);
  }
}

export async function getDefaultPadId(): Promise<string | null> {
  const sorted = await listCachedPads();
  return sorted[0]?.id ?? null;
}

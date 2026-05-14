// Web Speech API — wrapper minimal. Si l'API n'existe pas, on rejette proprement.

type SpeechRecognitionResultEvent = {
  results: { 0: { transcript: string } & ArrayLike<{ transcript: string }> }[] &
    ArrayLike<unknown>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type WindowWithSR = Window &
  typeof globalThis & {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };

export async function transcribeOnce(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Speech recognition n'est pas disponible côté serveur.");
  }
  const w = window as WindowWithSR;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    throw new Error("Ce navigateur ne supporte pas la dictée vocale.");
  }
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    let final = "";
    rec.onresult = (e) => {
      const items = e.results as unknown as { 0: { transcript: string } }[];
      const transcript = items[0]?.[0]?.transcript ?? "";
      final = transcript;
    };
    rec.onerror = (e) => reject(new Error(e.error ?? "speech recognition failed"));
    rec.onend = () => resolve(final);
    try {
      rec.start();
    } catch (e) {
      reject(e as Error);
    }
  });
}

// No-op stub : sur web on n'utilise pas les events à la mode RN.
export function useSpeechRecognitionEvent(_event: string, _cb: (e: unknown) => void): void {}

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export async function transcribeOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    let final = "";
    const cleanup: Array<() => void> = [];

    const offResult = ExpoSpeechRecognitionModule.addListener("result", (e) => {
      const transcript = e.results?.[0]?.transcript ?? "";
      if (e.isFinal) final = transcript;
    });
    cleanup.push(() => offResult.remove());

    const offEnd = ExpoSpeechRecognitionModule.addListener("end", () => {
      cleanup.forEach((c) => c());
      resolve(final);
    });
    cleanup.push(() => offEnd.remove());

    const offErr = ExpoSpeechRecognitionModule.addListener("error", (e) => {
      cleanup.forEach((c) => c());
      reject(new Error(e.error ?? "speech recognition failed"));
    });
    cleanup.push(() => offErr.remove());

    ExpoSpeechRecognitionModule.start({
      lang: "fr-FR",
      interimResults: false,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
  });
}

export { useSpeechRecognitionEvent };

import type { ClaudeClient } from "./claudeClient.js";

export type CaptionMetadata = {
  date: string;          // ISO date YYYY-MM-DD
  city?: string;         // reverse-geocoded city
  photoCount: number;
  weekday: string;       // "dimanche"
};

export class CaptionService {
  constructor(private claude: ClaudeClient) {}

  async generate(meta: CaptionMetadata): Promise<string> {
    const prompt = this.buildGeneratePrompt(meta);
    try {
      const out = await this.claude.prompt(prompt);
      if (!out) return this.fallback(meta);
      return out;
    } catch {
      return this.fallback(meta);
    }
  }

  async reformulate(transcribed: string): Promise<string> {
    const prompt = [
      "Tu reçois une transcription brute d'une note vocale en français.",
      "Reformule-la en 1 à 3 phrases naturelles pour une légende familiale Famileo destinée aux grands-parents.",
      "Ne fais pas de listes. Pas d'emojis. Garde le ton chaleureux et simple.",
      "",
      "Transcription :",
      transcribed,
      "",
      "Reformulation :",
    ].join("\n");
    try {
      const out = await this.claude.prompt(prompt);
      return out || transcribed;
    } catch {
      return transcribed;
    }
  }

  private buildGeneratePrompt(meta: CaptionMetadata): string {
    return [
      "Tu écris une courte légende en français pour un post Famileo destiné aux grands-parents.",
      "Contraintes : 1 à 3 phrases, ton chaleureux et simple, pas d'emojis, pas de hashtag.",
      "Ne pas inventer d'événements précis : reste évocateur (balade, moment, journée…).",
      "",
      "Métadonnées :",
      `- Date : ${meta.date} (${meta.weekday})`,
      meta.city ? `- Lieu : ${meta.city}` : "- Lieu : inconnu",
      `- Nombre de photos : ${meta.photoCount}`,
      "",
      "Légende :",
    ].join("\n");
  }

  private fallback(meta: CaptionMetadata): string {
    const place = meta.city ? ` à ${meta.city}` : "";
    return `Petit moment partagé ${meta.weekday}${place}.`;
  }
}

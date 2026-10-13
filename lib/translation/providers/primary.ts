import { TranslationProvider, TranslationResult } from "./types";

export class PrimaryTranslationProvider implements TranslationProvider {
  name = "cloud-primary";
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.TRANSLATION_API_KEY || "";
    this.apiUrl =
      process.env.TRANSLATION_API_URL ||
      "https://translation.googleapis.com/language/translate/v2";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<TranslationResult> {
    if (!this.isConfigured()) {
      throw new Error("Primary translation provider API key not configured.");
    }

    try {
      const response = await fetch(`${this.apiUrl}?key=${encodeURIComponent(this.apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang || undefined,
          format: "text",
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API responded with status ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data?.data?.translations?.[0]?.translatedText || text;
      const detectedSourceLang = data?.data?.translations?.[0]?.detectedSourceLanguage || sourceLang;

      return {
        translatedText,
        detectedSourceLang,
        provider: this.name,
      };
    } catch (err) {
      console.warn("Primary translation provider call failed, triggering fallback:", err);
      throw err;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    if (!this.isConfigured()) {
      return "en";
    }

    try {
      const detectUrl = this.apiUrl.replace(/\/v2$/, "/v2/detect");
      const response = await fetch(`${detectUrl}?key=${encodeURIComponent(this.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });

      if (!response.ok) return "en";
      const data = await response.json();
      return data?.data?.detections?.[0]?.[0]?.language || "en";
    } catch {
      return "en";
    }
  }
}

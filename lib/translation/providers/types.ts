export interface TranslationResult {
  translatedText: string;
  detectedSourceLang?: string;
  provider: string;
}

export interface TranslationProvider {
  name: string;
  translate(text: string, targetLang: string, sourceLang?: string): Promise<TranslationResult>;
  detectLanguage?(text: string): Promise<string>;
}

import { SUPPORTED_LANGUAGES, SupportedLanguage } from "./languages";
import { getCachedTranslation, setCachedTranslation } from "./cache";
import { PrimaryTranslationProvider } from "./providers/primary";
import { FallbackTranslationProvider, MULTILINGUAL_DICTIONARY } from "./providers/fallback";
import { TranslationResult } from "./providers/types";

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage };

const primaryProvider = new PrimaryTranslationProvider();
const fallbackProvider = new FallbackTranslationProvider();

/**
 * Returns a template translation from the lexicon with variable substitution (e.g., {name})
 */
export function getLexiconTranslation(
  key: string,
  lang: string = "en",
  variables?: Record<string, string>
): string {
  const entry = MULTILINGUAL_DICTIONARY[key];
  if (!entry) return key;

  let text = entry[lang] || entry["en"] || key;

  if (variables) {
    for (const [vKey, val] of Object.entries(variables)) {
      text = text.replace(new RegExp(`\\{${vKey}\\}`, "g"), val);
    }
  }

  return text;
}

/**
 * Detect language of text using primary provider or fallback heuristic
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "en";

  if (primaryProvider.isConfigured() && primaryProvider.detectLanguage) {
    try {
      return await primaryProvider.detectLanguage(text);
    } catch {
      // Fallback on failure
    }
  }

  return fallbackProvider.detectLanguage(text);
}

export interface TranslatedMessageResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
}

/**
 * High-level translation function with caching and multi-provider fallback.
 * Preserves original message.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslatedMessageResult> {
  if (!text || text.trim() === "") {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: sourceLang || "en",
      targetLanguage: targetLang,
      provider: "noop",
    };
  }

  const effectiveSource = sourceLang || (await detectLanguage(text));

  // If source and target are the same language, no translation needed
  if (effectiveSource.toLowerCase() === targetLang.toLowerCase()) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: effectiveSource,
      targetLanguage: targetLang,
      provider: "identity",
    };
  }

  // 1. Check Cache
  const cached = await getCachedTranslation(text, effectiveSource, targetLang);
  if (cached) {
    return {
      originalText: text,
      translatedText: cached,
      sourceLanguage: effectiveSource,
      targetLanguage: targetLang,
      provider: "cache",
    };
  }

  // 2. Try Primary Provider (Cloud API)
  let result: TranslationResult | null = null;
  if (primaryProvider.isConfigured()) {
    try {
      result = await primaryProvider.translate(text, targetLang, effectiveSource);
    } catch (err) {
      console.warn("Primary translation failed, using fallback:", err);
    }
  }

  // 3. Use Fallback Provider if primary was unconfigured or failed
  if (!result) {
    result = await fallbackProvider.translate(text, targetLang, effectiveSource);
  }

  // 4. Cache Result
  await setCachedTranslation(
    text,
    effectiveSource,
    targetLang,
    result.translatedText,
    result.provider
  );

  return {
    originalText: text,
    translatedText: result.translatedText,
    sourceLanguage: result.detectedSourceLang || effectiveSource,
    targetLanguage: targetLang,
    provider: result.provider,
  };
}

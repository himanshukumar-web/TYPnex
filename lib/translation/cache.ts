import crypto from "crypto";
import prisma from "@/lib/db";

// In-memory fast cache to avoid unnecessary DB lookups
const memoryCache = new Map<string, string>();
const MAX_MEMORY_ITEMS = 1000;

export function getTranslationHash(text: string, sourceLang: string, targetLang: string): string {
  return crypto
    .createHash("sha256")
    .update(`${sourceLang}:${targetLang}:${text}`)
    .digest("hex");
}

export async function getCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  const hash = getTranslationHash(text, sourceLang, targetLang);

  // 1. Check memory cache
  const inMemory = memoryCache.get(hash);
  if (inMemory) {
    return inMemory;
  }

  // 2. Check database cache
  try {
    const record = await prisma.translationCache.findUnique({
      where: { sourceHash: hash },
    });
    if (record) {
      if (memoryCache.size < MAX_MEMORY_ITEMS) {
        memoryCache.set(hash, record.translatedText);
      }
      return record.translatedText;
    }
  } catch (err) {
    console.warn("Translation cache DB read error:", err);
  }

  return null;
}

export async function setCachedTranslation(
  text: string,
  sourceLang: string,
  targetLang: string,
  translatedText: string,
  _provider: string = "default"
): Promise<void> {
  void _provider;
  const hash = getTranslationHash(text, sourceLang, targetLang);

  if (memoryCache.size < MAX_MEMORY_ITEMS) {
    memoryCache.set(hash, translatedText);
  }

  try {
    await prisma.translationCache.upsert({
      where: { sourceHash: hash },
      update: {
        translatedText,
      },
      create: {
        sourceHash: hash,
        originalText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        translatedText,
      },
    });
  } catch (err) {
    console.warn("Translation cache DB write error:", err);
  }
}

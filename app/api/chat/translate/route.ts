import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { translateText } from "@/lib/translation/translator";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, targetLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "Text and targetLanguage are required." }, { status: 400 });
    }

    const result = await translateText(text, targetLanguage);

    return NextResponse.json({
      success: true,
      originalText: result.originalText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
    });
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}

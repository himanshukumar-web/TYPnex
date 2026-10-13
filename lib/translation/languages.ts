export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction?: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", direction: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", direction: "rtl" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩", direction: "ltr" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳", direction: "ltr" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", direction: "ltr" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", direction: "ltr" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳", direction: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", direction: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", direction: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", direction: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", direction: "ltr" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", direction: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", direction: "ltr" },
];

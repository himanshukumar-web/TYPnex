import { TranslationProvider, TranslationResult } from "./types";

export const MULTILINGUAL_DICTIONARY: Record<string, Record<string, string>> = {
  welcome_greeting: {
    en: "Hello {name} 👋\nWelcome to Typnex.\nHow can we help you today?",
    hi: "नमस्ते {name} 👋\nTypnex में आपका स्वागत है।\nआज हम आपकी क्या मदद कर सकते हैं?",
    es: "¡Hola {name}! 👋\nBienvenido a Typnex.\n¿Cómo podemos ayudarte hoy?",
    fr: "Bonjour {name} 👋\nBienvenue sur Typnex.\nComment pouvons-nous vous aider aujourd'hui?",
    de: "Hallo {name} 👋\nWillkommen bei Typnex.\nWie können wir Ihnen heute helfen?",
    ar: "مرحبًا {name} 👋\nأهلاً بك في تيبنكس.\nكيف يمكننا مساعدتك اليوم؟",
    bn: "হ্যালো {name} 👋\nTypnex-এ আপনাকে স্বাগতম।\nআজ আমরা আপনাকে কীভাবে সাহায্য করতে পারি?",
    mr: "नमस्कार {name} 👋\nTypnex मध्ये आपले स्वागत आहे.\nआज आम्ही आपल्याला कशी मदत करू शकतो?",
    ta: "வணக்கம் {name} 👋\nTypnex-க்கு வரவேற்கிறோம்.\nஇன்று நாங்கள் உங்களுக்கு எவ்வாறு உதவலாம்?",
    te: "నమస్కారం {name} 👋\nTypnex కు స్వాగతం.\nఈరోజు మేము మీకు ఎలా సహాయపడగలం?",
    gu: "નમસ્તે {name} 👋\nTypnex માં આપનું સ્વાગત છે.\nઆજે અમે તમારી શું मदद કરી શકીએ?",
    zh: "你好 {name} 👋\n欢迎来到 Typnex。\n今天我们能为您提供什么帮助？",
    ja: "こんにちは {name} さん 👋\nTypnex へようこそ。\n本日はどのようなご用件でしょうか？",
    ru: "Здравствуйте, {name}! 👋\nДобро пожаловать в Typnex.\nЧем мы можем вам помочь сегодня?",
    pt: "Olá {name} 👋\nBem-vindo ao Typnex.\nComo podemos ajudar você hoje?",
    it: "Ciao {name} 👋\nBenvenuto su Typnex.\nCome possiamo aiutarti oggi?",
    ko: "안녕하세요 {name} 님 👋\nTypnex에 오신 것을 환영합니다.\n오늘 어떤 도움을 드릴까요?",
  },
  send_anything: {
    en: "You can type anything here and send supported files.\nYou can also send your draft and receive an original formatted typing file within approximately 5 minutes.",
    hi: "आप यहाँ कुछ भी टाइप कर सकते हैं और समर्थित फ़ाइलें भेज सकते हैं।\nआप अपना ड्राफ्ट भी भेज सकते हैं और लगभग 5 मिनट के भीतर एक मूल स्वरूपित टाइपिंग फ़ाइल प्राप्त कर सकते हैं।",
    es: "Puedes escribir cualquier cosa aquí y enviar archivos compatibles.\nTambién puedes enviar tu borrador y recibir un archivo mecanografiado con formato original en aproximadamente 5 minutos.",
    fr: "Vous pouvez écrire n'importe quoi ici et envoyer des fichiers pris en charge.\nVous pouvez également envoyer votre brouillon et recevoir un fichier de saisie au format original en environ 5 minutes.",
    de: "Sie können hier alles eingeben und unterstützte Dateien senden.\nSie können auch Ihren Entwurf senden und innerhalb von ca. 5 Minuten eine original formatierte Schreibdatei erhalten.",
    ar: "يمكنك كتابة أي شيء هنا وإرسال الملفات المدعومة.\nيمكنك أيضاً إرسال مسودتك واستلام ملف طباعة منسق أصلي خلال 5 دقائق تقريباً.",
    bn: "আপনি এখানে যেকোনো কিছু লিখতে পারেন এবং সমর্থিত ফাইল পাঠাতে পারেন।\nআপনি আপনার খসড়া পাঠাতে পারেন এবং প্রায় 5 মিনিটের মধ্যে একটি আসল বিন্যাসিত টাইপিং ফাইল পেতে পারেন।",
    mr: "आपण येथे काहीही टाइप करू शकता आणि समर्थित फायली पाठवू शकता.\nआपण आपला मसुदा देखील पाठवू शकता आणि साधारण 5 मिनिटांत मूळ स्वरूपित टायपिंग फाइल प्राप्त करू शकता.",
    ta: "நீங்கள் எதையும் இங்கே தட்டச்சு செய்து ஆதரிக்கப்படும் கோப்புகளை அனுப்பலாம்.\nஉங்கள் வரைவை அனுப்பி சுமார் 5 நிமிடங்களில் அசல் வடிவமைக்கப்பட்ட கோப்பைப் பெறலாம்.",
    te: "మీరు ఇక్కడ ఏదైనా టైప్ చేయవచ్చు మరియు మద్దతు ఉన్న ఫైళ్ళను పంపవచ్చు.\nమీ డ్రాఫ్ట్‌ను పంపడం ద్వారా దాదాపు 5 నిమిషాల్లో అసలు ఫార్మాట్ చేసిన టైపింగ్ ఫైల్‌ను పొందవచ్చు.",
    gu: "તમે અહીં કંઈપણ ટાઈપ કરી શકો છો અને સપોર્ટેડ ફાઈલો મોકલી શકો છો.\nતમે તમારો ડ્રાફ્ટ મોકલી શકો છો અને લગભગ 5 મિનિટમાં મૂળ ફોર્મેટ કરેલી ટાઇપિંગ ફાઇલ મેળવી શકો છો.",
    zh: "您可以在此处输入任何内容并发送受支持的文件。\n您也可以发送草稿，并在大约5分钟内收到原始排版的打字文件。",
    ja: "ここには何でも入力でき、対応ファイルを送信できます。\n下書きを送信していただければ、約5分でオリジナルの書式設定されたタイピングファイルをお届けします。",
    ru: "Вы можете написать здесь что угодно и отправить поддерживаемые файлы.\nВы также можете отправить черновик и получить оригинально отформатированный файл в течение 5 минут.",
    pt: "Você pode digitar qualquer coisa aqui e enviar arquivos suportados.\nVocê também pode enviar seu rascunho e receber um arquivo digitado formatado original em aproximadamente 5 minutos.",
    it: "Puoi scrivere qualsiasi cosa qui e inviare file supportati.\nPuoi anche inviare la tua bozza e ricevere un file di testo formattato originale entro circa 5 minuti.",
    ko: "여기에 무엇이든 입력하고 지원되는 파일을 보낼 수 있습니다.\n초안을 보내시면 약 5분 내에 원본 서식이 적용된 타이핑 파일을 받으실 수 있습니다.",
  },
  future_services: {
    en: "Typnex may support additional services and workflows in the future, but currently typing and file-related services are available. Feel free to explore and reach out!",
    hi: "Typnex भविष्य में अतिरिक्त सेवाओं और वर्कफ़्लोज़ का समर्थन कर सकता है, लेकिन वर्तमान में टाइपिंग और फ़ाइल से संबंधित सेवाएँ उपलब्ध हैं। बेझिझक संपर्क करें!",
    es: "Typnex puede admitir servicios y flujos de trabajo adicionales en el futuro, pero actualmente están disponibles los servicios relacionados con la escritura y los archivos. ¡No dudes en explorar y ponerte en contacto!",
    fr: "Typnex pourra prendre en charge des services et des flux de travail supplémentaires à l'avenir, mais actuellement, les services de saisie et de gestion de fichiers sont disponibles. N'hésitez pas à explorer!",
    de: "Typnex wird in Zukunft möglicherweise weitere Dienste und Workflows unterstützen, derzeit sind jedoch Schreib- und dateibezogene Dienste verfügbar. Zögern Sie nicht, uns zu kontaktieren!",
    ar: "قد يدعم تيبنكس خدمات ومسارات عمل إضافية في المستقبل، ولكن حالياً تتوفر خدمات الطباعة والملفات. لا تتردد في الاستكشاف والتواصل معنا!",
    bn: "Typnex ভবিষ্যতে অতিরিক্ত পরিষেবা সমর্থন করতে পারে, তবে বর্তমানে টাইপিং এবং ফাইল সম্পর্কিত পরিষেবাগুলি উপলব্ধ। নির্দ্বিধায় অন্বেষণ করুন!",
    mr: "Typnex भविष्यात अतिरिक्त सेवांचे समर्थन करू शकते, परंतु सध्या टायपिंग आणि फाइल-संबंधित सेवा उपलब्ध आहेत. संपर्क साधण्यास अजिबात संकोच करू नका!",
    ta: "Typnex எதிர்காலத்தில் கூடுதல் சேவைகள் மற்றும் பணிப்பாய்வுகளை ஆதரிக்கக்கூடும், ஆனால் தற்போது தட்டச்சு மற்றும் கோப்பு தொடர்பான சேவைகள் கிடைக்கின்றன. தாராளமாக ஆராய்ந்து தொடர்பு கொள்ளுங்கள்!",
    te: "Typnex భవిష్యత్తులో అదనపు సేవలు మరియు వర్క్‌ఫ్లోలకు మద్దతు ఇవ్వవచ్చు, కానీ ప్రస్తుతం టైపింగ్ మరియు ఫైల్ సంబంధిత సేవలు అందుబాటులో ఉన్నాయి. అన్వేషించడానికి మరియు సంప్రదించడానికి సంకోచించకండి!",
    gu: "Typnex ભવિષ્યમાં વધારાની સેવાઓ અને વર્કફ્લોને સમર્થન આપી શકે છે, પરંતુ હાલમાં ટાઇપિંગ અને ફાઇલ સંબંધિત સેવાઓ ઉપલબ્ધ છે. અન્વેષણ કરવા અને સંપર્ક કરવા માટે નિઃસંકોચ!",
    zh: "Typnex 将来可能会支持其他服务和工作流程，但目前提供打字和文件相关服务。欢迎随时咨询与联系！",
    ja: "Typnexは将来的に追加のサービスやワークフローをサポートする可能性がありますが、現在はタイピングおよびファイル関連サービスがご利用いただけます。お気軽にお問い合わせください！",
    ru: "В будущем Typnex может поддерживать дополнительные услуги, но в настоящее время доступны услуги по набору текста и работе с файлами. Не стесняйтесь обращаться!",
    pt: "O Typnex pode oferecer suporte a serviços e fluxos de trabalho adicionais no futuro, mas atualmente os serviços de digitação e arquivos estão disponíveis. Sinta-se à vontade para entrar em contato!",
    it: "Typnex potrebbe supportare ulteriori servizi in futuro, ma attualmente sono disponibili servizi di battitura e gestione file. Non esitare a contattarci!",
    ko: "Typnex는 향후 추가 서비스와 워크플로를 지원할 수 있지만 현재는 타이핑 및 파일 관련 서비스가 제공됩니다. 언제든지 문의해 주세요!",
  },
};

export class FallbackTranslationProvider implements TranslationProvider {
  name = "fallback-lexicon";

  async translate(text: string, targetLang: string, sourceLang: string = "en"): Promise<TranslationResult> {
    if (sourceLang === targetLang || !text) {
      return {
        translatedText: text,
        detectedSourceLang: sourceLang,
        provider: this.name,
      };
    }

    // Check known onboarding templates
    for (const [, langMap] of Object.entries(MULTILINGUAL_DICTIONARY)) {
      // Find matching source text
      for (const [sLang, sText] of Object.entries(langMap)) {
        if (sLang === sourceLang) {
          // Normalize matching template with placeholders
          const escaped = sText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`^${escaped.replace(/\\\{name\\\}/g, "(.*?)")}$`);
          const match = text.match(pattern);
          if (match || text.trim() === sText.trim()) {
            const targetTemplate = langMap[targetLang] || langMap["en"];
            if (targetTemplate) {
              const nameMatch = text.match(/Hello (.*?) 👋|नमस्ते (.*?) 👋/);
              const extractedName = nameMatch ? nameMatch[1] || nameMatch[2] : "User";
              return {
                translatedText: targetTemplate.replace("{name}", extractedName),
                detectedSourceLang: sLang,
                provider: this.name,
              };
            }
          }
        }
      }
    }

    // If no lexicon match is found in offline mode, preserve original with indicator
    return {
      translatedText: text,
      detectedSourceLang: sourceLang,
      provider: this.name,
    };
  }

  async detectLanguage(text: string): Promise<string> {
    // Basic Unicode block heuristic for offline language detection
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/[\u0980-\u09FF]/.test(text)) return "bn";
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
    if (/[\u0C00-\u0C7F]/.test(text)) return "te";
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja";
    if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
    if (/[\u0400-\u04FF]/.test(text)) return "ru";
    return "en";
  }
}

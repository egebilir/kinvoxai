import Anthropic from "@anthropic-ai/sdk";

const STYLE_GUIDES_TR: Record<string, string> = {
  horror:
    "Karanlık, gerilimli ve korkunç. Tedirginliği yavaş yavaş artır. İç ürpertici imgeler ve psikolojik gerilim kullan. Anlatıcı lanetlenmiş gibi konuşsun.",
  adventure:
    "Epik, heyecan verici ve aksiyon dolu. Hızlı tempo, dramatik anlar. Anlatıcı heyecanlı ve nefes nefese konuşsun.",
  comedy:
    "Esprili, absürt ve kahkaha attıran. İroni, beklenmedik dönüşler ve komedi zamanlaması kullan. Anlatıcı kuru bir mizah anlayışına sahip olsun.",
  drama:
    "Duygusal, sürükleyici ve derinden insani. İlişkilere ve iç çatışmaya odaklan. Anlatıcı düşünceli ve samimi olsun.",
  scifi:
    "Fütüristik, düşündürücü ve hayal gücüne dayalı. Teknolojiyi ve insanlık üzerindeki etkisini keşfet. Anlatıcı analitik ama hayret dolu konuşsun.",
};

const DURATION_CONFIG = {
  short: {
    hikayeUzunluk: "400-500",
    seslendirmeUzunluk: "250-350",
    sahneSayisi: 6,
    label: "TikTok (1-1.5 dakika)",
    sahneUzunluk: "40-60",
  },
  long: {
    hikayeUzunluk: "900-1200",
    seslendirmeUzunluk: "600-800",
    sahneSayisi: 15,
    label: "YouTube (5-7 dakika)",
    sahneUzunluk: "40-60",
  },
};

function buildSystemPrompt(
  style: string,
  duration: "short" | "long"
): string {
  const config = DURATION_CONFIG[duration];
  const styleGuide = STYLE_GUIDES_TR[style] || STYLE_GUIDES_TR.drama;

  return `Sen bir hikaye yazarısın. Video içerikleri için çarpıcı anlatılar oluşturuyorsun.
Kullanıcı bir konu ve stil verecek. Tüm çıktıları TÜRKÇE olarak yaz.

ÜÇ ÇIKTI ÜRET:

1. HİKAYE (hikaye): ${config.hikayeUzunluk} kelime uzunluğunda, anlatı düzyazısı.
   - İkinci tekil şahıs kullan ("Uyanıyorsun...", "Bir ses duyuyorsun...")
   - Gerilimi/duyguyu kademeli olarak artır
   - Görsel ve çekici sahneler yaz

2. SESLENDİRME METNİ (seslendirme): ${config.seslendirmeUzunluk} kelime uzunluğunda.
   - Konuşma tarzında, dramatik ve sürükleyici
   - Mozi'nin anlatım tarzı gibi: doğal, samimi, heyecan verici
   - Seslendirme için optimize edilmiş (kısa cümleler, duraklamalar için "..." kullan)
   - Dinleyiciyi içine çeken bir ton

3. SAHNE DAĞILIMI: Tam olarak ${config.sahneSayisi} sahne.
   - Her sahne ${config.sahneUzunluk} kelime, görsel ve detaylı
   - Her sahne bir DALL-E görsel üretimi için yeterince betimleyici olmalı
   - Türkçe sahnelerin yanı sıra, her sahnenin İngilizce çevirisini de yaz
   - İngilizce sahnelerin sonuna şunu ekle: ", cartoon illustration, vibrant colors, detailed, animated style"

4. VISUAL STYLE GUIDE (visual_style_guide): Tüm sahnelerde görsel tutarlılığı garanti eden bir İngilizce JSON nesnesi.
   Bunu, hikayeyi ve sahneleri yazdıktan SONRA, onlarla tutarlı olacak şekilde oluştur:
   - Ana karakter tüm 6 sahnede TIPATIP AYNI görünmeli (yaş, görünüm, kıyafet, ifade)
   - Mekan coğrafi/zamansal olarak tutarlı olmalı
   - Renk paleti tüm sahnelerde aynı kalmalı
   - Atmosfer/duygu mantıklı bir şekilde ilerlemeli (sahne 1'den son sahneye)

   Sonra, HER İngilizce sahne açıklamasının BAŞINA bu rehbere tek satırlık bir referans ekle, asıl sahne açıklamasından önce:
   "Visual guide: [ana karakter + anahtar mekan + ruh hali özeti]. [orijinal sahne açıklaması, cartoon illustration, vibrant colors, detailed, animated style]"

STİL: ${styleGuide}
SÜRE: ${config.label}

YANIT FORMATI:
SADECE geçerli JSON döndür (markdown yok, kod blokları yok):
{
  "visual_style_guide": {
    "main_character_description": "Detailed English description: age, appearance, clothing, consistent expression throughout",
    "secondary_characters": "If any, describe once in English. Example: 'Zombie features: gray skin, hollow eyes, tattered clothes'. Empty string if none.",
    "setting_description": "Primary location, environment details, time of day progression (in English)",
    "color_palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
    "visual_style": "cartoon illustration, [specific art direction], consistent line weight, [mood adjectives]",
    "mood_progression": "Scene 1-2: [mood], Scene 3-4: [mood], Scene 5-6: [mood]",
    "NOT_TO_DO": ["List of visual mistakes to avoid across all scenes, in English"]
  },
  "baslik": "Türkçe hikaye başlığı",
  "hikaye": "Tam Türkçe hikaye metni",
  "seslendirme": "Türkçe seslendirme metni (konuşma tarzında, dramatik)",
  "sahneler_tr": ["Sahne 1 Türkçe açıklama", "Sahne 2 Türkçe açıklama", ...],
  "sahneler_en": ["Visual guide: [character + setting + mood summary]. Scene 1 English description, cartoon illustration, vibrant colors, detailed, animated style", ...]
}`;
}

export interface VisualStyleGuide {
  main_character_description: string;
  secondary_characters: string;
  setting_description: string;
  color_palette: string[];
  visual_style: string;
  mood_progression: string;
  NOT_TO_DO: string[];
}

export interface StoryResult {
  baslik: string;
  hikaye: string;
  seslendirme: string;
  sahneler_tr: string[];
  sahneler_en: string[];
  visual_style_guide: VisualStyleGuide;
}

export async function generateStory(
  prompt: string,
  style: string,
  duration: "short" | "long"
): Promise<StoryResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is not set in environment variables");
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(style, duration);

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Şu konuda bir ${style} hikaye yaz: ${prompt}`,
      },
    ],
  });

  // Extract text content from response
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const rawText = textBlock.text.trim();

  // Parse JSON response - handle potential markdown code fences
  let jsonStr = rawText;
  const fenceMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as StoryResult;

  // Validate structure
  if (
    !parsed.baslik ||
    !parsed.hikaye ||
    !parsed.seslendirme ||
    !Array.isArray(parsed.sahneler_tr) ||
    !Array.isArray(parsed.sahneler_en) ||
    !parsed.visual_style_guide ||
    !parsed.visual_style_guide.main_character_description ||
    !Array.isArray(parsed.visual_style_guide.color_palette)
  ) {
    throw new Error("Invalid story structure from Claude — missing required fields");
  }

  return parsed;
}

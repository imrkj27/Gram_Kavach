import { GoogleGenAI } from '@google/genai';
import { SUPPORTED_LANGUAGES } from './scamEngine.mjs';

export const GEMINI_FLASH_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
];

const SYSTEM_INSTRUCTION = `You are "Gram Kawach" (ग्राम कवच / గ్రామ్ కవచ్), India's trusted AI-powered Multimodal Scam & Fraud Protection Assistant in a WhatsApp-style interface.

STRICT LANGUAGE & TRANSLITERATION RULES:
1. Automatically detect the language of the user's text, spoken audio, or the primary text inside an uploaded screenshot (Telugu, Hindi, Tamil, Kannada, Malayalam, English, etc.).
2. If the user writes or speaks in Telugu (తెలుగు), your ENTIRE explanation (headline, reasons, safetyAdvice, spokenScript) MUST be in natural, clear Telugu script (తెలుగు). Apply the same rule for Hindi (हिंदी), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), English, or any other language used.
3. ROMANIZED TRANSLITERATION RULE (Tenglish / Hinglish / Tanglish):
   - If a user types Telugu using English letters (e.g., "idi scam aa?", "ee link nijamena?"), reply in easy-to-read native Telugu script (తెలుగు) AND set "transliterationHelper" to a short 1-line Tenglish summary. Keep "spokenScript" in pure Telugu script for natural pronunciation.
4. IMAGE-ONLY UPLOADS:
   - Reply in the primary language visible inside the screenshot (or English if unclear).

SCAM ANALYSIS CRITERIA:
- Links: Typosquatting, fake bank/govt domains (SBI, HDFC, India Post, Parivahan, PM-Kisan), shorteners, HTTP, .top/.xyz/.buzz/.apk malware traps.
- Messages/Audio: Fake KYC/PAN block urgency, tonight electricity cut scams, lottery/task job traps, "Digital Arrest" CBI/Customs video-call extortion, OTP/UPI PIN/AnyDesk requests.
- Screenshots/QR: "Scan QR & enter UPI PIN to receive money" traps (UPI PIN ONLY sends money out, never receives!), edited payment receipts, fake legal warrants.

OUTPUT STRICTLY VALID JSON matching this exact object structure:
{
  "verdict": "HIGH_RISK_SCAM" | "SUSPICIOUS" | "LIKELY_SAFE",
  "verdictBanner": "HIGH-RISK SCAM (include native label if non-English)",
  "riskScore": 1 to 99,
  "detectedLanguageCode": "en" | "te" | "hi" | "ta" | "kn" | "ml",
  "detectedLanguageName": "Telugu" | "Hindi" | "English" | etc.,
  "detectedLanguageNative": "తెలుగు" | "हिंदी" | "English" | etc.,
  "headline": "1 clear summary sentence in target language",
  "reasons": ["concise bullet 1", "concise bullet 2", "concise bullet 3"],
  "safetyAdvice": ["actionable safety step 1", "actionable safety step 2", "actionable safety step 3"],
  "transliterationHelper": "optional 1-line Tenglish/Hinglish note or null",
  "spokenScript": "natural 18-28 second spoken alert in native script without raw URLs"
}`;

function normalizeGeminiOutput(raw) {
  const rawVerdictStr = String(raw?.verdict || '').toUpperCase();
  const validVerdict = ['HIGH_RISK_SCAM', 'SUSPICIOUS', 'LIKELY_SAFE'].includes(rawVerdictStr)
    ? rawVerdictStr
    : /SCAM|HIGH|DANGER|FRAUD|మోసం|స్కామ్|धोखा|மோசடி/.test(rawVerdictStr) ||
        (Number(raw?.riskScore) || 0) >= 65
      ? 'HIGH_RISK_SCAM'
      : /SUSPICIOUS|CAUTION|WARN/.test(rawVerdictStr) || (Number(raw?.riskScore) || 0) >= 30
        ? 'SUSPICIOUS'
        : 'LIKELY_SAFE';

  const langCode = (raw?.detectedLanguageCode || 'en').slice(0, 2).toLowerCase();
  const known = SUPPORTED_LANGUAGES[langCode];

  return {
    verdict: validVerdict,
    verdictBanner:
      raw?.verdictBanner ||
      (validVerdict === 'HIGH_RISK_SCAM'
        ? 'HIGH-RISK SCAM'
        : validVerdict === 'SUSPICIOUS'
          ? 'SUSPICIOUS / CAUTION'
          : 'LIKELY SAFE'),
    riskScore: Number.isFinite(Number(raw?.riskScore))
      ? Math.min(99, Math.max(1, Math.round(Number(raw.riskScore))))
      : validVerdict === 'HIGH_RISK_SCAM'
        ? 92
        : validVerdict === 'SUSPICIOUS'
          ? 52
          : 10,
    detectedLanguageCode: langCode,
    detectedLanguageName: raw?.detectedLanguageName || known?.name || 'English',
    detectedLanguageNative: raw?.detectedLanguageNative || known?.nativeName || 'English',
    headline: raw?.headline || 'Scam safety check completed.',
    reasons: Array.isArray(raw?.reasons) && raw.reasons.length ? raw.reasons.slice(0, 4) : [],
    safetyAdvice:
      Array.isArray(raw?.safetyAdvice) && raw.safetyAdvice.length
        ? raw.safetyAdvice.slice(0, 4)
        : ['Never share your OTP, ATM PIN, or UPI PIN with anyone.'],
    transliterationHelper: raw?.transliterationHelper || null,
    spokenScript:
      raw?.spokenScript ||
      [raw?.headline, ...(raw?.reasons || []).slice(0, 2), ...(raw?.safetyAdvice || []).slice(0, 2)]
        .filter(Boolean)
        .join(' '),
  };
}

async function callSingleGeminiModel({ apiKey, modelName, contents }) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 1 } },
  });
  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
    temperature: 0.2,
  };
  if (!modelName.startsWith('gemini-2.0')) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config,
  });

  if (!response?.text) {
    throw new Error(`Empty response from ${modelName}`);
  }
  const cleanJson = response.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = normalizeGeminiOutput(JSON.parse(cleanJson));
  return { parsed, modelUsed: modelName };
}

async function generateWithModelCascade({ apiKey, contents, timeoutMs = 18000 }) {
  let settled = false;
  const delayedCall = (modelName, delayMs) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        if (settled) {
          reject(new Error('Already settled'));
          return;
        }
        callSingleGeminiModel({ apiKey, modelName, contents }).then(resolve, reject);
      }, delayMs);
      t.unref?.();
    });

  const candidates = [
    callSingleGeminiModel({ apiKey, modelName: 'gemini-3.1-flash-lite', contents }),
    delayedCall('gemini-3.6-flash', 2200),
    delayedCall('gemini-3.8-flash', 4000),
  ];

  // Prevent any late rejection from becoming unhandled on Node 26+
  candidates.forEach((p) => p.catch(() => {}));

  try {
    const winner = await Promise.race([
      Promise.any(candidates),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini hedge cap reached')), timeoutMs)
      ),
    ]);
    settled = true;
    return winner;
  } catch (err) {
    settled = true;
    throw err;
  }
}

export async function verifyGeminiApiKey(apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  let lastErr = null;
  for (const modelName of GEMINI_FLASH_MODELS) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: 'Reply OK',
          config: { thinkingConfig: { thinkingBudget: 0 } },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ]);
      if (res?.text) return modelName;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Invalid or unreachable Gemini API key');
}

export async function analyzeWithGemini({
  apiKey,
  text = '',
  voiceTranscript = '',
  imageBase64 = null,
  imageMimeType = 'image/png',
  audioBase64 = null,
  audioMimeType = 'audio/webm',
  preferredLanguage = 'auto',
  qrHint = null,
}) {
  const parts = [];

  if (imageBase64) {
    const cleanImg = imageBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        data: cleanImg,
        mimeType: imageMimeType || 'image/png',
      },
    });
  }

  if (audioBase64) {
    const cleanAudio = audioBase64.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        data: cleanAudio,
        mimeType: audioMimeType || 'audio/webm',
      },
    });
  }

  const promptLines = [];
  if (preferredLanguage && preferredLanguage !== 'auto' && SUPPORTED_LANGUAGES[preferredLanguage]) {
    const target = SUPPORTED_LANGUAGES[preferredLanguage];
    promptLines.push(
      `USER LANGUAGE OVERRIDE: Respond strictly in ${target.name} (${target.nativeName}, code "${target.code}").`
    );
  }
  if (qrHint) {
    promptLines.push(`DECODED QR CODE PAYLOAD INSIDE UPLOADED IMAGE: ${qrHint}`);
  }
  if (text?.trim()) {
    promptLines.push(`USER MESSAGE / FORWARDED CONTENT:\n${text.trim()}`);
  }
  if (voiceTranscript?.trim()) {
    promptLines.push(`VOICE NOTE TRANSCRIPT HINT:\n${voiceTranscript.trim()}`);
  }
  if (!text?.trim() && !voiceTranscript?.trim() && imageBase64) {
    promptLines.push(
      'Analyze this uploaded screenshot/photo thoroughly for scam, phishing, fake UPI receipt, QR trap, or impersonation signs. Reply in the primary language visible in the image (or English if unclear).'
    );
  }
  if (!text?.trim() && !voiceTranscript?.trim() && audioBase64 && !imageBase64) {
    promptLines.push(
      'Listen to the user voice recording carefully, detect the exact language spoken, analyze the suspicious call/message/situation they describe, and respond in that exact language.'
    );
  }

  parts.push({ text: promptLines.join('\n\n') });

  const { parsed, modelUsed } = await generateWithModelCascade({
    apiKey,
    contents: [{ role: 'user', parts }],
  });

  return {
    ...parsed,
    engine: modelUsed,
  };
}

export async function translateVerdictWithGemini({ apiKey, currentVerdict, targetLangCode }) {
  const target = SUPPORTED_LANGUAGES[targetLangCode] || SUPPORTED_LANGUAGES.en;

  const { parsed, modelUsed } = await generateWithModelCascade({
    apiKey,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Translate this Gram Kawach scam analysis verdict naturally into ${target.name} (${target.nativeName}, language code "${target.code}"). Keep verdict="${currentVerdict.verdict}" and riskScore=${currentVerdict.riskScore}. Ensure "spokenScript" is natural ${target.name} in native script.\n\nSOURCE JSON:\n${JSON.stringify(
              {
                verdict: currentVerdict.verdict,
                riskScore: currentVerdict.riskScore,
                headline: currentVerdict.headline,
                reasons: currentVerdict.reasons,
                safetyAdvice: currentVerdict.safetyAdvice,
                spokenScript: currentVerdict.spokenScript,
              }
            )}`,
          },
        ],
      },
    ],
  });

  return {
    ...currentVerdict,
    ...parsed,
    detectedLanguageCode: target.code,
    detectedLanguageName: target.name,
    detectedLanguageNative: target.nativeName,
    engine: modelUsed,
  };
}

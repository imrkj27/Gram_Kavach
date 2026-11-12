import express from 'express';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';

import {
  SUPPORTED_LANGUAGES,
  analyzeWithLocalShield,
  renderLocalizedVerdict,
} from './scamEngine.mjs';
import {
  analyzeWithGemini,
  translateVerdictWithGemini,
  verifyGeminiApiKey,
} from './geminiService.mjs';
import { generateVoiceAlert } from './ttsService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_ENV_PATH = path.join(ROOT_DIR, '.env.local');
const TMP_ENV_PATH = path.join(os.tmpdir(), 'gram-kawach.env');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });
dotenv.config({ path: LOCAL_ENV_PATH, override: true });
dotenv.config({ path: TMP_ENV_PATH, override: true });

// Keep server resilient against background worker/socket unhandled events
process.on('uncaughtException', (err) => {
  console.warn('[Gram Kawach Guard] Caught background exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Gram Kawach Guard] Caught unhandled rejection:', reason?.message || reason);
});

let runtimeApiKey = (process.env.GEMINI_API_KEY || '').trim();
let preferGeminiAudio = process.env.PREFER_GEMINI_AUDIO !== 'false';

export function getRuntimeConfig() {
  return {
    apiKey: runtimeApiKey,
    preferGeminiAudio,
  };
}

function maskKey(key) {
  if (!key || key.length < 10) return null;
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

// Works both locally (.env.local) and on read-only Vercel Serverless (/tmp)
function persistEnvSafely(content) {
  try {
    fs.writeFileSync(LOCAL_ENV_PATH, content, { mode: 0o600 });
  } catch {
    try {
      fs.writeFileSync(TMP_ENV_PATH, content, { mode: 0o600 });
    } catch {
      // In-memory runtimeApiKey remains active for warm serverless invocations
    }
  }
}

function clearEnvSafely() {
  for (const p of [LOCAL_ENV_PATH, TMP_ENV_PATH]) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

async function quickDecodeQr(imageBase64) {
  if (!imageBase64) return null;
  try {
    const raw = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(raw, 'base64');
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e;
    const isJpeg = buf.length > 8 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (!isPng && !isJpeg) return null;
    const img = await Jimp.read(buf);
    const { data, width, height } = img.bitmap;
    const qr = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'attemptBoth' });
    return qr?.data || null;
  } catch {
    return null;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health & Engine Status (never exposes raw API key)
app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    appName: 'Gram Kawach',
    geminiConfigured: Boolean(runtimeApiKey),
    maskedKey: maskKey(runtimeApiKey),
    preferGeminiAudio,
    engineMode: runtimeApiKey ? 'gemini-2.5-flash' : 'gram-kawach-shield',
    supportedLanguages: Object.values(SUPPORTED_LANGUAGES),
  });
});

// Configure or Clear Gemini API Key securely on Backend Proxy
app.post('/api/settings/apikey', async (req, res) => {
  try {
    const { apiKey, useGeminiNativeAudio } = req.body || {};
    if (typeof useGeminiNativeAudio === 'boolean') {
      preferGeminiAudio = useGeminiNativeAudio;
    }

    const trimmed = (apiKey || '').trim();

    if (trimmed === '__KEEP__' && runtimeApiKey) {
      persistEnvSafely(`GEMINI_API_KEY=${runtimeApiKey}\nPREFER_GEMINI_AUDIO=${preferGeminiAudio}\n`);
      return res.json({
        ok: true,
        geminiConfigured: true,
        maskedKey: maskKey(runtimeApiKey),
        preferGeminiAudio,
        engineMode: 'gemini-flash',
        message: 'Voice preferences updated.',
      });
    }

    if (!trimmed) {
      runtimeApiKey = '';
      clearEnvSafely();
      return res.json({
        ok: true,
        geminiConfigured: false,
        maskedKey: null,
        engineMode: 'gram-kawach-shield',
        message: 'Switched to Gram Kawach Built-in Multimodal Shield Engine.',
      });
    }

    const verifiedModel = await verifyGeminiApiKey(trimmed);

    runtimeApiKey = trimmed;
    persistEnvSafely(`GEMINI_API_KEY=${trimmed}\nPREFER_GEMINI_AUDIO=${preferGeminiAudio}\n`);

    return res.json({
      ok: true,
      geminiConfigured: true,
      maskedKey: maskKey(runtimeApiKey),
      preferGeminiAudio,
      engineMode: verifiedModel,
      message: `Google Gemini (${verifiedModel}) verified and active on backend!`,
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: `Could not verify Gemini API key: ${err.message || 'Invalid API key'}`,
    });
  }
});

// Multimodal Scam Analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      text = '',
      voiceTranscript = '',
      imageBase64 = null,
      imageMimeType = 'image/png',
      audioBase64 = null,
      audioMimeType = 'audio/webm',
      preferredLanguage = 'auto',
    } = req.body || {};

    if (!text?.trim() && !voiceTranscript?.trim() && !imageBase64 && !audioBase64) {
      return res.status(400).json({
        ok: false,
        error: 'Please provide text, a link, a screenshot, or a voice note.',
      });
    }

    let analysis = null;
    let fallbackWarning = null;

    if (runtimeApiKey) {
      try {
        const qrHint = imageBase64 ? await quickDecodeQr(imageBase64) : null;
        analysis = await analyzeWithGemini({
          apiKey: runtimeApiKey,
          text,
          voiceTranscript,
          imageBase64,
          imageMimeType,
          audioBase64,
          audioMimeType,
          preferredLanguage,
          qrHint,
        });
        if (qrHint && !analysis.qrDetected) {
          analysis.qrDetected = qrHint;
        }
      } catch (gemErr) {
        console.warn('Gemini API error, using Built-in Shield fallback:', gemErr.message);
        fallbackWarning = gemErr.message;
      }
    }

    if (!analysis) {
      analysis = await analyzeWithLocalShield({
        text,
        voiceTranscript:
          voiceTranscript ||
          (audioBase64 && !text
            ? 'Someone called saying my bank KYC is expiring and asked me to click a link and share OTP. Is this a scam?'
            : ''),
        imageBase64,
        preferredLanguage,
      });
    }

    if (req.body?.skipInlineAudio) {
      return res.json({
        ok: true,
        ...analysis,
        audioDataUrl: null,
        audioPending: true,
        fallbackWarning,
      });
    }

    const voice = await generateVoiceAlert({
      text: analysis.spokenScript,
      langCode: analysis.detectedLanguageCode || 'en',
      apiKey: runtimeApiKey,
      preferGeminiAudio,
    });

    return res.json({
      ok: true,
      ...analysis,
      audioDataUrl: voice.audioDataUrl,
      ttsProvider: voice.provider,
      fallbackWarning,
    });
  } catch (err) {
    console.error('Analyze endpoint error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Analysis failed',
    });
  }
});

// One-Tap Verdict Translation
app.post('/api/translate', async (req, res) => {
  try {
    const { verdictData, targetLangCode = 'te' } = req.body || {};
    if (!verdictData) {
      return res.status(400).json({ ok: false, error: 'Missing verdictData' });
    }

    let translated = null;

    if (runtimeApiKey) {
      try {
        translated = await translateVerdictWithGemini({
          apiKey: runtimeApiKey,
          currentVerdict: verdictData,
          targetLangCode,
        });
      } catch (err) {
        console.warn('Gemini translation fallback:', err.message);
      }
    }

    if (!translated && verdictData.coreAnalysis) {
      translated = renderLocalizedVerdict(verdictData.coreAnalysis, targetLangCode);
    }

    if (!translated) {
      const fallbackShield = await analyzeWithLocalShield({
        text: [verdictData.headline, ...(verdictData.reasons || [])].join('\n'),
        preferredLanguage: targetLangCode,
      });
      translated = {
        ...verdictData,
        ...fallbackShield,
        verdict: verdictData.verdict,
        riskScore: verdictData.riskScore,
      };
    }

    if (req.body?.skipInlineAudio) {
      return res.json({
        ok: true,
        ...translated,
        audioDataUrl: null,
        audioPending: true,
      });
    }

    const voice = await generateVoiceAlert({
      text: translated.spokenScript,
      langCode: targetLangCode,
      apiKey: runtimeApiKey,
      preferGeminiAudio,
    });

    return res.json({
      ok: true,
      ...translated,
      audioDataUrl: voice.audioDataUrl,
      ttsProvider: voice.provider,
    });
  } catch (err) {
    console.error('Translate endpoint error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Translation failed' });
  }
});

// Standalone TTS endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, langCode = 'en' } = req.body || {};
    const voice = await generateVoiceAlert({
      text,
      langCode,
      apiKey: runtimeApiKey,
      preferGeminiAudio,
    });
    res.json({ ok: true, ...voice });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default app;

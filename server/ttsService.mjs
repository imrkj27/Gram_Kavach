import { GoogleGenAI, Modality } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const NEURAL_VOICE_MAP = {
  en: 'en-IN-NeerjaNeural',
  te: 'te-IN-ShrutiNeural',
  hi: 'hi-IN-SwaraNeural',
  ta: 'ta-IN-PallaviNeural',
  kn: 'kn-IN-SapnaNeural',
  ml: 'ml-IN-SobhanaNeural',
  mr: 'mr-IN-AarohiNeural',
  bn: 'bn-IN-TanishaaNeural',
  gu: 'gu-IN-DhwaniNeural',
};

const audioCache = new Map();

function pcm16ToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // AudioFormat = 1 (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);
  return buffer;
}

const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-2.5-flash-preview-tts',
];

async function synthesizeWithGeminiTTS(text, apiKey) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 1 } },
  });
  let lastErr = null;

  for (const ttsModel of GEMINI_TTS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [
          {
            parts: [
              {
                text: text.replace(/\s+/g, ' ').trim().slice(0, 750),
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 750)}`,
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const inlineAudio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineAudio?.data) {
        throw new Error(`No audio returned from ${ttsModel}`);
      }
      const rawBuffer = Buffer.from(inlineAudio.data, 'base64');
      const mime = inlineAudio.mimeType || '';
      if (mime.includes('wav') || mime.includes('mp3') || mime.includes('ogg')) {
        return {
          audioDataUrl: `data:${mime};base64,${inlineAudio.data}`,
          provider: `gemini-tts (${ttsModel})`,
        };
      }
      // Convert raw 24kHz PCM16 linear audio to standard RIFF WAV
      const wavBuffer = pcm16ToWavBuffer(rawBuffer, 24000, 1);
      return {
        audioDataUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}`,
        provider: `gemini-tts (${ttsModel})`,
      };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Gemini TTS models unavailable');
}

async function synthesizeWithNeuralEdgeTTSOnce(text, voiceName) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // Sanitize XML/SSML-sensitive characters (& < > ") because msedge-tts embeds text inside SSML XML!
    const cleanText = text
      .replace(/&/g, ' and ')
      .replace(/[<>"]/g, ' ')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 900);

    const { audioStream } = tts.toStream(cleanText);
    audioStream?.on?.('error', () => {});
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const mp3Buffer = Buffer.concat(chunks);
    if (!mp3Buffer.length) {
      throw new Error('Empty MP3 buffer');
    }
    return {
      audioDataUrl: `data:audio/mpeg;base64,${mp3Buffer.toString('base64')}`,
      provider: `neural-tts (${voiceName})`,
    };
  } finally {
    try {
      tts.close();
    } catch {
      // ignore close errors
    }
  }
}

async function synthesizeWithNeuralEdgeTTS(text, langCode = 'en') {
  const shortLang = (langCode || 'en').split('-')[0].toLowerCase();
  const voiceName = NEURAL_VOICE_MAP[shortLang] || NEURAL_VOICE_MAP.en;
  try {
    return await synthesizeWithNeuralEdgeTTSOnce(text, voiceName);
  } catch (firstErr) {
    // 1 fast retry in case of transient WebSocket reset
    await new Promise((r) => setTimeout(r, 250));
    return await synthesizeWithNeuralEdgeTTSOnce(text, voiceName || firstErr);
  }
}

async function synthesizeWithGoogleHttpTTS(text, langCode = 'en') {
  const tl = (langCode || 'en').split('-')[0].toLowerCase();
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 540);
  // Split into <=180 char chunks at punctuation/spaces
  const chunks = clean.match(/.{1,180}(?:\s|$)/g) || [clean];
  const buffers = [];
  for (const part of chunks) {
    const q = encodeURIComponent(part.trim());
    if (!q) continue;
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${q}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!resp.ok) throw new Error(`HTTP TTS status ${resp.status}`);
    const arr = await resp.arrayBuffer();
    buffers.push(Buffer.from(arr));
  }
  const mp3 = Buffer.concat(buffers);
  if (!mp3.length) throw new Error('Empty HTTP TTS buffer');
  return {
    audioDataUrl: `data:audio/mpeg;base64,${mp3.toString('base64')}`,
    provider: `cloud-tts (${tl})`,
  };
}

export async function generateVoiceAlert({ text, langCode = 'en', apiKey = null, preferGeminiAudio = false }) {
  if (!text || !text.trim()) {
    return { audioDataUrl: null, provider: 'none' };
  }

  const cacheKey = `${langCode}::${preferGeminiAudio && Boolean(apiKey)}::${text.trim().slice(0, 400)}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  let result = null;

  // Tier 1: Gemini Native Audio TTS (when API key & preference active)
  if (apiKey && preferGeminiAudio) {
    try {
      result = await Promise.race([
        synthesizeWithGeminiTTS(text, apiKey),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini TTS timeout')), 10000)),
      ]);
    } catch (err) {
      console.warn('Gemini Native TTS fallback to Neural Indian TTS:', err.message);
    }
  }

  // Tier 2: Microsoft Neural Indian Voices (te-IN, hi-IN, ta-IN, kn-IN, ml-IN, en-IN)
  if (!result) {
    try {
      result = await Promise.race([
        synthesizeWithNeuralEdgeTTS(text, langCode),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Neural TTS timeout')), 7500)),
      ]);
    } catch (err) {
      console.warn('Neural TTS fallback to Cloud HTTP TTS:', err.message);
    }
  }

  // Tier 3: Instant Multilingual Cloud HTTP MP3 Fallback
  if (!result) {
    try {
      result = await Promise.race([
        synthesizeWithGoogleHttpTTS(text, langCode),
        new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP TTS timeout')), 6000)),
      ]);
    } catch (err) {
      console.warn('All server TTS tiers unavailable, using browser Web Speech fallback:', err.message);
      return { audioDataUrl: null, provider: 'web-speech-fallback' };
    }
  }

  if (audioCache.size > 60) {
    const firstKey = audioCache.keys().next().value;
    audioCache.delete(firstKey);
  }
  audioCache.set(cacheKey, result);
  return result;
}

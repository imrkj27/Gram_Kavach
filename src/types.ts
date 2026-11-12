export type VerdictLevel = 'HIGH_RISK_SCAM' | 'SUSPICIOUS' | 'LIKELY_SAFE';

export interface LanguageOption {
  code: string;
  bcp47: string;
  name: string;
  nativeName: string;
}

export interface ScamVerdictData {
  verdict: VerdictLevel;
  verdictBanner: string;
  riskScore: number;
  detectedLanguageCode: string;
  detectedLanguageName: string;
  detectedLanguageNative?: string;
  headline: string;
  reasons: string[];
  safetyAdvice: string[];
  transliterationHelper?: string | null;
  spokenScript: string;
  audioDataUrl?: string | null;
  isLoadingAudio?: boolean;
  ttsProvider?: string;
  qrDetected?: string | null;
  extractedUrls?: string[];
  coreAnalysis?: unknown;
  engine?: string;
  fallbackWarning?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  readStatus?: 'sent' | 'delivered' | 'read';
  // User content
  text?: string;
  imagePreviewUrl?: string;
  imageName?: string;
  userAudioUrl?: string;
  userAudioDuration?: number;
  voiceTranscript?: string;
  // Bot content
  isWelcome?: boolean;
  verdictData?: ScamVerdictData;
  isTranslating?: boolean;
}

export interface SampleCase {
  id: string;
  badge: string;
  badgeColor: 'red' | 'amber' | 'green' | 'teal';
  title: string;
  subtitle: string;
  languageTag: string;
  text?: string;
  sampleImageUrl?: string;
  sampleImageName?: string;
}

export interface EngineStatus {
  ok: boolean;
  appName: string;
  geminiConfigured: boolean;
  maskedKey: string | null;
  preferGeminiAudio: boolean;
  engineMode: 'gemini-2.5-flash' | 'gram-kawach-shield';
  supportedLanguages: LanguageOption[];
}

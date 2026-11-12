import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  CheckCheck,
  Check,
  ExternalLink,
  Languages,
  QrCode,
  PhoneCall,
  Sparkles,
  Loader2,
  Share2,
} from 'lucide-react';
import { ChatMessage, SampleCase } from '../types';
import { QUICK_TRANSLATE_PILLS } from '../data/samples';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface MessageBubbleProps {
  message: ChatMessage;
  onImageClick: (url: string, title?: string) => void;
  onTranslateMessage: (messageId: string, targetLangCode: string) => void;
  onRunSample?: (sample: SampleCase) => void;
  starterSamples?: SampleCase[];
  autoPlayVoice?: boolean;
}

function extractFirstUrl(text?: string): { raw: string; host: string; insecure: boolean } | null {
  if (!text) return null;
  const match = text.match(/(?:https?:\/\/|www\.)[^\s<>'")\]]+/i);
  if (!match) return null;
  const raw = match[0].replace(/[.,!?;:]+$/, '');
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return {
      raw,
      host: u.hostname,
      insecure: u.protocol === 'http:',
    };
  } catch {
    return null;
  }
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onImageClick,
  onTranslateMessage,
  onRunSample,
  starterSamples = [],
  autoPlayVoice = false,
}) => {
  const [copiedToast, setCopiedToast] = useState(false);
  const isUser = message.sender === 'user';

  // ==================== OUTGOING USER BUBBLE (#DCF8C6) ====================
  if (isUser) {
    const urlPreview = extractFirstUrl(message.text);

    return (
      <div className="flex justify-end mb-3 px-2.5 sm:px-4 group">
        <div className="relative max-w-[88%] sm:max-w-[76%] bg-[#DCF8C6] text-[#111B21] rounded-xl rounded-tr-none shadow-[0_1px_1px_rgba(11,20,26,0.14)] px-2.5 pt-2 pb-1.5">
          {/* WhatsApp right bubble tail */}
          <svg
            viewBox="0 0 8 13"
            width="8"
            height="13"
            className="absolute -right-[7px] top-0 text-[#DCF8C6] fill-current"
          >
            <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
          </svg>

          {/* Attached Screenshot Preview */}
          {message.imagePreviewUrl && (
            <div className="mb-1.5 overflow-hidden rounded-lg border border-black/10 bg-black/5">
              <img
                src={message.imagePreviewUrl}
                alt={message.imageName || 'Uploaded screenshot'}
                onClick={() => onImageClick(message.imagePreviewUrl!, message.imageName)}
                className="max-h-60 w-full object-cover cursor-zoom-in active:opacity-90 transition"
              />
            </div>
          )}

          {/* Automatic Link Preview Card inside Outgoing Bubble */}
          {urlPreview && (
            <div className="mb-1.5 rounded-md bg-[#cfeab8] border-l-4 border-[#075E54] px-2.5 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#075E54] truncate flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {urlPreview.host}
                </span>
                {urlPreview.insecure && (
                  <span className="px-1.5 py-0.5 rounded bg-red-600/15 text-red-800 font-semibold text-[10px] shrink-0">
                    HTTP
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#3B4A54] truncate mt-0.5">{urlPreview.raw}</p>
            </div>
          )}

          {/* Outgoing Voice Note */}
          {message.userAudioUrl && (
            <div className="min-w-[220px] sm:min-w-[265px]">
              <VoiceNotePlayer
                messageId={message.id}
                audioUrl={message.userAudioUrl}
                spokenText={message.voiceTranscript || ''}
                isOutgoingUserNote
                initialDuration={message.userAudioDuration}
              />
              {message.voiceTranscript && (
                <p className="text-xs italic text-[#3B4A54] mt-1.5 px-0.5">
                  “{message.voiceTranscript}”
                </p>
              )}
            </div>
          )}

          {/* User Text */}
          {message.text && (
            <p className="text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words px-0.5">
              {message.text}
            </p>
          )}

          {/* Timestamp + Blue Double-Check Read Ticks */}
          <div className="flex items-center justify-end gap-1 mt-1 select-none">
            <span className="text-[11px] text-[#667781]">{message.timestamp}</span>
            {message.readStatus === 'sent' ? (
              <Check className="w-3.5 h-3.5 text-[#667781]" />
            ) : (
              <CheckCheck
                className={`w-4 h-4 ${
                  message.readStatus === 'read' ? 'text-[#53BDEB]' : 'text-[#667781]'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== INCOMING WELCOME BUBBLE (#FFFFFF) ====================
  if (message.isWelcome) {
    return (
      <div className="flex justify-start mb-3.5 px-2.5 sm:px-4">
        <div className="relative w-full max-w-[94%] sm:max-w-[84%] bg-white text-[#111B21] rounded-xl rounded-tl-none shadow-[0_1px_1.5px_rgba(11,20,26,0.14)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#075E54] to-[#0b7a6d] text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-5 h-5 text-[#25D366] shrink-0" />
              <span className="font-bold text-[13.5px] sm:text-sm tracking-wide truncate">
                నమస్కారం • नमस्ते • Gram Kawach!
              </span>
            </div>
            <span className="shrink-0 text-[10.5px] bg-white/15 px-2 py-0.5 rounded-full font-medium">
              Gemini AI Live
            </span>
          </div>

          <div className="p-3 sm:p-3.5 space-y-2.5 text-[13.8px] sm:text-[14px] leading-relaxed text-[#111B21]">
            <p>
              Forward any suspicious link, SMS, UPI screenshot, camera photo, or voice query to{' '}
              <strong>Gram Kawach</strong> before clicking or paying:
            </p>

            <div className="grid grid-cols-2 gap-1.5 text-[12px] sm:text-[12.5px]">
              <div className="bg-[#F0F7F4] border border-[#D4EBE2] rounded-lg px-2.5 py-1.5">
                🔗 <strong>Links &amp; .APK:</strong> Fake bank/KYC traps
              </div>
              <div className="bg-[#F0F7F4] border border-[#D4EBE2] rounded-lg px-2.5 py-1.5">
                📷 <strong>Camera / QR:</strong> Scan QR &amp; receipts
              </div>
              <div className="bg-[#F0F7F4] border border-[#D4EBE2] rounded-lg px-2.5 py-1.5">
                🗣️ <strong>Voice Alerts:</strong> తెలుగు, हिंदी, தமிழ், EN
              </div>
              <div className="bg-[#F0F7F4] border border-[#D4EBE2] rounded-lg px-2.5 py-1.5">
                ✍️ <strong>Tenglish:</strong> Ask <em>&ldquo;idi scam aa?&rdquo;</em>
              </div>
            </div>

            {starterSamples.length > 0 && onRunSample && (
              <div className="pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#54656F] mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
                  Tap a sample scam to test live:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {starterSamples.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onRunSample(s)}
                      className="text-left text-xs bg-[#E7F8F0] hover:bg-[#d2f2e3] active:scale-[0.98] text-[#075E54] font-semibold px-2.5 py-1.5 rounded-full border border-[#00A884]/30 transition cursor-pointer"
                    >
                      {s.badge}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <span className="text-[11px] text-[#667781]">{message.timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== INCOMING BOT SCAM VERDICT BUBBLE (#FFFFFF) ====================
  const v = message.verdictData;
  if (!v) return null;

  const bannerTheme =
    v.verdict === 'HIGH_RISK_SCAM'
      ? {
          headerBg: 'bg-[#DC2626]',
          softBg: 'bg-[#FEF2F2]',
          softBorder: 'border-[#FECACA]',
          accentText: 'text-[#991B1B]',
          meterColor: 'bg-[#DC2626]',
          bulletDot: 'bg-[#DC2626]',
          Icon: ShieldAlert,
        }
      : v.verdict === 'SUSPICIOUS'
        ? {
            headerBg: 'bg-[#D97706]',
            softBg: 'bg-[#FFFBEB]',
            softBorder: 'border-[#FDE68A]',
            accentText: 'text-[#92400E]',
            meterColor: 'bg-[#D97706]',
            bulletDot: 'bg-[#D97706]',
            Icon: AlertTriangle,
          }
        : {
            headerBg: 'bg-[#16A34A]',
            softBg: 'bg-[#F0FDF4]',
            softBorder: 'border-[#BBF7D0]',
            accentText: 'text-[#166534]',
            meterColor: 'bg-[#16A34A]',
            bulletDot: 'bg-[#16A34A]',
            Icon: ShieldCheck,
          };

  const VerdictIcon = bannerTheme.Icon;
  const shareText = `🛡️ *Gram Kawach Scam Alert*\n*Verdict:* ${v.verdictBanner}\n${v.headline}\n\n${v.safetyAdvice
    .map((a) => `✅ ${a}`)
    .join('\n')}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gram Kawach Safety Alert', text: shareText });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {
      // ignore
    }
  };

  const whatsappForwardHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex justify-start mb-3.5 px-2.5 sm:px-4">
      <div className="relative w-full max-w-[95%] sm:max-w-[84%] bg-white text-[#111B21] rounded-xl rounded-tl-none shadow-[0_1px_2px_rgba(11,20,26,0.16)] overflow-hidden">
        {/* Top Verdict Banner */}
        <div
          className={`${bannerTheme.headerBg} text-white px-3 sm:px-3.5 py-2.5 flex items-center justify-between gap-2`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <VerdictIcon className="w-5 h-5 shrink-0" />
            <span className="font-extrabold text-[12.5px] sm:text-sm tracking-wide uppercase truncate">
              {v.verdictBanner}
            </span>
          </div>
          <span className="shrink-0 text-[11px] font-bold bg-black/20 px-2 py-0.5 rounded-full tabular-nums">
            Risk {v.riskScore}%
          </span>
        </div>

        <div className="p-3 sm:p-3.5 space-y-2.5 sm:space-y-3">
          {/* Headline */}
          <div className={`${bannerTheme.softBg} ${bannerTheme.softBorder} border rounded-lg px-3 py-2`}>
            <p className={`font-bold text-[14px] sm:text-[14.5px] leading-snug ${bannerTheme.accentText}`}>
              {v.headline}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(6, v.riskScore))}%` }}
                className={`h-full ${bannerTheme.meterColor} transition-all duration-500`}
              />
            </div>
          </div>

          {/* Decoded QR Code Forensics Callout */}
          {v.qrDetected && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-xs text-purple-950 flex items-start gap-2">
              <QrCode className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold block">QR Code Decoded Inside Image:</span>
                <code className="text-[11px] break-all text-purple-800">{v.qrDetected}</code>
              </div>
            </div>
          )}

          {/* Concise Bullet Points */}
          <div className="space-y-1.5">
            {v.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[13.8px] leading-[1.52] text-[#1F2937]">
                <span
                  className={`w-2 h-2 rounded-full ${bannerTheme.bulletDot} shrink-0 mt-[7px]`}
                />
                <span>{reason}</span>
              </div>
            ))}
          </div>

          {/* Actionable Safety Advice */}
          <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#075E54] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
                <span>Safety Advice • రక్షణ సూచనలు</span>
              </span>
              {v.verdict === 'HIGH_RISK_SCAM' && (
                <a
                  href="tel:1930"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 active:bg-red-200 px-2.5 py-0.5 rounded-full transition"
                >
                  <PhoneCall className="w-3 h-3" />
                  Call 1930
                </a>
              )}
            </div>
            <ul className="space-y-1">
              {v.safetyAdvice.map((tip, idx) => (
                <li key={idx} className="text-[13.2px] leading-[1.48] text-[#334155] flex items-start gap-1.5">
                  <span className="text-[#00A884] font-bold shrink-0">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Romanized Transliteration Helper */}
          {v.transliterationHelper && (
            <div className="rounded-md bg-[#E7F8F0] border border-[#B7E4CE] px-2.5 py-1.5 text-[12.5px] text-[#075E54] font-medium">
              💬 {v.transliterationHelper}
            </div>
          )}

          {/* Embedded WhatsApp-Style Voice Note Audio Player */}
          <VoiceNotePlayer
            messageId={message.id}
            audioUrl={v.audioDataUrl}
            isLoadingAudio={v.isLoadingAudio}
            spokenText={v.spokenScript}
            languageCode={v.detectedLanguageCode}
            languageLabel={v.detectedLanguageNative || v.detectedLanguageName}
            autoPlay={autoPlayVoice}
          />

          {/* Mobile-Friendly Language Switcher Strip */}
          <div className="pt-1.5 border-t border-gray-100 space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-[#667781] shrink-0">
                {message.isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A884]" />
                ) : (
                  <Languages className="w-3.5 h-3.5 text-[#075E54]" />
                )}
                Speak in:
              </span>
              {QUICK_TRANSLATE_PILLS.map((lang) => {
                const active = v.detectedLanguageCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={message.isTranslating || active}
                    onClick={() => onTranslateMessage(message.id, lang.code)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#075E54] text-white shadow-xs'
                        : 'bg-gray-100 hover:bg-[#E7F8F0] active:bg-[#d3f2e3] text-[#3B4A54]'
                    } disabled:opacity-75`}
                  >
                    {lang.nativeName}
                  </button>
                );
              })}
            </div>

            {/* Bottom Meta + Mobile WhatsApp Share Row */}
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#667781]">
              <div className="flex items-center gap-2">
                <a
                  href={whatsappForwardHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F8F0] text-[#075E54] font-semibold hover:bg-[#d2f2e3] transition"
                >
                  WhatsApp Family
                </a>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1 text-[#075E54] font-medium hover:underline cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  {copiedToast ? 'Copied!' : 'Share'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {v.engine && v.engine.startsWith('gemini') && (
                  <span className="text-[10px] text-[#00A884] font-semibold">⚡ Gemini AI</span>
                )}
                <span>{message.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

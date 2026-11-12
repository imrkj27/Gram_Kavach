import React, { useEffect, useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { EngineStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: EngineStatus | null;
  onStatusUpdated: () => void;
  autoPlayVoice: boolean;
  onToggleAutoPlayVoice: (val: boolean) => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
  autoPlayVoice,
  onToggleAutoPlayVoice,
  canInstallPwa,
  onInstallPwa,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [useGeminiNativeAudio, setUseGeminiNativeAudio] = useState(
    status?.preferGeminiAudio ?? true
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (typeof status?.preferGeminiAudio === 'boolean') {
      setUseGeminiNativeAudio(status.preferGeminiAudio);
    }
  }, [status?.preferGeminiAudio]);

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const keyPayload = apiKeyInput.trim() || (status?.geminiConfigured ? '__KEEP__' : '');
      const resp = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyPayload,
          useGeminiNativeAudio,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }
      setFeedback({ type: 'ok', text: data.message });
      setApiKeyInput('');
      onStatusUpdated();
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to verify Gemini API key',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectKey = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const resp = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      });
      const data = await resp.json();
      setFeedback({ type: 'ok', text: data.message || 'Switched to Built-in Shield.' });
      onStatusUpdated();
    } catch {
      setFeedback({ type: 'err', text: 'Failed to update engine mode' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 bg-[#075E54]">
          <span className="w-10 h-1 rounded-full bg-white/35" />
        </div>

        {/* Header */}
        <div className="bg-[#075E54] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#25D366]" />
            <div>
              <h2 className="font-bold text-base">Gram Kawach AI &amp; Mobile Setup</h2>
              <p className="text-xs text-emerald-100">
                Google Gemini Backend Proxy • Voice • PWA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto safe-sheet-bottom">
          {/* Active Engine Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#075E54] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00A884]" />
                Active Detection Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00A884] text-white">
                {status?.geminiConfigured ? '⚡ Gemini AI Connected' : 'Built-in Shield'}
              </span>
            </div>
            <p className="text-xs text-[#334155] mt-1.5 leading-relaxed">
              {status?.geminiConfigured ? (
                <>
                  Integrated with official <code className="font-mono">@google/genai</code> SDK via
                  backend server proxy (<code className="font-mono">{status.maskedKey}</code>).
                  Multimodal link, screenshot, QR &amp; Gemini Native Voice alerts are active!
                </>
              ) : (
                <>
                  Running <strong>Gram Kawach Multimodal Shield</strong>. Paste a Google Gemini API
                  key below to switch to live Gemini AI.
                </>
              )}
            </p>
          </div>

          {/* Backend Proxy Gemini Key Form */}
          <form onSubmit={handleSaveKey} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-[#075E54]" />
                Google Gemini API Key (Backend Proxy Only)
              </span>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={
                  status?.geminiConfigured
                    ? `Active (${status.maskedKey}) — paste new key to replace`
                    : 'Paste Gemini API key'
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A884]"
              />
            </label>

            <label className="flex items-center gap-2.5 text-xs text-[#334155] cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={useGeminiNativeAudio}
                onChange={(e) => setUseGeminiNativeAudio(e.target.checked)}
                className="w-4 h-4 rounded accent-[#075E54]"
              />
              <span>Use Gemini Native TTS Voice Output (with Indian Neural fallback)</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || (!apiKeyInput.trim() && !status?.geminiConfigured)}
                className="flex-1 bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {apiKeyInput.trim() ? 'Verify & Save Key' : 'Save Audio Preference'}
              </button>
              {status?.geminiConfigured && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDisconnectKey}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Disconnect
                </button>
              )}
            </div>

            {feedback && (
              <div
                className={`rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                {feedback.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </form>

          {/* Voice Auto-Play Setting */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-[#075E54] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#111B21]">Auto-Play Spoken Alerts</p>
                <p className="text-xs text-[#667781]">
                  Automatically speak every scam verdict aloud
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleAutoPlayVoice(!autoPlayVoice)}
              className={`w-12 h-7 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                autoPlayVoice ? 'bg-[#00A884]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  autoPlayVoice ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* PWA Mobile App Install Section */}
          <div className="pt-3 border-t border-gray-200 rounded-xl bg-gray-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#075E54] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#00A884]" />
                Install on Android / iPhone Home Screen
              </span>
              {canInstallPwa && (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className="px-3 py-1 rounded-full bg-[#075E54] text-white text-xs font-semibold hover:bg-[#064e46] cursor-pointer"
                >
                  Install App
                </button>
              )}
            </div>
            <p className="text-xs text-[#54656F] leading-relaxed">
              • <strong>Android (Chrome):</strong> Tap <strong>⋮ → Add to Home screen</strong>
              <br />• <strong>iPhone (Safari):</strong> Tap{' '}
              <strong>Share (↑) → Add to Home Screen</strong> to open Gram Kawach full-screen like
              WhatsApp!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

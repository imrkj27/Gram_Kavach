import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Camera,
  Mic,
  Send,
  Lock,
  Globe,
  MoreVertical,
  Sparkles,
  Trash2,
  X,
  Image as ImageIcon,
  ChevronDown,
  Settings,
  ShieldCheck,
  Smartphone,
  Monitor,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
} from 'lucide-react';
import { ChatMessage, EngineStatus, SampleCase, ScamVerdictData } from './types';
import { LANGUAGE_OPTIONS, SAMPLE_CASES } from './data/samples';
import { MessageBubble } from './components/MessageBubble';
import { SettingsModal } from './components/SettingsModal';
import { SampleDrawer } from './components/SampleDrawer';
import { InstallAppModal } from './components/InstallAppModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function nowTimeStr(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome-msg',
    sender: 'bot',
    timestamp: nowTimeStr(),
    isWelcome: true,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress large 8-15MB mobile camera photos down to crisp <=1280px (~180-280KB)
 * Ensures fast 4G/5G upload, WebP normalization, and Vercel Serverless (<4.5MB) compatibility
 */
async function compressImageForMobile(
  file: File
): Promise<{ dataUrl: string; mimeType: string; name: string }> {
  const rawDataUrl = await blobToDataUrl(file);
  const isStandardFormat = file.type === 'image/png' || file.type === 'image/jpeg';
  if (isStandardFormat && file.size <= 550 * 1024) {
    return {
      dataUrl: rawDataUrl,
      mimeType: file.type,
      name: file.name || 'screenshot.png',
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          dataUrl: rawDataUrl,
          mimeType: file.type || 'image/jpeg',
          name: file.name || 'photo.jpg',
        });
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.84);
      resolve({
        dataUrl: compressed,
        mimeType: 'image/jpeg',
        name: file.name || 'camera-scan.jpg',
      });
    };
    img.onerror = () =>
      resolve({
        dataUrl: rawDataUrl,
        mimeType: file.type || 'image/png',
        name: file.name || 'screenshot.png',
      });
    img.src = rawDataUrl;
  });
}

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [stagedImage, setStagedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const [preferredLanguage, setPreferredLanguage] = useState<string>('auto');
  const [lastDetectedNative, setLastDetectedNative] = useState<string>('Auto');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSampleDrawer, setShowSampleDrawer] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Desktop-only phone frame preview toggle (on actual phones <768px, always native fullscreen)
  const [simulatePhoneOnDesktop, setSimulatePhoneOnDesktop] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStageText, setScanStageText] = useState('Online • Multimodal Scam Protection');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);

  const [autoPlayVoice, setAutoPlayVoice] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean>(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState<boolean>(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micErrorBanner, setMicErrorBanner] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const speechRecRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const shareHandledRef = useRef<boolean>(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/status');
      const d = await r.json();
      if (d?.ok) setEngineStatus(d);
    } catch {
      // ignore initial status error
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Detect Android WebAPK / iOS Standalone mode & capture PWA install prompt
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalonePwa(Boolean(standalone));
    };
    checkStandalone();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setIsStandalonePwa(true);
      setDeferredInstallPrompt(null);
      setShowInstallModal(false);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isAnalyzing, scrollToBottom]);

  // Dynamic Mobile Virtual Keyboard Viewport Sync (Android Chrome & iOS Safari)
  useEffect(() => {
    const updateViewportHeight = () => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
      if (vv && vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
      if (document.activeElement === textareaRef.current) {
        window.setTimeout(() => scrollToBottom('smooth'), 60);
      }
    };

    updateViewportHeight();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateViewportHeight);
    vv?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);
    return () => {
      vv?.removeEventListener('resize', updateViewportHeight);
      vv?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, [scrollToBottom]);

  // Android Hardware / Gesture Back Button handling for open modals & sheets
  const anyOverlayOpen = Boolean(
    showSettingsModal || showSampleDrawer || showInstallModal || lightboxImage
  );

  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    window.history.pushState({ gramKawachModal: true }, '');
    const onPopState = () => {
      setLightboxImage(null);
      setShowSampleDrawer(false);
      setShowSettingsModal(false);
      setShowInstallModal(false);
      setShowAttachMenu(false);
      setShowLangMenu(false);
      setShowMoreMenu(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [anyOverlayOpen]);

  // Auto-expand textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [inputText]);

  const handleChatScroll = () => {
    const container = chatScrollRef.current;
    if (!container) return;
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBottom(distFromBottom > 180);
  };

  // Image file reader + mobile compression helper
  const stageImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const processed = await compressImageForMobile(file);
    setStagedImage(processed);
    setShowAttachMenu(false);
  };

  // Clipboard Ctrl+V screenshot paste support
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await stageImageFile(file);
          return;
        }
      }
    }
  };

  // Drag & drop screenshot support
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await stageImageFile(file);
    }
  };

  // Background async TTS hydration so verdict bubbles appear 3x faster on mobile networks
  const hydrateVoiceForMessage = async (msgId: string, spokenScript: string, langCode: string) => {
    if (!spokenScript?.trim()) return;
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenScript, langCode }),
      });
      const d = await r.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.verdictData
            ? {
                ...m,
                verdictData: {
                  ...m.verdictData,
                  audioDataUrl: d?.audioDataUrl || null,
                  ttsProvider: d?.provider,
                  isLoadingAudio: false,
                },
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.verdictData
            ? { ...m, verdictData: { ...m.verdictData, isLoadingAudio: false } }
            : m
        )
      );
    }
  };

  // Core Send & Multimodal Scam Analysis Pipeline
  const submitAnalysis = async (payload: {
    text?: string;
    image?: { dataUrl: string; mimeType: string; name: string } | null;
    audio?: { dataUrl: string; mimeType: string; duration: number; transcript?: string } | null;
  }) => {
    const trimmedText = (payload.text || '').trim();
    const img = payload.image || null;
    const aud = payload.audio || null;

    if (!trimmedText && !img && !aud) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp: nowTimeStr(),
      readStatus: 'delivered',
      text: trimmedText || undefined,
      imagePreviewUrl: img?.dataUrl,
      imageName: img?.name,
      userAudioUrl: aud?.dataUrl,
      userAudioDuration: aud?.duration,
      voiceTranscript: aud?.transcript,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setStagedImage(null);
    setIsAnalyzing(true);
    setScanStageText(
      img
        ? 'Gemini scanning image & QR...'
        : aud
          ? 'Gemini analyzing voice note...'
          : 'Gemini checking fraud signals...'
    );

    // Mark user bubble read with blue double-check ticks after 450ms
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsgId ? { ...m, readStatus: 'read' } : m))
      );
    }, 450);

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText,
          voiceTranscript: aud?.transcript || '',
          imageBase64: img?.dataUrl || null,
          imageMimeType: img?.mimeType || 'image/png',
          audioBase64: aud?.dataUrl || null,
          audioMimeType: aud?.mimeType || 'audio/webm',
          preferredLanguage,
          skipInlineAudio: true,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Failed to analyze message');
      }

      const botMsgId = `bot-${Date.now()}`;
      const verdictData: ScamVerdictData = {
        verdict: data.verdict,
        verdictBanner: data.verdictBanner,
        riskScore: data.riskScore,
        detectedLanguageCode: data.detectedLanguageCode,
        detectedLanguageName: data.detectedLanguageName,
        detectedLanguageNative: data.detectedLanguageNative,
        headline: data.headline,
        reasons: data.reasons || [],
        safetyAdvice: data.safetyAdvice || [],
        transliterationHelper: data.transliterationHelper,
        spokenScript: data.spokenScript,
        audioDataUrl: data.audioDataUrl || null,
        isLoadingAudio: !data.audioDataUrl && Boolean(data.spokenScript),
        ttsProvider: data.ttsProvider,
        qrDetected: data.qrDetected,
        extractedUrls: data.extractedUrls,
        coreAnalysis: data.coreAnalysis,
        engine: data.engine,
        fallbackWarning: data.fallbackWarning,
      };

      if (data.detectedLanguageNative) {
        setLastDetectedNative(data.detectedLanguageNative);
      }

      const botReply: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        timestamp: nowTimeStr(),
        verdictData,
      };

      setMessages((prev) => [...prev, botReply]);
      setIsAnalyzing(false);
      setScanStageText('Online • Multimodal Scam Protection');

      if (!data.audioDataUrl && data.spokenScript) {
        void hydrateVoiceForMessage(
          botMsgId,
          data.spokenScript,
          data.detectedLanguageCode || 'en'
        );
      }
      return;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unable to reach scam analyzer.';
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          timestamp: nowTimeStr(),
          verdictData: {
            verdict: 'SUSPICIOUS',
            verdictBanner: 'CONNECTION NOTICE',
            riskScore: 50,
            detectedLanguageCode: 'en',
            detectedLanguageName: 'English',
            detectedLanguageNative: 'English',
            headline: `Analysis interrupted: ${errMsg}`,
            reasons: ['Please try sending the link, message, or screenshot once again.'],
            safetyAdvice: ['Never click unknown links or share OTPs while verifying.'],
            spokenScript: 'Please try sending your message again. Never share your OTP or UPI PIN.',
          },
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      setScanStageText('Online • Multimodal Scam Protection');
    }
  };

  // Handle Android Web Share Target (?text=...&url=...) & Home Screen App Shortcuts (?action=...)
  useEffect(() => {
    if (shareHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sharedTitle = params.get('title') || '';
    const sharedText = params.get('text') || '';
    const sharedUrl = params.get('url') || '';
    const shortcutAction = params.get('action') || '';

    if (sharedText || sharedUrl || sharedTitle || shortcutAction) {
      shareHandledRef.current = true;
      window.history.replaceState({}, '', window.location.pathname);

      if (shortcutAction === 'samples') {
        setShowSampleDrawer(true);
      } else if (shortcutAction === 'scan') {
        setShowAttachMenu(true);
      } else {
        const combined = [sharedTitle, sharedText, sharedUrl]
          .map((s) => s.trim())
          .filter(Boolean)
          .join('\n');
        if (combined) {
          void submitAnalysis({ text: combined });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnalyzing) return;
    await submitAnalysis({
      text: inputText,
      image: stagedImage,
    });
  };

  // Run a Sample Case (loads screenshot if present and submits immediately)
  const handleRunSample = async (sample: SampleCase) => {
    if (isAnalyzing) return;
    let imgPayload: { dataUrl: string; mimeType: string; name: string } | null = null;

    if (sample.sampleImageUrl) {
      try {
        const res = await fetch(sample.sampleImageUrl);
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        imgPayload = {
          dataUrl,
          mimeType: blob.type || 'image/png',
          name: sample.sampleImageName || 'sample-screenshot.png',
        };
      } catch (err) {
        console.warn('Could not load sample image:', err);
      }
    }

    await submitAnalysis({
      text: sample.text || '',
      image: imgPayload,
    });
  };

  // One-tap translation of any incoming bot verdict bubble + voice note!
  const handleTranslateMessage = async (messageId: string, targetLangCode: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg?.verdictData) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isTranslating: true } : m))
    );

    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdictData: targetMsg.verdictData,
          targetLangCode,
          skipInlineAudio: true,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        if (data.detectedLanguageNative) {
          setLastDetectedNative(data.detectedLanguageNative);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTranslating: false,
                  verdictData: {
                    ...m.verdictData!,
                    ...data,
                    audioDataUrl: data.audioDataUrl || null,
                    isLoadingAudio: !data.audioDataUrl && Boolean(data.spokenScript),
                  },
                }
              : m
          )
        );
        if (!data.audioDataUrl && data.spokenScript) {
          void hydrateVoiceForMessage(messageId, data.spokenScript, targetLangCode);
        }
      } else {
        throw new Error(data.error || 'Translation failed');
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isTranslating: false } : m))
      );
    }
  };

  // ==================== MICROPHONE VOICE RECORDING ====================
  const startVoiceRecording = async () => {
    setMicErrorBanner(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicErrorBanner(
        'Microphone access is blocked in this view. Tap "Test Voice" or type below!'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
          : new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      } catch {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      }

      recordedChunksRef.current = [];
      liveTranscriptRef.current = '';
      setLiveTranscript('');
      setRecordingSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setScanStageText('recording voice note...');

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          const chosenLang = LANGUAGE_OPTIONS.find((l) => l.code === preferredLanguage);
          rec.lang =
            chosenLang && chosenLang.bcp47 !== 'auto' ? chosenLang.bcp47 : 'en-IN';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let textAcc = '';
            for (let i = 0; i < event.results.length; i++) {
              textAcc += event.results[i][0].transcript + ' ';
            }
            liveTranscriptRef.current = textAcc.trim();
            setLiveTranscript(liveTranscriptRef.current);
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // ignore speech recognition unsupported error
        }
      }
    } catch {
      setMicErrorBanner(
        'Microphone permission denied. Allow mic access or tap "Test Voice"!'
      );
    }
  };

  const cleanupRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setScanStageText('Online • Multimodal Scam Protection');
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
    setLiveTranscript('');
  };

  const finishAndSendVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    const durationSec = Math.max(1, recordingSeconds);
    if (!recorder) return;

    recorder.onstop = async () => {
      const mime = recorder.mimeType || 'audio/webm';
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      const transcript = liveTranscriptRef.current;
      cleanupRecording();
      setLiveTranscript('');
      if (blob.size > 0) {
        const dataUrl = await blobToDataUrl(blob);
        await submitAnalysis({
          audio: {
            dataUrl,
            mimeType: mime,
            duration: durationSec,
            transcript: transcript || undefined,
          },
        });
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleInstallPwa = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const activeLangOption =
    LANGUAGE_OPTIONS.find((l) => l.code === preferredLanguage) || LANGUAGE_OPTIONS[0];

  const containerSizeClasses = simulatePhoneOnDesktop
    ? 'w-full max-w-[392px] h-full md:h-[min(844px,calc(100dvh-2.25rem))] md:rounded-[2.2rem] md:border-[7px] md:border-[#1E293B]'
    : 'w-full max-w-[780px] h-full sm:h-[calc(100dvh-1.5rem)] sm:rounded-xl border border-black/10';

  return (
    <div
      className="relative app-viewport w-full bg-[#D1D7DB] flex items-center justify-center sm:py-3 sm:px-4 overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* WhatsApp Web Top Teal Background Band on Desktop */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 h-32 bg-[#00A884] z-0" />

      {/* Desktop-Only Phone Frame Preview Toggle */}
      <button
        type="button"
        onClick={() => setSimulatePhoneOnDesktop((v) => !v)}
        title="Preview Smartphone Frame vs Full Responsive View"
        className="hidden md:inline-flex fixed top-3 right-4 z-30 items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#075E54] hover:bg-[#054a42] text-white text-xs font-semibold shadow-lg border border-white/20 transition cursor-pointer"
      >
        {simulatePhoneOnDesktop ? (
          <>
            <Monitor className="w-3.5 h-3.5 text-[#25D366]" />
            Web View
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-[#25D366]" />
            Phone View
          </>
        )}
      </button>

      {/* Main Responsive Mobile / Desktop WhatsApp Container */}
      <main
        className={`relative z-10 bg-[#ECE5DD] shadow-[0_12px_36px_rgba(11,20,26,0.25)] flex flex-col overflow-hidden transition-all duration-200 ${containerSizeClasses}`}
      >
        {/* ==================== TOP HEADER BAR (#075E54 + Safe Notch Inset) ==================== */}
        <header className="bg-[#075E54] text-white px-2.5 sm:px-4 pb-2.5 safe-top flex items-center justify-between gap-1.5 shrink-0 shadow-sm z-20">
          {/* Left: Shield + Checkmark Avatar + Gram Kawach + Verified Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#128C7E] to-[#054640] ring-2 ring-[#25D366]/80 flex items-center justify-center shrink-0 shadow">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  fill="#25D366"
                  fillOpacity="0.28"
                />
                <path d="m9 12 2 2 4-4" stroke="#ffffff" strokeWidth="2.4" />
              </svg>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#25D366] ring-2 ring-[#075E54]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-[15px] sm:text-base tracking-tight truncate">
                  Gram Kawach
                </h1>
                {/* Verified Green Badge */}
                <span
                  title="Verified AI Scam Guard"
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#25D366] text-[#075E54] shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.2">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <p className="text-[11px] sm:text-[11.5px] text-[#D9FDD3] truncate">
                {scanStageText}
              </p>
            </div>
          </div>

          {/* Right: Language Pill + Install + Samples + Settings + Menu */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Language Indicator Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu((v) => !v);
                  setShowMoreMenu(false);
                }}
                title="Language Detection & Override"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full bg-white/15 active:bg-white/25 hover:bg-white/20 text-[11.5px] font-semibold transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span className="max-w-[64px] sm:max-w-[96px] truncate">
                  {preferredLanguage === 'auto'
                    ? lastDetectedNative !== 'Auto'
                      ? lastDetectedNative
                      : 'Auto'
                    : activeLangOption.nativeName}
                </span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-[#111B21] rounded-xl shadow-xl border border-gray-200 py-1.5 z-40">
                  <div className="px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#667781]">
                    Reply &amp; Voice Language
                  </div>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setPreferredLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 active:bg-emerald-50 cursor-pointer ${
                        preferredLanguage === lang.code ? 'font-bold text-[#075E54] bg-emerald-50/70' : ''
                      }`}
                    >
                      <span>
                        {lang.nativeName}{' '}
                        {lang.code !== 'auto' && lang.code !== 'en' ? `(${lang.name})` : ''}
                      </span>
                      {preferredLanguage === lang.code && (
                        <span className="text-[#00A884] font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 1-Tap Android / Mobile Install App Button (hidden once installed) */}
            {!isStandalonePwa && (
              <button
                type="button"
                onClick={handleInstallPwa}
                title="Install Android / Mobile Web App"
                className="w-9 h-9 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-full hover:bg-white/15 active:bg-white/25 text-[#D9FDD3] text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#25D366]" />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}

            {/* Quick Sample Scams Button */}
            <button
              type="button"
              onClick={() => setShowSampleDrawer(true)}
              title="Try Sample Scams"
              className="w-9 h-9 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#D9FDD3] text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#25D366]" />
              <span className="hidden sm:inline">Samples</span>
            </button>

            {/* AI Engine / Gemini Key Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="Gemini AI & Mobile Settings"
              className="relative w-9 h-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-[#075E54] ${
                  engineStatus?.geminiConfigured ? 'bg-[#25D366]' : 'bg-amber-300'
                }`}
              />
            </button>

            {/* More Menu (⋮) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu((v) => !v);
                  setShowLangMenu(false);
                }}
                aria-label="More options"
                className="w-9 h-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center transition cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-[#111B21] rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowInstallModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-[#075E54]" />
                    <span>Install Android / iOS App</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoPlayVoice((v) => !v);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    {autoPlayVoice ? (
                      <Volume2 className="w-4 h-4 text-[#00A884]" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-500" />
                    )}
                    <span>Auto-Play Voice: {autoPlayVoice ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-gray-100 flex items-center gap-2.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#075E54]" />
                    <span>Gemini API Key &amp; Engine</span>
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([createWelcomeMessage()]);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile-Only 1-Tap Android Web App Install Strip (auto-hidden once installed or dismissed) */}
        {!isStandalonePwa && !installBannerDismissed && (
          <div className="sm:hidden bg-[#E7F8F0] border-b border-[#CBEAD9] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallPwa}
              className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-[#075E54] shrink-0" />
              <span className="text-[11.5px] font-semibold text-[#075E54] truncate">
                Add Gram Kawach to your Android Home Screen
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleInstallPwa}
                className="px-2.5 py-1 rounded-full bg-[#075E54] active:bg-[#054640] text-white text-[11px] font-bold cursor-pointer"
              >
                Install
              </button>
              <button
                type="button"
                onClick={() => setInstallBannerDismissed(true)}
                aria-label="Dismiss install banner"
                className="p-1 text-[#54656F] active:text-[#111B21] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== CHAT AREA (#ECE5DD + Doodle Wallpaper) ==================== */}
        <section
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          onClick={() => {
            setShowLangMenu(false);
            setShowMoreMenu(false);
            setShowAttachMenu(false);
          }}
          className="relative flex-1 overflow-y-auto overflow-x-hidden wa-chat-bg wa-scrollbar py-2.5"
        >
          {/* Drag & Drop Screenshot Overlay */}
          {isDraggingOver && (
            <div className="sticky top-2 mx-3 z-30 rounded-2xl bg-[#075E54]/95 text-white p-5 text-center border-2 border-dashed border-[#25D366] shadow-xl">
              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-[#25D366]" />
              <p className="font-bold text-sm">Drop Screenshot / UPI QR Image Here</p>
              <p className="text-xs text-emerald-100">
                Gemini AI will inspect logos, QR codes, text &amp; phishing links
              </p>
            </div>
          )}

          {/* Pinned End-to-End Safety Banner at Top */}
          <div className="px-2.5 sm:px-6 mb-2.5">
            <div className="mx-auto max-w-xl bg-[#FFEECD]/95 border border-[#F3D999] text-[#54656F] rounded-lg px-2.5 py-1.5 text-[11px] sm:text-[11.5px] leading-snug text-center shadow-xs flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#075E54] shrink-0" />
              <span>
                <strong>End-to-End Safety Shield:</strong> Never share your OTP or UPI PIN. Forward
                suspicious links, SMS, or screenshots here first.
              </span>
            </div>
          </div>

          {/* WhatsApp Date Pill */}
          <div className="flex justify-center mb-3">
            <span className="bg-white/90 text-[#54656F] text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
              Today
            </span>
          </div>

          {/* Message List */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onImageClick={(url, title) => setLightboxImage({ url, title })}
              onTranslateMessage={handleTranslateMessage}
              onRunSample={handleRunSample}
              starterSamples={SAMPLE_CASES.slice(0, 4)}
              autoPlayVoice={autoPlayVoice && msg.id === messages[messages.length - 1]?.id}
            />
          ))}

          {/* Incoming Bot Typing / Fraud Scanning Bubble */}
          {isAnalyzing && (
            <div className="flex justify-start mb-3 px-2.5 sm:px-4">
              <div className="bg-white rounded-xl rounded-tl-none shadow px-3.5 py-2.5 flex items-center gap-2.5 border border-emerald-100">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce [animation-delay:-0.25s]" />
                  <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce [animation-delay:-0.12s]" />
                  <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce" />
                </div>
                <span className="text-xs font-medium text-[#54656F]">
                  Gram Kawach: {scanStageText}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </section>

        {/* Floating Scroll-to-Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Scroll to newest message"
            className="absolute right-3.5 bottom-24 z-20 w-9 h-9 rounded-full bg-white text-[#54656F] shadow-md border border-gray-200 flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        {/* Microphone Permission Notice Banner (if denied) */}
        {micErrorBanner && (
          <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 flex items-center justify-between gap-2 text-xs text-amber-900">
            <span className="truncate">🎤 {micErrorBanner}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMicErrorBanner(null);
                  submitAnalysis({
                    text: 'ఇప్పుడే నాకు బ్యాంక్ మేనేజర్ అని చెప్పి ఫోన్ చేసి ఆధార్ మరియు OTP అడుగుతున్నారు, ఇది నిజమేనా?',
                  });
                }}
                className="px-2.5 py-1 rounded-full bg-[#075E54] text-white font-semibold cursor-pointer"
              >
                Test తెలుగు Voice
              </button>
              <button
                type="button"
                onClick={() => setMicErrorBanner(null)}
                className="p-1 text-amber-800 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Staged Screenshot / Camera Photo Preview Tray Before Sending */}
        {stagedImage && (
          <div className="bg-[#E9EDEF] border-t border-gray-300 px-3 py-2 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={stagedImage.dataUrl}
                alt={stagedImage.name}
                className="w-12 h-12 rounded-lg object-cover border-2 border-[#00A884] shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111B21] truncate">{stagedImage.name}</p>
                <p className="text-[11px] text-[#54656F] truncate">
                  Ready for Gemini QR &amp; scam check • Tap Send
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStagedImage(null)}
              aria-label="Remove attached image"
              className="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-xs flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================== BOTTOM INPUT BAR (#F0F0F0 + Safe Home Bar Inset) ==================== */}
        <footer className="bg-[#F0F0F0] px-2 sm:px-3 pt-1.5 safe-bottom border-t border-black/5 shrink-0 z-20">
          {/* Hidden Inputs for Gallery Upload & Mobile Rear Camera Capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) stageImageFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) stageImageFile(f);
              e.target.value = '';
            }}
          />

          {isRecording ? (
            /* Live WhatsApp Voice Note Recording Bar */
            <div className="flex items-center justify-between gap-2 bg-white rounded-full px-3 py-1.5 shadow-xs border border-red-200">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                title="Cancel recording"
                className="w-10 h-10 rounded-full text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                <span className="font-mono font-bold text-sm text-red-600 tabular-nums shrink-0">
                  {Math.floor(recordingSeconds / 60)}:
                  {String(recordingSeconds % 60).padStart(2, '0')}
                </span>
                <p className="text-xs text-[#54656F] truncate">
                  {liveTranscript || 'Listening... Speak in Telugu, Hindi, Tamil or English'}
                </p>
              </div>

              <button
                type="button"
                onClick={finishAndSendVoiceRecording}
                title="Send voice note"
                className="w-11 h-11 rounded-full bg-[#00A884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shadow transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          ) : (
            /* Mobile-Optimized Multimodal Input Bar */
            <form onSubmit={handleFormSubmit} className="flex items-end gap-1.5">
              {/* Rounded White Input Pill containing Attach + Textarea + Camera (just like Mobile WhatsApp!) */}
              <div className="relative flex-1 bg-white rounded-[24px] pl-1.5 pr-2 py-1 shadow-[0_1px_1px_rgba(0,0,0,0.06)] border border-gray-200/90 focus-within:border-[#00A884] flex items-end gap-1 min-w-0">
                {/* Attachment Button (Paperclip) */}
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((v) => !v)}
                  title="Attach Screenshot or Sample"
                  className="w-9 h-9 rounded-full text-[#54656F] hover:bg-black/5 active:bg-black/10 flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Attachment Popover Sheet */}
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-40 space-y-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F0F7F4] active:bg-[#e1f3eb] flex items-center gap-2.5 text-sm font-medium text-[#111B21] cursor-pointer"
                    >
                      <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="block font-semibold text-xs">Camera / Scan QR</span>
                        <span className="block text-[10.5px] text-[#667781]">
                          Snap QR code, receipt or notice
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F0F7F4] active:bg-[#e1f3eb] flex items-center gap-2.5 text-sm font-medium text-[#111B21] cursor-pointer"
                    >
                      <span className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="block font-semibold text-xs">Photo &amp; Screenshot Gallery</span>
                        <span className="block text-[10.5px] text-[#667781]">
                          JPG, PNG, WebP from phone
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowSampleDrawer(true);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F0F7F4] active:bg-[#e1f3eb] flex items-center gap-2.5 text-sm font-medium text-[#111B21] cursor-pointer"
                    >
                      <span className="w-9 h-9 rounded-full bg-emerald-100 text-[#075E54] flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="block font-semibold text-xs">Sample Scam Gallery</span>
                        <span className="block text-[10.5px] text-[#667781]">
                          UPI QR, తెలుగు SMS, Hindi Warrant
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Auto-Expanding Textarea (16px on mobile prevents iOS Safari auto-zoom!) */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onPaste={handlePaste}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 640) {
                      e.preventDefault();
                      handleFormSubmit();
                    }
                  }}
                  placeholder="Paste link, SMS, or screenshot..."
                  className="flex-1 resize-none bg-transparent py-1.5 text-[16px] sm:text-[14.5px] text-[#111B21] placeholder-[#667781] focus:outline-none max-h-28 leading-snug block min-w-0"
                />

                {/* Direct Mobile Camera Button (shown when input is short, just like real WhatsApp!) */}
                {!inputText.trim() && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    title="Open Phone Camera / Scan QR"
                    className="w-9 h-9 rounded-full text-[#54656F] hover:bg-black/5 active:bg-black/10 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Microphone Voice Recording Button (44px Touch Target) */}
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={isAnalyzing}
                title="Record Voice Note"
                className="w-11 h-11 rounded-full bg-white hover:bg-emerald-50 active:scale-95 text-[#075E54] border border-gray-200 flex items-center justify-center shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* WhatsApp Green Send Button (#00A884 - 44px Touch Target) */}
              <button
                type="submit"
                disabled={isAnalyzing || (!inputText.trim() && !stagedImage)}
                title="Analyze for Scam"
                className="w-11 h-11 rounded-full bg-[#00A884] hover:bg-[#008f6f] active:scale-95 disabled:opacity-45 text-white flex items-center justify-center shadow transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          )}
        </footer>
      </main>

      {/* Fullscreen Screenshot Lightbox Viewer */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-2xl w-full flex items-center justify-between text-white mb-2 px-1 safe-top">
            <span className="text-sm font-medium truncate">
              {lightboxImage.title || 'Screenshot Preview'}
            </span>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.title || 'Preview'}
            className="max-h-[80dvh] max-w-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Engine & Gemini API Key Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        status={engineStatus}
        onStatusUpdated={fetchStatus}
        autoPlayVoice={autoPlayVoice}
        onToggleAutoPlayVoice={setAutoPlayVoice}
        canInstallPwa={!isStandalonePwa}
        onInstallPwa={() => {
          setShowSettingsModal(false);
          void handleInstallPwa();
        }}
      />

      {/* Sample Scam Scenarios Drawer */}
      <SampleDrawer
        isOpen={showSampleDrawer}
        onClose={() => setShowSampleDrawer(false)}
        onSelectSample={handleRunSample}
      />

      {/* Android & Mobile Web App Installation Guide Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        canInstallNative={Boolean(deferredInstallPrompt)}
        isStandalone={isStandalonePwa}
        onTriggerInstall={handleInstallPwa}
      />
    </div>
  );
};

export default App;

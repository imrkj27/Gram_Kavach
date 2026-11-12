import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Mic, Volume2, Loader2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  messageId: string;
  audioUrl?: string | null;
  isLoadingAudio?: boolean;
  spokenText?: string;
  languageCode?: string;
  languageLabel?: string;
  isOutgoingUserNote?: boolean;
  initialDuration?: number;
  autoPlay?: boolean;
}

const LANG_BCP47: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  messageId,
  audioUrl,
  isLoadingAudio = false,
  spokenText = '',
  languageCode = 'en',
  languageLabel,
  isOutgoingUserNote = false,
  initialDuration,
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveContainerRef = useRef<HTMLDivElement | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const [playQueued, setPlayQueued] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(
    initialDuration || Math.max(8, Math.min(35, Math.round((spokenText.length || 120) / 13)))
  );
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  // Deterministic realistic 34-bar WhatsApp voice waveform (fits narrow 320px-390px phone screens cleanly)
  const bars = useMemo(() => {
    const seedStr = `${messageId}-${spokenText.slice(0, 32)}`;
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Array.from({ length: 34 }, (_, idx) => {
      const n = Math.abs(Math.sin(hash + idx * 0.73) * 0.65 + Math.cos(idx * 0.41) * 0.35);
      return Math.max(22, Math.min(96, Math.round(22 + n * 74)));
    });
  }, [messageId, spokenText]);

  // Stop playback if another voice note starts playing
  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== messageId) {
        stopPlayback(false);
      }
    };
    window.addEventListener('gram-kawach-audio-play', onOtherPlay);
    return () => {
      window.removeEventListener('gram-kawach-audio-play', onOtherPlay);
      stopPlayback(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  // Reload inline audio element when audioUrl changes (e.g. after async TTS or 1-tap language translation)
  useEffect(() => {
    stopPlayback(true);
    const el = audioRef.current;
    if (el && audioUrl) {
      el.load();
      el.playbackRate = speed;
      if (autoPlay || playQueued) {
        setPlayQueued(false);
        window.dispatchEvent(new CustomEvent('gram-kawach-audio-play', { detail: messageId }));
        el.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const stopPlayback = (resetPos = false) => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (resetPos) {
        try {
          audioRef.current.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
    if (fallbackTimerRef.current) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if (resetPos) setCurrentTime(0);
  };

  const togglePlay = async () => {
    if (isLoadingAudio && !audioUrl) {
      setPlayQueued((q) => !q);
      return;
    }
    if (isPlaying) {
      stopPlayback(false);
      return;
    }

    window.dispatchEvent(new CustomEvent('gram-kawach-audio-play', { detail: messageId }));

    if (audioRef.current && audioUrl) {
      try {
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn('Inline HTML5 Audio fallback to Web Speech:', err);
      }
    }

    // Fallback to browser Web Speech API if offline or no audioUrl
    if ('speechSynthesis' in window && spokenText) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(spokenText);
      const bcp = LANG_BCP47[languageCode] || 'en-IN';
      utter.lang = bcp;
      utter.rate = speed === 1 ? 0.96 : speed === 1.5 ? 1.35 : 1.7;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === bcp.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(languageCode.toLowerCase()));
      if (matchedVoice) utter.voice = matchedVoice;

      const estTotal = Math.max(6, Math.round(spokenText.length / (13 * speed)));
      setDuration(estTotal);
      setCurrentTime(0);
      setIsPlaying(true);

      const startedAt = Date.now();
      fallbackTimerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        if (elapsed >= estTotal) {
          setCurrentTime(0);
          setIsPlaying(false);
          if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current);
        } else {
          setCurrentTime(elapsed);
        }
      }, 150);

      utter.onend = () => {
        if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current);
        setIsPlaying(false);
        setCurrentTime(0);
      };
      utter.onerror = () => {
        if (fallbackTimerRef.current) window.clearInterval(fallbackTimerRef.current);
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utter);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  // Touch & pointer scrubbing across waveform on mobile & desktop
  const handleWaveformPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = waveContainerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && duration > 0) {
      const nextTime = ratio * duration;
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return (
    <div
      className={`mt-2.5 rounded-xl px-2.5 sm:px-3 py-2.5 flex items-center gap-2 sm:gap-2.5 border transition-colors ${
        isOutgoingUserNote
          ? 'bg-[#c9efb2]/80 border-[#b2e297]'
          : 'bg-[#F0F4F3] border-[#DCE5E2]'
      }`}
    >
      {/* Inline Mobile-Compatible HTML5 Audio Element (playsInline prevents iOS fullscreen hijack) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          playsInline
          className="hidden"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Play / Pause Button (44x44 touch target on mobile) */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice alert' : 'Play voice alert'}
        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-[#00A884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shrink-0 shadow-sm transition cursor-pointer"
      >
        {isLoadingAudio && !audioUrl ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Touch-Scrubbable Waveform + Timer */}
      <div className="flex-1 min-w-0">
        <div
          ref={waveContainerRef}
          onPointerDown={handleWaveformPointer}
          className="relative flex items-center justify-between gap-[2px] h-8 select-none cursor-pointer touch-none"
        >
          {bars.map((heightPct, idx) => {
            const barRatio = idx / bars.length;
            const played = barRatio <= progressRatio;
            return (
              <span
                key={idx}
                style={{ height: `${heightPct}%`, animationDelay: `${(idx % 6) * 90}ms` }}
                className={`flex-1 max-w-[3.5px] rounded-full transition-colors duration-150 ${
                  played
                    ? 'bg-[#00A884]'
                    : isOutgoingUserNote
                      ? 'bg-[#7fa872]/55'
                      : 'bg-[#94A3B8]/65'
                } ${isPlaying && Math.abs(barRatio - progressRatio) < 0.09 ? 'animate-wave-bar' : ''}`}
              />
            );
          })}

          {/* WhatsApp seeker dot */}
          <span
            style={{ left: `calc(${progressRatio * 100}% - 5px)` }}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#00A884] ring-2 ring-white shadow"
          />
        </div>

        <div className="flex items-center justify-between gap-1 text-[11px] text-[#54656F] mt-0.5">
          <span className="font-medium tabular-nums shrink-0">
            {isPlaying || currentTime > 0
              ? `${formatSeconds(currentTime)} / ${formatSeconds(duration)}`
              : formatSeconds(duration)}
          </span>
          {languageLabel && !isOutgoingUserNote && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#075E54] truncate">
              <Volume2 className="w-3 h-3 text-[#00A884] shrink-0" />
              <span className="truncate">{languageLabel} Voice</span>
            </span>
          )}
        </div>
      </div>

      {/* Speed Toggle (1x / 1.5x / 2x) + Mic Avatar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={cycleSpeed}
          title="Toggle playback speed"
          className="min-w-[38px] h-7 px-2 rounded-full bg-[#DCE6E4] hover:bg-[#cbd9d6] active:scale-95 text-[#111B21] font-bold text-[11px] tabular-nums transition cursor-pointer"
        >
          {speed}x
        </button>

        {!isOutgoingUserNote && (
          <div className="relative w-8 h-8 rounded-full bg-[#075E54] items-center justify-center text-white shrink-0 hidden sm:flex">
            <span className="text-[10px] font-extrabold tracking-tight">GK</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00A884] flex items-center justify-center ring-1 ring-white">
              <Mic className="w-2 h-2 text-white" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

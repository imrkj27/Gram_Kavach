import React from 'react';
import { X, Sparkles, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { SampleCase } from '../types';
import { SAMPLE_CASES } from '../data/samples';

interface SampleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleCase) => void;
}

export const SampleDrawer: React.FC<SampleDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 bg-[#075E54]">
          <span className="w-10 h-1 rounded-full bg-white/35" />
        </div>

        <div className="bg-[#075E54] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#25D366]" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Test Live Gemini Scam Scenarios
              </h2>
              <p className="text-[11.5px] text-emerald-100">
                Links, Tenglish, తెలుగు/हिंदी Screenshots, UPI QR Traps &amp; Voice
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

        <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto safe-sheet-bottom">
          {SAMPLE_CASES.map((s) => {
            const badgeClasses =
              s.badgeColor === 'red'
                ? 'bg-red-100 text-red-800 border-red-200'
                : s.badgeColor === 'amber'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200';

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectSample(s);
                  onClose();
                }}
                className="w-full text-left rounded-xl border border-gray-200 hover:border-[#00A884] active:bg-[#E7F8F0] hover:bg-[#F7FCFA] p-3 transition flex items-center gap-3 group cursor-pointer"
              >
                {s.sampleImageUrl ? (
                  <img
                    src={s.sampleImageUrl}
                    alt={s.title}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[#E7F8F0] border border-[#CBEAD9] flex items-center justify-center text-[#075E54] font-bold text-xs shrink-0 text-center px-1">
                    {s.languageTag}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}
                    >
                      {s.badge}
                    </span>
                    {s.sampleImageUrl && (
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[#54656F] font-medium">
                        <ImageIcon className="w-3 h-3" /> Screenshot
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-[#111B21] truncate">{s.title}</p>
                  <p className="text-xs text-[#667781] line-clamp-1">{s.subtitle}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-[#00A884] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

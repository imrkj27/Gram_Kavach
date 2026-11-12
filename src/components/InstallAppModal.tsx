import React from 'react';
import {
  X,
  Download,
  Smartphone,
  MoreVertical,
  Share2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  canInstallNative: boolean;
  isStandalone: boolean;
  onTriggerInstall: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  canInstallNative,
  isStandalone,
  onTriggerInstall,
}) => {
  if (!isOpen) return null;

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
            <Smartphone className="w-5 h-5 text-[#25D366]" />
            <div>
              <h2 className="font-bold text-base">Install Android &amp; Mobile Web App</h2>
              <p className="text-xs text-emerald-100">
                Full-screen app drawer icon + Android Share Sheet
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
          {/* App Preview Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center gap-3">
            <img
              src="/icons/icon-192.png"
              alt="Gram Kawach App Icon"
              className="w-13 h-13 rounded-2xl shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-[#075E54]">Gram Kawach</h3>
                <ShieldCheck className="w-4 h-4 text-[#00A884] shrink-0" />
              </div>
              <p className="text-xs text-[#334155] leading-relaxed mt-0.5">
                Launches full-screen like WhatsApp, supports rear-camera QR scanning, and appears in
                your Android <strong>Share</strong> menu!
              </p>
            </div>
          </div>

          {isStandalone ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Gram Kawach is already installed and running as a Mobile Web App!</span>
            </div>
          ) : canInstallNative ? (
            <button
              type="button"
              onClick={onTriggerInstall}
              className="w-full py-3 px-4 rounded-xl bg-[#00A884] hover:bg-[#008f6f] active:scale-[0.99] text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install Gram Kawach App Now</span>
            </button>
          ) : null}

          {/* Android Chrome Step-by-Step */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#075E54] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#00A884]" />
              Android Phone (Chrome / Samsung Internet)
            </p>
            <ol className="space-y-2 text-xs text-[#334155] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#075E54] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Open your deployed HTTPS link in <strong>Google Chrome</strong> and tap the{' '}
                  <strong className="inline-flex items-center px-1 py-0.5 bg-white rounded border border-gray-200 align-middle">
                    <MoreVertical className="w-3 h-3" />
                  </strong>{' '}
                  menu at the top-right.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#075E54] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#075E54] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Confirm <strong>Install</strong>. You can now open Gram Kawach from your Android
                  home screen — or tap <strong>Share → Gram Kawach</strong> inside WhatsApp/SMS!
                </span>
              </li>
            </ol>
          </div>

          {/* iPhone Safari Step-by-Step */}
          <div className="rounded-xl border border-gray-200 p-3.5 space-y-1.5">
            <p className="text-xs font-bold text-[#075E54] flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-[#00A884]" />
              iPhone / iPad (Safari)
            </p>
            <p className="text-xs text-[#54656F] leading-relaxed">
              Tap <strong>Share (↑)</strong> at the bottom of Safari, then select{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

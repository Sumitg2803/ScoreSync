import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, PlusSquare, X, MoreVertical, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as any).deferredPwaPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const pEvent = e as BeforeInstallPromptEvent;
      (window as any).deferredPwaPrompt = pEvent;
      setDeferredPrompt(pEvent);
    };

    const handlePromptAvailable = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptToUse) {
      await promptToUse.prompt();
      const choice = await promptToUse.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      return true;
    }
    return false;
  };

  return { deferredPrompt, isInstalled, isIos, isAndroid, promptInstall };
};

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptInstall: () => Promise<boolean>;
  isIos: boolean;
  isAndroid: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  promptInstall,
  isIos,
  isAndroid,
  deferredPrompt,
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(!deferredPrompt && !isIos);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // If deferredPrompt is available, we can offer the direct 1-tap install
    if (deferredPrompt) {
      setShowManualSteps(false);
    } else if (!isIos) {
      setShowManualSteps(true);
    }
  }, [deferredPrompt, isIos]);

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await promptInstall();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        // Fallback to manual step guide if prompt was rejected or not available
        setShowManualSteps(true);
      }
    } catch {
      setShowManualSteps(true);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 text-center relative overflow-hidden"
          >
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF]" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon Preview */}
            <div className="flex justify-center mb-4 mt-1">
              <div className="relative w-20 h-20 rounded-2xl p-1 bg-gradient-to-br from-[#4A10A8] to-[#8625FF] shadow-lg shadow-purple-500/25">
                <img
                  src="/pwa-192x192.png"
                  alt="ScoreSync App"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <h3 className="text-xl font-black text-[#1E1B4B] mb-1">
              {installedSuccess ? 'App Installed!' : 'Install ScoreSync'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {installedSuccess
                ? 'ScoreSync is now installed on your home screen!'
                : 'Enjoy a fullscreen native app experience with zero address bars and instant loading.'}
            </p>

            {installedSuccess ? (
              <div className="py-4 flex flex-col items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-12 h-12 stroke-[2.2] animate-bounce" />
                <span className="text-xs font-bold mt-2">Ready on your Home Screen!</span>
              </div>
            ) : isIos ? (
              /* iOS Safari Instructions */
              <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-4 text-left space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap the <span className="font-bold inline-flex items-center gap-1 text-purple-900">Share <Share className="w-3.5 h-3.5 inline text-blue-600" /></span> button in Safari's bottom toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    Scroll down and tap <span className="font-bold inline-flex items-center gap-1 text-purple-900">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-slate-800" /></span>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    3
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap <span className="font-bold text-purple-900">Add</span> at the top right to place it on your home screen!
                  </div>
                </div>
              </div>
            ) : deferredPrompt && !showManualSteps ? (
              /* One-Tap Native Android/Desktop Prompt */
              <div className="space-y-3 mb-4">
                <button
                  onClick={handleNativeInstall}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-sm shadow-lg shadow-purple-600/30 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Opening Installer...' : 'Add to Home Screen'}</span>
                </button>

                <button
                  onClick={() => setShowManualSteps(true)}
                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900"
                >
                  Not opening? Show manual steps
                </button>
              </div>
            ) : (
              /* Android Chrome / Browser Step-by-Step Instructions */
              <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-4 text-left space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap the <span className="font-bold inline-flex items-center gap-1 text-purple-900">Menu (3 dots <MoreVertical className="w-3.5 h-3.5 inline text-slate-800" />)</span> in the top-right corner of Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap <span className="font-bold inline-flex items-center gap-1 text-purple-900">Install app <Smartphone className="w-3.5 h-3.5 inline text-purple-600" /></span> (or <span className="font-bold text-purple-900">Add to Home screen</span>).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/15 flex items-center justify-center text-purple-800 shrink-0 font-black text-xs">
                    3
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap <span className="font-bold text-purple-900">Install</span> on the popup confirmation. That's it!
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

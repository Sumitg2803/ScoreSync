import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, PlusSquare, Check, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { deferredPrompt, isInstalled, isIos, promptInstall };
};

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptInstall: () => Promise<boolean>;
  isIos: boolean;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  promptInstall,
  isIos,
}) => {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    try {
      const installed = await promptInstall();
      if (installed) {
        onClose();
      }
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
            <div className="flex justify-center mb-4 mt-2">
              <div className="relative w-20 h-20 rounded-2xl p-1 bg-gradient-to-br from-[#4A10A8] to-[#8625FF] shadow-lg shadow-purple-500/25">
                <img
                  src="/pwa-192x192.png"
                  alt="ScoreSync App"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <h3 className="text-xl font-black text-[#1E1B4B] mb-1">
              Install ScoreSync
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Enjoy a fullscreen native app experience with zero address bars and instant loading!
            </p>

            {isIos ? (
              /* iOS Safari Instructions */
              <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 text-left space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-700 shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    Tap the <span className="font-bold inline-flex items-center gap-1 text-purple-900">Share <Share className="w-3.5 h-3.5 inline text-blue-600" /></span> button in Safari's bottom toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-700 shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    Scroll down and tap <span className="font-bold inline-flex items-center gap-1 text-purple-900">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-slate-800" /></span>.
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Desktop One-Tap Button */
              <div className="space-y-3 mb-4">
                <button
                  onClick={handleNativeInstall}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-sm shadow-lg shadow-purple-600/30 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Installing...' : 'Add to Home Screen'}</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
            >
              Maybe Later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Global reference for shared trigger
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let promptListeners: Array<() => void> = [];

function notifyListeners() {
  promptListeners.forEach((listener) => listener());
}

export function usePwaInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/i.test(ua);
    setIsIos(ios);
    setIsAndroid(android);

    setIsInstallable(Boolean(globalDeferredPrompt) || ios || android);

    const updateState = () => {
      setIsInstallable(Boolean(globalDeferredPrompt) || ios || android);
    };

    promptListeners.push(updateState);
    return () => {
      promptListeners = promptListeners.filter((l) => l !== updateState);
    };
  }, []);

  return { isInstallable, isInstalled, isIos, isAndroid };
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone app mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);
    if (standalone) return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("surya_pwa_banner_dismissed");

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/i.test(ua);
    setIsIos(ios);
    setIsAndroid(android);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = event;
      setDeferredPrompt(event);
      notifyListeners();
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // If on mobile and not dismissed, show banner with guide fallback after 2s
    const timer = setTimeout(() => {
      if ((android || ios) && !isDismissed && !standalone) {
        setShowBanner(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setShowBanner(false);
        globalDeferredPrompt = null;
        notifyListeners();
      }
    } else {
      // Show device-specific manual installation guide
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("surya_pwa_banner_dismissed", "true");
  };

  if (isInstalled || !showBanner) {
    return (
      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIos={isIos}
      />
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-amber-500/40 text-white shadow-2xl rounded-2xl p-4 flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 border border-amber-500/30 bg-slate-800">
            <Image
              src="/icons/icon-192.png"
              alt="NEW HOTEL SURYA"
              width={48}
              height={48}
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-100 truncate flex items-center gap-1.5">
              <span>NEW HOTEL SURYA</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                App
              </span>
            </h4>
            <p className="text-xs text-slate-300 line-clamp-1">
              Install on your home screen for 1-tap fast access!
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
            >
              {isIos ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isIos ? "Add to iPhone" : "Install"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIos={isIos}
      />
    </>
  );
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { isInstalled, isIos } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        globalDeferredPrompt = null;
        notifyListeners();
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all ${className}`}
      >
        <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Install Mobile App</span>
      </button>

      <InstallGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        isIos={isIos}
      />
    </>
  );
}

function InstallGuideModal({
  isOpen,
  onClose,
  isIos,
}: {
  isOpen: boolean;
  onClose: () => void;
  isIos: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Install NEW HOTEL SURYA App</DialogTitle>
              <DialogDescription className="text-xs">
                Run directly on your mobile home screen with 1-tap access
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isIos ? (
          // iOS Safari Instructions
          <div className="space-y-3.5 py-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Must be in Safari:</span> Apple only allows installing apps from the official <strong>Safari browser</strong> (blue compass icon). If you opened this inside WhatsApp, Instagram, or Chrome, open it in <strong>Safari</strong> first.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Tap the Share button:</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Share className="w-3.5 h-3.5" />
                  </span>
                </span>
                <p className="mt-1 text-slate-500">
                  Look at the bottom toolbar of Safari and tap the square icon with an arrow pointing up.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Select &quot;Add to Home Screen&quot;:</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </span>
                </span>
                <p className="mt-1 text-slate-500">
                  Scroll down the share sheet menu and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Tap &quot;Add&quot; in Top-Right Corner:
                </span>
                <p className="mt-1 text-slate-500">
                  Confirm the name <strong>NEW HOTEL SURYA</strong> and tap <strong>Add</strong>. The app icon will appear immediately on your iPhone home screen!
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Android Chrome / Browser Instructions
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Open Browser Menu:</span>
                <p className="mt-0.5 text-slate-500">
                  In Google Chrome or your Android browser, tap the three dots (⋮) menu in the top right corner.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;:</span>
                <p className="mt-0.5 text-slate-500 flex items-center gap-1">
                  Choose <Download className="w-3.5 h-3.5 inline text-amber-500" /> &quot;Install app&quot; or &quot;Add to Home screen&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">1-Tap Fast Launch:</span>
                <p className="mt-0.5 text-slate-500">
                  Android will create a standalone app with the Hotel Surya logo that opens full screen without browser toolbars!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-xl text-xs transition-colors"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

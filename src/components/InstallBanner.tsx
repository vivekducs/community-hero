import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function InstallBanner() {
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleAppInstallReady = () => {
      setShowInstallBanner(true);
    };

    if ((window as any).deferredPrompt) {
      setShowInstallBanner(true);
    } else {
      window.addEventListener('app-install-ready', handleAppInstallReady);
      // Fallback in case it fires normally after mount
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        (window as any).deferredPrompt = e;
        setShowInstallBanner(true);
      });
    }

    return () => {
      window.removeEventListener('app-install-ready', handleAppInstallReady);
    };
  }, []);

  const handleInstallClick = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      (window as any).deferredPrompt = null;
    }
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-navy text-white px-4 py-3 flex items-center justify-between sm:px-6 lg:px-8 z-[100] shadow-md animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-saffron" />
        <p className="text-sm font-semibold">
          Install CityMind for offline reporting & faster access!
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-white text-navy font-bold text-xs rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          Install App
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1.5 text-saffron/80 hover:text-white hover:bg-navy/80 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

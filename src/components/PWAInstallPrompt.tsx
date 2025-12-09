import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

// Add CSS to head once
if (typeof document !== 'undefined' && !document.getElementById('pwa-install-styles')) {
  const style = document.createElement('style');
  style.id = 'pwa-install-styles';
  style.textContent = `
    @keyframes slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isOnline, installPWA } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt after 10 seconds if installable and not dismissed
    const timer = setTimeout(() => {
      if (isInstallable && !isInstalled && !dismissed) {
        const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24 hours

        if (!lastDismissed || parseInt(lastDismissed) < oneDayAgo) {
          setShowPrompt(true);
        }
      }
    }, 10000); // Show after 10 seconds

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const success = await installPWA();
      if (success) {
        setShowPrompt(false);
        // Show success message
        setTimeout(() => {
          alert('🎉 Aplikasi berhasil diinstall! Cek home screen Anda.');
        }, 1000);
      }
    } catch (error) {
      console.error('Install failed:', error);
      alert('❌ Gagal install aplikasi. Coba lagi nanti.');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
        {/* Install Prompt */}
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto shadow-2xl"
          style={{
            animation: 'slide-up 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Install Aplikasi</h3>
                <p className="text-sm text-gray-600">Upload-Klik-Selesai</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Install untuk Pengalaman Terbaik!
                </h4>
                <p className="text-gray-600">
                  Akses lebih cepat, bekerja offline, dan seperti aplikasi native di HP Anda.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">⚡</span>
                  </div>
                  <span className="text-sm text-gray-700">Akses langsung dari home screen</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">📱</span>
                  </div>
                  <span className="text-sm text-gray-700">Tampilan seperti aplikasi native</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-purple-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">
                    Bekerja offline (fitur terbatas)
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-sm">🔄</span>
                  </div>
                  <span className="text-sm text-gray-700">Update otomatis tanpa app store</span>
                </div>
              </div>

              {/* Install Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-blue-700 text-xs">ℹ️</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Tidak perlu app store!</p>
                    <p>Aplikasi akan diinstall langsung dari website ini. Aman dan terpercaya.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 p-6 pt-0">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PWAInstallPrompt;

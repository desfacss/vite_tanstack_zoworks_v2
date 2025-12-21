import React, { useEffect, useState } from 'react';
import { Button, Modal, message } from 'antd';
import { isIOS, isChrome, isAndroid } from 'react-device-detect';
import { DownloadOutlined, ShareAltOutlined } from '@ant-design/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Log initial environment details
    console.log("Environment:", {
      userAgent: navigator.userAgent,
      isIOS,
      isAndroid,
      isChrome,
      isEdge: /Edg\//.test(navigator.userAgent),
      isLocalhost: window.location.hostname === 'localhost',
      protocol: window.location.protocol
    });

    // Check if the app is already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    console.log("Standalone:", isStandalone);
    if (isStandalone) {
      setIsInstallable(false);
      return;
    }

    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired:", e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Add the event listener and log when it's added
    console.log("Adding beforeinstallprompt listener");
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Log when the page is interacted with
    window.addEventListener('click', () => {
      console.log("User interacted with the page");
    }, { once: true });

    // Handle iOS detection (Safari)
    if (isIOS) {
      const isStandalone = ('standalone' in window.navigator) && (window.navigator['standalone'] as boolean);
      const isSafari = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|CriOS/.test(navigator.userAgent);
      console.log("iOS:", { isStandalone, isSafari, isInstallable: !isStandalone && isSafari });
      setIsInstallable(!isStandalone && isSafari);
    }

    // Handle desktop browsers (non-iOS, non-Android, e.g., Chrome/Edge on Windows/Mac)
    const isDesktopChromeOrEdge = !isIOS && !isAndroid && (isChrome || /Edg\//.test(navigator.userAgent));
    if (isDesktopChromeOrEdge) {
      console.log("Detected Desktop Chrome/Edge, setting isInstallable to true");
      setIsInstallable(true);
    }

    // Avoid removing the listener unless necessary
    return () => {
      console.log("Component unmounting - keeping beforeinstallprompt listener active");
      // Do not remove the listener to ensure it persists across renders
      // window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    console.log("handleInstall called, deferredPrompt:", deferredPrompt);

    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      try {
        // Trigger the native browser install prompt
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("User choice:", outcome);
        if (outcome === 'accepted') {
          message.success('App installation started');
          setDeferredPrompt(null);
          setIsInstallable(false);
        } else {
          message.info('App installation cancelled');
        }
      } catch (error) {
        console.error('Error triggering install prompt:', error);
        message.error('Failed to install app');
      }
    } else {
      // Fallback for unsupported cases
      const isDesktopChromeOrEdge = !isIOS && !isAndroid && (isChrome || /Edg\//.test(navigator.userAgent));
      if (isAndroid && isChrome) {
        message.info('Use the browser menu (three dots) and select "Add to Home Screen"');
      } else if (isDesktopChromeOrEdge) {
        message.info('Use the browser address bar (install icon) or menu to install the app');
      } else {
        message.warning('App installation is not supported in this browser');
      }
    }
  };

  // Log rendering state
  console.log("Rendering - isInstallable:", isInstallable, "deferredPrompt:", !!deferredPrompt);
  if (!isInstallable) return null;

  // Determine button text and icon based on platform
  const isDesktop = !isIOS && !isAndroid;
  const buttonText = isIOS ? 'Add to Home Screen' : isDesktop ? 'Install Desktop App' : 'Install App';
  const buttonIcon = isIOS ? <ShareAltOutlined style={{ fontSize: 16 }} /> : <DownloadOutlined style={{ fontSize: 16 }} />;

  return (
    <>
      {/* <Button
        type="primary"
        icon={buttonIcon}
        onClick={handleInstall}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 shadow-lg"
      >
        {buttonText}
      </Button> */}

      <Modal
        title="Install on iOS"
        open={showIOSGuide}
        onCancel={() => setShowIOSGuide(false)}
        footer={null}
      >
        <div className="space-y-4">
          <p>To install this app on your iOS device:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Tap the <ShareAltOutlined className="inline-block mx-1" style={{ fontSize: 16 }} /> Share button in Safari</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Enter a name (optional) and tap "Add"</li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">
            Once installed, the app will appear on your home screen and run in full-screen mode.
          </p>
        </div>
      </Modal>
    </>
  );
};
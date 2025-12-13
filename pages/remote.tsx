import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import type { ActiveImageInfo } from "../lib/state-manager"; // Import the type

const HEARTBEAT_INTERVAL_MS = 300; // 0.3 seconds

export default function RemoteControl() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const [images, setImages] = useState<Array<{ name: string; url: string }>>([]);
  const [currentActiveImage, setCurrentActiveImage] = useState<ActiveImageInfo>(null);
  const [deviceInput, setDeviceInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Fetch gallery images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const cacheBuster = `?_t=${Date.now()}`;
        const response = await fetch(`/api/gallery-images${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch gallery images:', response.statusText);
          return;
        }
        const data = await response.json();
        if (data && data.images && Array.isArray(data.images)) {
          setImages(data.images);
          console.log(`[Remote] Loaded ${data.images.length} images from gallery.`);
        } else {
          console.warn('[Remote] No images array in response');
          setImages([]);
        }
      } catch (error) {
        console.error('Error fetching gallery images:', error);
        setImages([]);
      }
    };
    fetchImages();
  }, []);

  // Poll for active image status
  useEffect(() => {
    if (!selectedDevice) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/verify-device?deviceId=${selectedDevice}`);
        const data = await response.json();

        if (data.valid) {
          setCurrentActiveImage(data.activeImage);
        } else {
          // Device went offline?
          // For now, just clear active image
          setCurrentActiveImage(null);
        }
      } catch (error) {
        console.error('Error checking device status:', error);
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 1 second
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [selectedDevice]);



  const handleDeviceInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setDeviceInput(value);
    setVerificationError(null);

    if (value.length === 8) {
      setIsVerifying(true);
      setSelectedDevice(null); // Don't select yet

      try {
        const response = await fetch(`/api/verify-device?deviceId=${value}`);
        const data = await response.json();

        if (data.valid) {
          setSelectedDevice(value);
          setVerificationError(null);
        } else {
          setSelectedDevice(null);
          setVerificationError("Device not found or offline");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationError("Error verifying device");
        setSelectedDevice(null);
      } finally {
        setIsVerifying(false);
      }
    } else {
      setSelectedDevice(null);
      setIsVerifying(false);
      if (value.length > 0) {
        setVerificationError(null); // Clear error while typing
      }
    }
  };

  const sendCommand = useCallback(async (command: string, data?: any) => {
    if (!selectedDevice) {
      console.error('No target device selected. Cannot send command.');
      return;
    }

    console.log(`Sending command '${command}' to device '${selectedDevice}' with data:`, data);

    try {
      const response = await fetch('/api/remote-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetDeviceId: selectedDevice,
          command: { type: command, data },
        }),
      });

      if (!response.ok) {
        console.error('Failed to send command:', response.statusText);
      } else {
        console.log('Command sent successfully.');
        // If we send a hide-image command, clear the active image status locally right away
        if (command === 'hide-image') {
          setCurrentActiveImage(null);
        }
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  }, [selectedDevice]);

  const handleImageClick = useCallback((image: { name: string, url: string }) => {
    sendCommand('show-image', { name: image.name, url: image.url });
  }, [sendCommand]);

  // Authenticated - show remote control
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Head>
        <title>Remote Control - Slideshow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      {/* Status Bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${selectedDevice ? 'bg-emerald-400' : 'bg-red-500'} ${selectedDevice ? 'animate-pulse' : ''}`} />
              {selectedDevice ? (
                <>
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Controlling: {selectedDevice}</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm font-medium">No device selected</span>
                </>
              )}
            </div>
            {currentActiveImage && (
              <div className="flex items-center gap-2 text-sm text-sky-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                </span>
                <span>Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Slideshow Control
          </h1>
        </div>

        {/* Device Selector */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Target Device</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-grow relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={deviceInput}
                onChange={(e) => {
                  // Only allow numeric input
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  handleDeviceInputChange({ ...e, target: { ...e.target, value: val } });
                }}
                placeholder="Enter 8-digit device code"
                className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-1 ${verificationError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-white/10 focus:border-sky-400 focus:ring-sky-400'
                  }`}
              />
              {isVerifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
                </div>
              )}
            </div>
          </div>
          {verificationError && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {verificationError}
            </p>
          )}
        </div>

        {/* Image Gallery */}
        {selectedDevice && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">

            <div className="grid grid-cols-3 items-center mb-6">
              {/* Judul kiri */}
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">
                Image Gallery
              </h2>

              {/* Kolom tengah kosong agar simetris */}
              <div></div>

              {/* Tombol kanan */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => sendCommand('reload-page')}
                  className="rounded-lg bg-amber-600/80 p-2.5 text-white transition-colors hover:bg-amber-600"
                  title="Reload main page"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {currentActiveImage && (
                  <button
                    onClick={() => sendCommand('hide-image')}
                    className="rounded-lg bg-red-600/80 p-2.5 text-white transition-colors hover:bg-red-600"
                    title="Close image"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image) => {
                  const isActive = currentActiveImage?.name === image.name;
                  return (
                    <div
                      key={image.name}
                      onClick={() => handleImageClick(image)}
                      className={`group relative aspect-video rounded-lg overflow-hidden cursor-pointer bg-white/5 border ${isActive ? 'border-sky-400 ring-2 ring-sky-400' : 'border-white/10'
                        } hover:border-sky-400/50 transition-all duration-200 hover:scale-105 active:scale-95`}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {isActive && (
                        <span className="absolute top-2 left-2 rounded-full bg-sky-500 px-2 py-1 text-xs font-bold text-white z-10">
                          LIVE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/50 italic mb-4">
                  {images.length === 0 ? "No images found in gallery" : "Loading gallery..."}
                </p>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

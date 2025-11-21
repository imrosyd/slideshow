import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import type { ActiveImageInfo } from "../lib/state-manager"; // Import the type

const HEARTBEAT_INTERVAL_MS = 3000; // Same as in useHeartbeat for consistency

export default function RemoteControl() {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{name: string; url: string}>>([]);
  const [currentActiveImage, setCurrentActiveImage] = useState<ActiveImageInfo>(null); // New state for active image

  // Fetch gallery images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/gallery-images');
        if (!response.ok) {
          console.error('Failed to fetch gallery images:', response.statusText);
          return;
        }
        const data = await response.json();
        if (data.images) {
          setImages(data.images);
        }
      } catch (error) {
        console.error('Error fetching gallery images:', error);
      }
    };
    fetchImages();
  }, []);

  // Fetch devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          console.warn('Failed to fetch devices:', response.statusText);
          setDevices([]);
          return;
        }
        const data = await response.json();
        const clientIds = data.clients || [];
        console.log('Fetched devices:', clientIds);
        setDevices(clientIds);

        // If a selected device is no longer in the list, reset the selection
        if (selectedDevice && !clientIds.includes(selectedDevice)) {
          console.log(`Selected device ${selectedDevice} disconnected.`);
          setSelectedDevice(null);
          setCurrentActiveImage(null); // Clear active image if device disconnects
        }

      } catch (err) {
        console.error('Error fetching devices:', err);
        setDevices([]);
      }
    };

    fetchDevices(); // Initial fetch
    const interval = setInterval(fetchDevices, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [selectedDevice]);

  // Fetch active image status for selected device
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const fetchActiveImageStatus = async () => {
      if (!selectedDevice) {
        setCurrentActiveImage(null);
        return;
      }
      try {
        const response = await fetch(`/api/active-image-status?deviceId=${selectedDevice}`);
        if (!response.ok) {
          console.warn('Failed to fetch active image status:', response.statusText);
          setCurrentActiveImage(null);
          return;
        }
        const data: ActiveImageInfo = await response.json();
        setCurrentActiveImage(data);
      } catch (error) {
        console.error('Error fetching active image status:', error);
        setCurrentActiveImage(null);
      }
    };

    // Initial fetch
    fetchActiveImageStatus();

    // Poll for updates
    intervalId = setInterval(fetchActiveImageStatus, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedDevice]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDevice = e.target.value || null;
    console.log('Selected device:', newDevice);
    setSelectedDevice(newDevice);
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
                <span className="text-sm font-medium">Controlling: {selectedDevice.substring(0, 8)}...</span>
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
                <span>Live: {currentActiveImage.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')}</span>
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
            <select
              value={selectedDevice || ''}
              onChange={handleDeviceChange}
              className="flex-grow rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-40"
            >
              <option value="" disabled>
                {devices.length > 0 ? 'Select a device...' : 'No devices available'}
              </option>
              {devices.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Image Gallery */}
        {selectedDevice && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Image Gallery</h2>
              {currentActiveImage && ( // Conditionally render Close Image button
                <button
                  onClick={() => sendCommand('hide-image')}
                  className="rounded-lg bg-red-600/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600"
                >
                  Close Image
                </button>
              )}
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image) => {
                  const isActive = currentActiveImage?.name === image.name;
                  return (
                    <div
                      key={image.name}
                      onClick={() => handleImageClick(image)}
                      className={`group relative aspect-video rounded-lg overflow-hidden cursor-pointer bg-white/5 border ${
                        isActive ? 'border-sky-400 ring-2 ring-sky-400' : 'border-white/10'
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
              <p className="text-center text-white/50 italic">Loading gallery...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

export default function RemoteControl() {
  const [isConnected, setIsConnected] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Subscribe to slideshow status
    const remoteChannel = supabase
      .channel('remote-control')
      .on('broadcast', { event: 'slideshow-status' }, (payload) => {
        console.log('Status update:', payload);
        if (payload.payload) {
          setSlideCount(payload.payload.total || 0);
          setCurrentSlide(payload.payload.current || 0);
          setIsPaused(payload.payload.paused || false);
          setIsConnected(true);
        }
      })
      .subscribe();

    setChannel(remoteChannel);

    // Request initial status
    setTimeout(() => {
      remoteChannel.send({
        type: 'broadcast',
        event: 'request-status',
        payload: { timestamp: Date.now() }
      });
    }, 500);

    return () => {
      supabase.removeChannel(remoteChannel);
    };
  }, []);

  const sendCommand = useCallback((command: string, data?: any) => {
    if (!channel) {
      console.error('Channel not ready');
      return;
    }
    
    channel.send({
      type: 'broadcast',
      event: 'remote-command',
      payload: { command, data, timestamp: Date.now() }
    });
    console.log('Sent command:', command, data);
  }, [channel]);

  const handlePrevious = () => sendCommand('previous');
  const handleNext = () => sendCommand('next');
  const handlePlayPause = () => sendCommand('toggle-pause');
  const handleGoToSlide = (index: number) => sendCommand('goto', { index });
  const handleFirst = () => sendCommand('goto', { index: 0 });
  const handleLast = () => sendCommand('goto', { index: slideCount - 1 });

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
              <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-semibold tracking-wide">
                {isConnected ? 'CONNECTED' : 'CONNECTING'}
              </span>
            </div>
            <div className="text-sm font-medium text-white/80">
              <span className="font-bold text-sky-400">{currentSlide + 1}</span>
              <span className="text-white/60"> / {slideCount}</span>
            </div>
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

        {!isConnected && (
          <div className="mb-10 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 text-center backdrop-blur">
            <p className="text-sm font-medium text-amber-200">
              Establishing connection to slideshow...
            </p>
          </div>
        )}

        {/* Playback Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Playback Control</h2>
          <button
            onClick={handlePlayPause}
            disabled={!isConnected}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sky-500/50 hover:shadow-2xl"
          >
            {isPaused ? 'PLAY' : 'PAUSE'}
          </button>
        </div>

        {/* Navigation Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Navigation</h2>
          
          {/* Main Navigation Buttons */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-3">
            <button
              onClick={handleFirst}
              disabled={!isConnected || currentSlide === 0}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-bold text-white/90 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30"
            >
              FIRST
            </button>
            <button
              onClick={handlePrevious}
              disabled={!isConnected}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-bold text-white/90 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30"
            >
              PREV
            </button>
            <button
              onClick={handleNext}
              disabled={!isConnected}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-bold text-white/90 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30"
            >
              NEXT
            </button>
            <button
              onClick={handleLast}
              disabled={!isConnected || currentSlide === slideCount - 1}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-bold text-white/90 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 hover:border-white/30"
            >
              LAST
            </button>
          </div>
        </div>

        {/* Quick Jump */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-white/70">Quick Navigation</h2>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: Math.min(slideCount, 30) }, (_, i) => (
              <button
                key={i}
                onClick={() => handleGoToSlide(i)}
                disabled={!isConnected}
                className={`rounded-lg px-2 py-2 text-xs font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed sm:px-3 sm:py-2.5 ${
                  currentSlide === i
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                    : 'border border-white/20 bg-white/5 text-white/80 disabled:opacity-30 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {slideCount > 30 && (
            <p className="mt-4 text-center text-xs text-white/50">
              Showing first 30 slides
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
          <p className="text-sm font-medium text-white/70">
            Keep this tab open to maintain slideshow control
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase";

type TransitionEffect = "fade" | "slide" | "zoom" | "none";

export default function RemoteControl() {
  const [isConnected, setIsConnected] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffect>("fade");

  useEffect(() => {
    // Subscribe to slideshow status
    const channel = supabase
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

    // Request initial status
    setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'request-status',
        payload: { timestamp: Date.now() }
      });
    }, 500);
    
    // Load transition effect from settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.transitionEffect) {
          setTransitionEffect(data.transitionEffect);
        }
      })
      .catch(err => console.error('Failed to load settings:', err));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendCommand = useCallback((command: string, data?: any) => {
    const channel = supabase.channel('remote-control');
    channel.send({
      type: 'broadcast',
      event: 'remote-command',
      payload: { command, data, timestamp: Date.now() }
    });
    console.log('Sent command:', command, data);
  }, []);

  const saveTransitionEffect = useCallback(async (effect: TransitionEffect) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionEffect: effect }),
      });
      
      if (response.ok) {
        setTransitionEffect(effect);
        console.log('✅ Transition effect saved:', effect);
        
        // Send broadcast command to update slideshow immediately
        sendCommand('change-transition', { effect });
      } else {
        console.error('Failed to save transition effect');
      }
    } catch (error) {
      console.error('Failed to save transition effect:', error);
    }
  }, [sendCommand]);

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
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            <div className="text-sm text-white/60">
              Slide {currentSlide + 1} / {slideCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            🎮 Remote Control
          </h1>
          <p className="text-sm text-white/60">
            Control your slideshow from anywhere
          </p>
        </div>

        {!isConnected && (
          <div className="mb-8 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
            <p className="text-sm text-amber-200">
              Waiting for slideshow connection...
            </p>
          </div>
        )}

        {/* Playback Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
          <h2 className="mb-4 text-sm font-semibold text-white/70">Playback</h2>
          <div className="flex gap-3">
            <button
              onClick={handlePlayPause}
              disabled={!isConnected}
              className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPaused ? '▶️ Play' : '⏸️ Pause'}
            </button>
          </div>
        </div>

        {/* Slideshow Settings */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
          <h2 className="mb-4 text-sm font-semibold text-white/70">Transition Effect</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['fade', 'slide', 'zoom', 'none'] as TransitionEffect[]).map((effect) => (
              <button
                key={effect}
                onClick={() => saveTransitionEffect(effect)}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-95 ${
                  transitionEffect === effect
                    ? 'bg-sky-500 text-white border-2 border-sky-400'
                    : 'border border-white/20 bg-white/5 text-white/80'
                }`}
              >
                {effect.charAt(0).toUpperCase() + effect.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
          <h2 className="mb-4 text-sm font-semibold text-white/70">Navigation</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleFirst}
              disabled={!isConnected || currentSlide === 0}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⏮️ First
            </button>
            <button
              onClick={handleLast}
              disabled={!isConnected || currentSlide === slideCount - 1}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Last ⏭️
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={handlePrevious}
              disabled={!isConnected}
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏮️ Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!isConnected}
              className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next ⏭️
            </button>
          </div>
        </div>

        {/* Quick Jump */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
          <h2 className="mb-4 text-sm font-semibold text-white/70">Quick Jump</h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: Math.min(slideCount, 20) }, (_, i) => (
              <button
                key={i}
                onClick={() => handleGoToSlide(i)}
                disabled={!isConnected}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 disabled:cursor-not-allowed ${
                  currentSlide === i
                    ? 'bg-sky-500 text-white'
                    : 'border border-white/20 bg-white/5 text-white/80 disabled:opacity-30'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {slideCount > 20 && (
            <p className="mt-3 text-center text-xs text-white/40">
              Showing first 20 slides
            </p>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-xs text-white/40">
          <p>Keep this tab open to control the slideshow</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";

type Props = {
  imageCount: number;
  currentDuration: number;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onGenerate: (durationSeconds: number) => Promise<void>;
};

export const BatchVideoDialog: React.FC<Props> = ({
  imageCount,
  currentDuration,
  isOpen,
  isLoading,
  onClose,
  onGenerate,
}) => {
  const [duration, setDuration] = useState(currentDuration || 60);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await onGenerate(duration);
      setDuration(currentDuration || 60);
      onClose();
    } catch (error) {
      console.error("Batch video generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const durationPerImage = Math.ceil(duration / imageCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">🎬 Generate Batch Video</h2>
          <p className="mt-2 text-sm text-white/60">
            Create a video from {imageCount} selected image{imageCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Image Count Info */}
        <div className="mb-6 rounded-lg border border-purple-400/30 bg-purple-500/10 p-4">
          <div className="text-sm text-white/80">
            <p className="mb-2">
              <span className="font-semibold text-purple-300">{imageCount}</span>
              <span className="text-white/60"> image{imageCount !== 1 ? "s" : ""} selected</span>
            </p>
            <p className="text-xs text-white/50">
              Each image will display for {durationPerImage}s
            </p>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-white">Total Duration</label>
            <span className="text-lg font-bold text-purple-300">
              ⏱️ {duration}s
            </span>
          </div>
          <input
            type="range"
            min="10"
            max={300 * imageCount} // Max 300s per image
            step="1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isGenerating || isLoading}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-purple-500"
          />
          <div className="mt-2 flex justify-between text-xs text-white/50">
            <span>10s</span>
            <span>{300 * imageCount}s</span>
          </div>
        </div>

        {/* Duration Breakdown */}
        <div className="mb-6 space-y-2 rounded-lg bg-white/5 p-4">
          <p className="text-xs font-semibold text-white/70">Duration Breakdown</p>
          <div className="text-sm text-white/60">
            <p>
              {imageCount} images × {durationPerImage}s each = <span className="font-bold text-purple-300">{duration}s total</span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating || isLoading ? (
          <div className="mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-purple-400 to-pink-400" />
            </div>
            <p className="mt-3 text-center text-sm text-white/60">
              Generating video... This may take a few minutes
            </p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isGenerating || isLoading}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-medium text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            className="flex-1 rounded-lg border border-purple-400/50 bg-gradient-to-r from-purple-500/40 to-pink-500/40 px-4 py-2 font-medium text-purple-100 transition hover:border-purple-300/70 hover:from-purple-500/60 hover:to-pink-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating || isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-purple-200 border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "🎬 Generate Video"
            )}
          </button>
        </div>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-white/40">
          Videos are stored in Supabase Storage
        </p>
      </div>
    </div>
  );
};

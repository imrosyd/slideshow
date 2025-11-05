import React from "react";
import type { ImageAsset } from "../../hooks/useImages";

type Props = {
  images: ImageAsset[];
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onGenerate: () => Promise<void>;
};

export const GenerateAllVideoDialog: React.FC<Props> = ({
  images,
  isOpen,
  isLoading,
  onClose,
  onGenerate,
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await onGenerate();
      onClose();
    } catch (error) {
      console.error("Generate all video error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  // Calculate total duration from all images' individual durations
  const totalDuration = images.reduce((sum, img) => sum + (img.durationSeconds || 0), 0);
  const imageCount = images.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">🎬 Generate Master Video</h2>
          <p className="mt-2 text-sm text-white/60">
            Create a single video from all {imageCount} image{imageCount !== 1 ? "s" : ""} using their individual display durations
          </p>
        </div>

        {/* Summary Info */}
        <div className="mb-6 rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
          <div className="text-sm text-white/80">
            <p className="mb-1">
              <span className="font-semibold text-blue-300">{imageCount}</span>
              <span className="text-white/60"> images will be combined</span>
            </p>
            <p className="text-lg font-bold text-blue-300 mt-2">
              ⏱️ Total Duration: {totalDuration}s
            </p>
            <p className="text-xs text-white/50 mt-1">
              Video will loop infinitely on the main page
            </p>
          </div>
        </div>

        {/* Images List with Durations */}
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold text-white/70 mb-3">Image Duration Breakdown</p>
          <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg bg-white/5 p-3">
            {images.map((img, idx) => (
              <div
                key={img.name}
                className="flex items-center justify-between rounded px-3 py-2 bg-white/5 border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">
                    {idx + 1}. {img.name}
                  </p>
                  {img.caption && (
                    <p className="text-xs text-white/50 truncate">{img.caption}</p>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-blue-300 whitespace-nowrap">
                    {img.durationSeconds || 0}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Info */}
        <div className="mb-6 space-y-2 rounded-lg bg-white/5 p-4">
          <p className="text-xs font-semibold text-white/70">Calculation</p>
          <div className="text-sm text-white/60 space-y-1">
            <p>
              Each image will display for its configured duration (display_duration)
            </p>
            <p>
              Total video duration = sum of all individual durations = <span className="font-bold text-blue-300">{totalDuration}s</span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating || isLoading ? (
          <div className="mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-blue-400 to-cyan-400" />
            </div>
            <p className="mt-3 text-center text-sm text-white/60">
              Generating master video... This may take a few minutes
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
            className="flex-1 rounded-lg border border-blue-400/50 bg-gradient-to-r from-blue-500/40 to-cyan-500/40 px-4 py-2 font-medium text-blue-100 transition hover:border-blue-300/70 hover:from-blue-500/60 hover:to-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating || isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "🎬 Generate Master Video"
            )}
          </button>
        </div>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-white/40">
          ✨ All images combined into one seamless video
        </p>
      </div>
    </div>
  );
};

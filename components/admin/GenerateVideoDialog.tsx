import React, { useState } from 'react';

interface GenerateVideoDialogProps {
  filename: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (filename: string, durationSeconds: number) => Promise<void>;
  isLoading?: boolean;
}

export const GenerateVideoDialog: React.FC<GenerateVideoDialogProps> = ({
  filename,
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}) => {
  const [duration, setDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      setProgress(10);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 500);

      await onGenerate(filename, duration);

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        onClose();
        setDuration(60);
        setProgress(0);
        setError(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const durationMinutes = Math.floor(duration / 60);
  const durationSeconds = duration % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🎬 Generate Video
        </h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Image:</p>
          <p className="font-mono text-sm truncate bg-white p-2 rounded border border-gray-200">
            {filename}
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold mb-4">
            ⏱️ Video Duration: <span className="text-blue-600">{durationMinutes}:{String(durationSeconds).padStart(2, '0')}</span>
          </label>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>10s</span>
            <span>5 min</span>
          </div>
        </div>

        {isGenerating && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-center text-gray-600 mt-3">
              ⏳ Generating video... {Math.round(Math.min(progress, 100))}%
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <span className="font-semibold">❌ Error:</span> {error}
            </p>
          </div>
        )}

        {progress === 100 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <span>✅ Video generated successfully!</span>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-medium transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                🎬 Generate Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

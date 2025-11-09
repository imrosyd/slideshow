import { useState } from "react";

interface MergeVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageCount: number;
  onConfirm: () => void;
  isProcessing?: boolean;
  progress?: string;
}

export function MergeVideoDialog({ isOpen, onClose, imageCount, onConfirm, isProcessing, progress }: MergeVideoDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-semibold text-white">Merge Images to Video</h3>
        
        {isProcessing ? (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
            </div>
            {progress && (
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-400">{progress}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <p className="text-sm text-slate-300">
              Merge <strong>{imageCount}</strong> visible {imageCount === 1 ? 'image' : 'images'} into one video.
            </p>
            <p className="text-xs text-slate-400">
              {imageCount === 1 ? 'The image' : 'Each image'} will appear for its configured duration{imageCount === 1 ? '' : ' in sequence'}.
            </p>
            
            <div className="mt-4 rounded-lg bg-slate-800 p-3 border border-slate-700">
              <p className="text-xs text-slate-400">
                Video will be saved as: <span className="text-purple-400 font-mono">dashboard.mp4</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isProcessing ? "" : "Cancel"}
          >
            {isProcessing ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></span>
            ) : (
              <svg className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
          {!isProcessing && (
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg border border-purple-400/30 bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/30"
              title="Create Dashboard Video"
            >
              Create Dashboard Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

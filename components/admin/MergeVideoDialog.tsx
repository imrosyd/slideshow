import { useState } from "react";

interface MergeVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageCount: number;
  onConfirm: (outputFilename: string) => void;
}

export function MergeVideoDialog({ isOpen, onClose, imageCount, onConfirm }: MergeVideoDialogProps) {
  const [outputName, setOutputName] = useState("merged-slideshow");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!outputName.trim()) return;
    onConfirm(outputName.trim());
    setOutputName("merged-slideshow");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-semibold text-white">Merge Images to Video</h3>
        
        <div className="mb-6 space-y-3">
          <p className="text-sm text-slate-300">
            Merge <strong>{imageCount}</strong> visible images into one video.
          </p>
          <p className="text-xs text-slate-400">
            Each image will appear for its configured duration in sequence.
          </p>
          
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Output Video Name
            </label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20"
              placeholder="merged-slideshow"
            />
            <p className="mt-1 text-xs text-slate-400">
              Video will be saved as: {outputName || "merged-slideshow"}.mp4
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!outputName.trim()}
            className="flex-1 rounded-lg border border-purple-400/30 bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Merge Video
          </button>
        </div>
      </div>
    </div>
  );
}

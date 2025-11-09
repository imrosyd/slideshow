import { useState, useMemo, useEffect } from "react";
import type { ImageAsset } from "../../hooks/useImages";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  images: ImageAsset[];
  onUpdateMultiple: (filenames: string[], updates: { durationSeconds?: number | null; caption?: string | null }) => void;
  onSaveAll: (filenames: string[]) => Promise<void>;
  onDeleteImages: (filenames: string[]) => Promise<boolean>;
  isSaving: boolean;
};

export const BulkEditDialog = ({ isOpen, onClose, images, onUpdateMultiple, onSaveAll, onDeleteImages, isSaving }: Props) => {
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleImage = (filename: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedImages.size === visibleImages.length && visibleImages.length > 0) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(visibleImages.map(img => img.name)));
    }
  };

  const handleDurationChange = (value: string) => {
    if (value === "" || parseInt(value) >= 0) {
      setDurationSeconds(value);
    }
  };

  // Set default duration when selection changes
  useEffect(() => {
    if (selectedImages.size > 0) {
      const selectedArray = Array.from(selectedImages);
      const firstSelectedImage = images.find(img => img.name === selectedArray[0]);
      // Always clear the input field to show placeholder
      setDurationSeconds("");
    } else {
      // Clear duration when no images are selected
      setDurationSeconds("");
    }
  }, [selectedImages, images]);

  const handleApplyChanges = async () => {
    if (selectedImages.size === 0) return;
    
    setIsApplyingChanges(true);
    
    try {
      const updates: { durationSeconds?: number | null; caption?: string | null } = {};
      
      // Only apply duration if user has entered something (input is not empty)
      if (durationSeconds !== "") {
        updates.durationSeconds = parseInt(durationSeconds) || null;
      }
      // If input is empty, don't apply any duration changes (keep current values)
      
      if (Object.keys(updates).length > 0) {
        onUpdateMultiple(Array.from(selectedImages), updates);
        await onSaveAll(Array.from(selectedImages));
      }
      
      setSelectedImages(new Set());
      setDurationSeconds("");
      onClose();
    } catch (error) {
      console.error("Bulk edit failed:", error);
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleDeleteImages = async () => {
    if (selectedImages.size === 0) return;
    
    setIsDeleting(true);
    
    try {
      const success = await onDeleteImages(Array.from(selectedImages));
      if (success) {
        setSelectedImages(new Set());
        onClose();
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isApplyDisabled = selectedImages.size === 0 || isSaving || isApplyingChanges;

  const selectedCountText = `${selectedImages.size} image${selectedImages.size !== 1 ? "s" : ""} selected`;

  const visibleImages = useMemo(() => {
    return images.filter(img => !img.hidden);
  }, [images]);

  const allVisibleSelected = selectedImages.size === visibleImages.length && visibleImages.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-glass backdrop-blur-2xl">
        <div className="flex gap-6 h-full p-6">
          {/* Left Panel - Controls */}
          <div className="flex-1/3 min-w-[400px] flex flex-col" style={{ flex: '0 0 33.333%' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white/95">Bulk Edit Images</h2>
                <p className="text-sm text-white/60">Select images and apply changes</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={isSaving || isApplyingChanges}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selection controls */}
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10"
                  >
                    {allVisibleSelected ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-sm text-white/60">{selectedCountText}</span>
                </div>
              </div>

              {/* Bulk edit controls */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Changes to Apply</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white/70">Display duration (seconds)</label>
                    {(() => {
                      const selectedArray = Array.from(selectedImages);
                      const firstSelectedImage = images.find(img => img.name === selectedArray[0]);
                      const defaultValue = firstSelectedImage?.durationSeconds !== undefined && firstSelectedImage?.durationSeconds !== null 
                        ? firstSelectedImage.durationSeconds.toString() 
                        : "10";
                      return (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={durationSeconds}
                          onChange={(e) => handleDurationChange(e.target.value)}
                          placeholder={selectedImages.size > 0 ? `${defaultValue} (current value)` : "Duration in seconds"}
                          className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      );
                    })()}
                    <p className="text-xs text-white/50">Enter duration in seconds or leave empty to keep current values</p>
                    <p className="text-xs text-white/40">
                      {(() => {
                        const selectedArray = Array.from(selectedImages);
                        const firstSelectedImage = images.find(img => img.name === selectedArray[0]);
                        if (firstSelectedImage?.durationSeconds !== undefined && firstSelectedImage?.durationSeconds !== null) {
                          return `Current duration: ${firstSelectedImage.durationSeconds}s`;
                        }
                        return selectedImages.size > 0 ? "Default duration: 10s" : "Select images to see current duration";
                      })()}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={selectedImages.size === 0 || isDeleting}
                      className="w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {isDeleting ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-transparent mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete {selectedImages.size} Image{selectedImages.size !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                    <p className="text-xs text-rose-400/60 mt-2">⚠️ This action cannot be undone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Image Selection */}
          <div className="flex-1 flex flex-col">
            {/* Image selection grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Select Images</h3>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visibleImages.map((image) => {
                  const isSelected = selectedImages.has(image.name);
                  return (
                    <div
                      key={image.name}
                      onClick={() => handleToggleImage(image.name)}
                      className={`relative rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? "border-sky-400/60 bg-sky-500/10" 
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="relative overflow-hidden rounded-lg aspect-video">
                        <img
                          src={image.previewUrl}
                          alt={image.name}
                          className="h-full w-full object-cover"
                        />
                        
                        {/* Selection checkmark */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-sky-500 flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}

                        
                      </div>
                      
                      
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-8 py-6 border-t border-white/10">
          <div className="text-sm text-white/60">
            {selectedCountText}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isApplyingChanges}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={isApplyDisabled}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingChanges ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Applying Changes...
                </>
              ) : (
                `Apply Changes (${selectedImages.size})`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-glass backdrop-blur-2xl">
            <div className="flex flex-col gap-5 text-white">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white/95">Delete Images</h2>
                <p className="text-sm leading-relaxed text-white/70">
                  Are you sure you want to delete {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''}? This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteImages}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:shadow-rose-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Deleting...
                    </>
                  ) : (
                    `Delete ${selectedImages.size} Image${selectedImages.size !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

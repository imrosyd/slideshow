import { useCallback, useRef, useState } from "react";
import type { UploadTask } from "../../hooks/useImages";

type Props = {
  isUploading: boolean;
  uploadTasks: UploadTask[];
  onFilesSelected: (files: File[]) => void;
  onPdfSelected?: (file: File) => void;
};

export const UploadBox = ({ isUploading, uploadTasks, onFilesSelected, onPdfSelected }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList);
      
      // Separate PDF and image files
      const pdfFiles = files.filter((file) => file.type === "application/pdf");
      const imageFiles = files.filter((file) => file.type.startsWith("image"));
      
      // Handle PDFs one at a time
      if (pdfFiles.length > 0 && onPdfSelected) {
        pdfFiles.forEach((pdf) => onPdfSelected(pdf));
      }
      
      // Handle images in batch
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      }
    },
    [onFilesSelected, onPdfSelected]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      handleFiles(event.dataTransfer?.files ?? null);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  }, [isDragOver]);

  const onDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 bg-white/5 p-10 text-center transition ${
          isDragOver ? "border-sky-400/80 bg-sky-400/10" : "hover:border-white/30 hover:bg-white/10"
        } ${isUploading ? "cursor-progress" : "cursor-pointer"}`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
          <span className="text-3xl">⬆︎</span>
        </div>
        <div className="flex flex-col gap-1 text-white">
          <p className="text-lg font-semibold">Drag & drop images or PDF here</p>
          <p className="text-sm text-white/60">
            {isUploading ? "Uploading files…" : "Or click to browse from your device"}
          </p>
          <p className="text-xs tracking-wide text-white/50">PNG · JPG · GIF · WEBP · AVIF · PDF</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,application/pdf"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
          disabled={isUploading}
        />
      </div>

      {uploadTasks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-white/80 shadow-glass">
          <p className="text-sm font-semibold tracking-wide text-white/70">Upload status</p>
          <div className="flex flex-col gap-3">
            {uploadTasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50">
                  <span className="truncate text-left text-white/70">{task.filename}</span>
                  <span className="text-white/60">{task.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${
                      task.status === "error"
                        ? "bg-rose-400/80"
                        : task.status === "success"
                          ? "bg-emerald-400/80"
                          : "bg-sky-400/80"
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                {task.error && (
                  <p className="text-xs text-rose-300/80">{task.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

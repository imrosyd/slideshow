import { useMemo } from "react";
import type { ImageAsset } from "../../hooks/useImages";

type Props = {
  image: ImageAsset;
  onChange: (filename: string, patch: Partial<Pick<ImageAsset, "durationSeconds" | "caption">>) => void;
  onReset: (filename: string) => void;
  onDelete: (filename: string) => void;
  onToggleHide?: (filename: string) => void;
  onPreview?: (filename: string) => void;
  isHidden?: boolean;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const ImageCard = ({ image, onChange, onReset, onDelete, onToggleHide, onPreview, isHidden }: Props) => {
  const hasChanges =
    image.durationSeconds !== image.originalDurationSeconds ||
    image.caption !== image.originalCaption;

  const durationValue = useMemo(() => {
    if (image.durationSeconds === null || Number.isNaN(image.durationSeconds)) {
      return "";
    }
    return String(image.durationSeconds);
  }, [image.durationSeconds]);

  return (
    <article className={`group flex flex-col gap-5 rounded-3xl border ${isHidden ? 'border-amber-400/50 bg-amber-500/5' : 'border-white/10 bg-white/5'} p-5 text-white shadow-glass transition hover:border-sky-400/50 hover:bg-white/10 ${hasChanges ? "ring-2 ring-sky-400/60" : ""}`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <img
          src={image.previewUrl}
          alt={image.name}
          className={`h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02] ${isHidden ? 'opacity-50 grayscale' : ''}`}
        />
        {isHidden && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-amber-500/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
              HIDDEN
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm">
          <span>{formatBytes(image.size)}</span>
        </div>
        {/* Preview and Hide buttons overlay */}
        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(image.name)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/80 text-white/90 backdrop-blur-sm transition hover:bg-sky-500 hover:text-white active:scale-95"
              title="Preview fullscreen"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          )}
          {onToggleHide && (
            <button
              type="button"
              onClick={() => onToggleHide(image.name)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${isHidden ? 'bg-amber-500 text-white' : 'bg-slate-950/80 text-white/90'} backdrop-blur-sm transition hover:bg-amber-500 hover:text-white active:scale-95`}
              title={isHidden ? "Show in slideshow" : "Hide from slideshow"}
            >
              {isHidden ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="truncate text-lg font-semibold text-white/95" title={image.name}>
            {image.name}
          </h3>
          <p className="text-xs tracking-wide text-white/60">
            Uploaded {formatDate(image.createdAt)}
          </p>
        </div>
        <div className="flex flex-col gap-3 select-text">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-white/70">
              Display duration (seconds)
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={durationValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                const parsed = nextValue === "" ? null : Math.max(1, Math.round(Number(nextValue)));
                onChange(image.name, { durationSeconds: Number.isNaN(parsed) ? null : parsed });
              }}
              placeholder="Default slideshow"
              className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-white/70">Caption</span>
            <textarea
              value={image.caption}
              onChange={(event) => onChange(image.name, { caption: event.target.value.slice(0, 320) })}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Add a short description"
            />
          </label>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => onDelete(image.name)}
          className="inline-flex items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/30"
        >
          Delete image
        </button>
        {hasChanges && (
          <button
            type="button"
            onClick={() => onReset(image.name)}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
          >
            Reset changes
          </button>
        )}
      </div>
    </article>
  );
};

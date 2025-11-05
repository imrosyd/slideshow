import { useMemo } from "react";
import type { ImageAsset } from "../../hooks/useImages";

type Props = {
  image: ImageAsset;
  onChange: (filename: string, patch: Partial<Pick<ImageAsset, "durationSeconds" | "caption">>) => void;
  onReset: (filename: string) => void;
  onDelete: (filename: string) => void;
  onPreview?: (filename: string) => void;
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

export const ImageCard = ({ image, onChange, onReset, onDelete, onPreview }: Props) => {
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
    <article className="group flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-glass transition hover:border-sky-400/50 hover:bg-white/10">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <img
          src={image.previewUrl}
          alt={image.name}
          className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
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

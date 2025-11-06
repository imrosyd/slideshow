import { useMemo } from "react";
import type { ImageAsset } from "../../hooks/useImages";

type Props = {
  image: ImageAsset;
  onChange: (filename: string, patch: Partial<Pick<ImageAsset, "durationSeconds" | "caption">>) => void;
  onReset: (filename: string) => void;
  onSave: (filename: string) => Promise<void>;
  onDelete: (filename: string) => void;
  onPreview: (filename: string) => void;
  onGenerateVideo?: (filename: string, durationSeconds: number) => void;
  onDeleteVideo?: (filename: string) => void;
  isGeneratingVideo?: boolean;
  isSaving?: boolean;
  onRename?: (filename: string) => void;
  isRenaming?: boolean;
};

const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, exponent);
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[exponent]}`;
};

const formatDate = (iso: string | null) => {
  if (!iso) {
    return "Unknown";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) {
    return null;
  }
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000);
  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";

  for (const [amount, nextUnit] of divisions) {
    if (Math.abs(value) < amount) {
      unit = nextUnit;
      break;
    }
    value /= amount;
  }

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(Math.round(value), unit);
};

export const ImageCard = ({
  image,
  onChange,
  onReset,
  onSave,
  onDelete,
  onPreview,
  onGenerateVideo,
  onDeleteVideo,
  isGeneratingVideo = false,
  isSaving = false,
  onRename,
  isRenaming = false,
}: Props) => {
  const durationValue = useMemo(() => image.durationSeconds ?? "", [image.durationSeconds]);

  const hasChanges = useMemo(() => {
    const currentDuration = image.durationSeconds ?? null;
    const originalDuration = image.originalDurationSeconds ?? null;
    const currentCaption = image.caption ?? "";
    const originalCaption = image.originalCaption ?? "";
    return currentDuration !== originalDuration || currentCaption !== originalCaption;
  }, [image.durationSeconds, image.originalDurationSeconds, image.caption, image.originalCaption]);

  const readableSize = useMemo(() => formatBytes(image.size), [image.size]);
  const createdLabel = useMemo(() => formatDate(image.createdAt), [image.createdAt]);
  const updatedLabel = useMemo(() => formatDate(image.updatedAt), [image.updatedAt]);
  const relativeVideoTime = useMemo(() => formatRelativeTime(image.videoGeneratedAt), [image.videoGeneratedAt]);

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === "") {
      onChange(image.name, { durationSeconds: null });
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return;
    }
    onChange(image.name, { durationSeconds: Math.max(0, Math.round(numeric)) });
  };

  const handleCaptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(image.name, { caption: event.target.value.slice(0, 320) });
  };

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl transition hover:border-sky-500/30">
      <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        <img
          src={image.previewUrl}
          alt={image.name}
          className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm">
          <span>{readableSize}</span>
          {image.isVideo ? <span className="text-emerald-300">Video</span> : null}
        </div>
        <button
          type="button"
          onClick={() => onPreview(image.name)}
          className="absolute right-3 bottom-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 text-white/90 backdrop-blur-sm transition hover:bg-sky-500 hover:text-white active:scale-95"
          title="Preview fullscreen"
          aria-label="Preview fullscreen"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6M4 10h6m-6 4h6m4 2v2m0-2v-2m0 2h-2m2 0h2" />
          </svg>
          <span className="sr-only">Preview fullscreen</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="truncate text-lg font-semibold text-white/95" title={image.name}>
            {image.name}
          </h3>
          <p className="text-xs tracking-wide text-white/60">Uploaded {createdLabel}</p>
          {image.updatedAt ? (
            <p className="text-xs text-white/40">Updated {updatedLabel}</p>
          ) : null}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-white/70">Display duration (seconds)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={durationValue}
            onChange={handleDurationChange}
            className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-white/70">Caption</span>
          <textarea
            value={image.caption}
            onChange={handleCaptionChange}
            rows={3}
            className="w-full resize-none rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            placeholder="Add a short description"
          />
        </label>
      </div>


    </article>
  );
};

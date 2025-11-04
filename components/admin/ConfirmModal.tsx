import { Fragment } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  dismissLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = "Delete",
  dismissLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}: Props) => {
  if (!open) return <Fragment />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-glass backdrop-blur-2xl">
        <div className="flex flex-col gap-5 text-white">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white/95">{title}</h2>
            <p className="text-sm leading-relaxed text-white/70">{description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10"
            >
              {dismissLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:shadow-rose-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Memproses…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

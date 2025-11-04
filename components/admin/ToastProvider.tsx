import { ReactNode } from "react";
import { ToastProviderContext, useToastController } from "../../hooks/useToast";

const toastVariantStyles: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-100 border-emerald-400/50",
  error: "bg-rose-500/20 text-rose-100 border-rose-400/40",
  info: "bg-sky-500/20 text-sky-100 border-sky-400/40",
  warning: "bg-amber-500/20 text-amber-100 border-amber-400/40",
};

type Props = {
  children: ReactNode;
};

export const ToastProvider = ({ children }: Props) => {
  const controller = useToastController();

  return (
    <ToastProviderContext.Provider value={controller}>
      {children}
      <div className="pointer-events-none fixed top-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-3 text-sm">
        {controller.toasts.map((toast) => {
          const variantClass = toastVariantStyles[toast.variant] || toastVariantStyles.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl border bg-slate-900/80 px-5 py-4 shadow-glass backdrop-blur-xl transition ${variantClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  {toast.title && <p className="text-sm font-semibold tracking-tight">{toast.title}</p>}
                  <p className="text-sm leading-relaxed text-white/90">{toast.description}</p>
                </div>
                <button
                  onClick={() => controller.dismissToast(toast.id)}
                  className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:border-white/40 hover:bg-white/20"
                  aria-label="Tutup notifikasi"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastProviderContext.Provider>
  );
};

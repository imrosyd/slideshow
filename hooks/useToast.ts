import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title?: string;
  description: string;
  duration: number;
};

type PushToastInput = Omit<ToastItem, "id" | "duration"> & Partial<Pick<ToastItem, "id" | "duration">>;

type ToastContextValue = {
  toasts: ToastItem[];
  pushToast: (toast: PushToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

export const ToastProviderContext = ToastContext;

const randomId = () => Math.random().toString(36).slice(2, 10);

export const useToastController = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (toast: PushToastInput) => {
      const id = toast.id ?? randomId();
      const duration = toast.duration ?? DEFAULT_DURATION;
      const nextToast: ToastItem = {
        id,
        variant: toast.variant,
        title: toast.title,
        description: toast.description,
        duration,
      };

      setToasts((prev) => [...prev.filter((item) => item.id !== id), nextToast]);

      if (duration > 0) {
        if (timers.current[id]) {
          clearTimeout(timers.current[id]!);
        }
        timers.current[id] = setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  return useMemo(
    () => ({
      toasts,
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast, toasts]
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

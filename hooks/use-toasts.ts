import { useCallback, useState } from "react";
import type { ToastItem } from "@/components/toast-stack";

const TOAST_EXIT_MS = 380;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    let scheduled = false;
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || target.dismissing) return prev;
      scheduled = true;
      return prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t));
    });
    if (!scheduled) return;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_EXIT_MS);
  }, []);

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4400);
    },
    [dismissToast]
  );

  return { toasts, showToast, dismissToast };
}

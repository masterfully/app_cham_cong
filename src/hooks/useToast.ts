import { useEffect, useState } from "react";

export interface ToastState {
  message: string;
  tone: "success" | "error";
}

export interface UseToastReturn {
  toastState: ToastState | null;
  showToast: (message: string, tone?: "success" | "error") => void;
}

export function useToast(): UseToastReturn {
  const [toastState, setToastState] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toastState) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setToastState(null);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [toastState]);

  function showToast(message: string, tone: "success" | "error" = "success"): void {
    setToastState({ message, tone });
  }

  return { toastState, showToast };
}

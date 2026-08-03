"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type ToastType = "success" | "error";

export type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex items-start gap-2 rounded-md border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
      {toast.type === "success" ? (
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-teal-300" />
      ) : (
        <XCircle size={17} className="mt-0.5 shrink-0 text-rose-300" />
      )}
      <p className="text-sm text-zinc-200">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-auto rounded p-1 text-zinc-500 transition hover:text-zinc-300"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function pushToast(message: string, type: ToastType = "success") {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}

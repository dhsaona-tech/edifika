"use client";

import { CheckCircle2, X } from "lucide-react";
import { useState } from "react";

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export default function SuccessMessage({
  message,
  onDismiss,
  className = "",
  autoDismiss = false,
  autoDismissDelay = 3000,
}: SuccessMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (autoDismiss && !dismissed) {
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, autoDismissDelay);
  }

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 ${className}`}
      role="alert"
    >
      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-800">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-green-400 hover:text-green-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

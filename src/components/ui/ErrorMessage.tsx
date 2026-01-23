"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({
  message,
  onDismiss,
  className = "",
}: ErrorMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 ${className}`}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

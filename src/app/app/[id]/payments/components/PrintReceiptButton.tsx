"use client";

type Props = {
  label?: string;
};

export default function PrintReceiptButton({ label = "Imprimir / PDF" }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm font-semibold text-brand hover:text-brand-dark px-3 py-1 rounded-md border border-brand/40"
    >
      {label}
    </button>
  );
}

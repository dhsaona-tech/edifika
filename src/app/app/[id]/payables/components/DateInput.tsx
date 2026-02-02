"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function DateInput({ value, onChange, placeholder, required, disabled }: Props) {
  return (
    <input
      type="date"
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "yyyy-mm-dd"}
      className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 ${
        disabled ? "bg-gray-50 cursor-not-allowed opacity-70" : ""
      }`}
    />
  );
}

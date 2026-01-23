"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
};

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function DatePicker({ value, onChange, placeholder = "yyyy-mm-dd", required }: Props) {
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(initial);
  const ref = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startWeekday = (start.getDay() + 6) % 7; // Monday=0
    const grid: { label: number; date: Date; current: boolean }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - (startWeekday - i));
      grid.push({ label: d.getDate(), date: d, current: false });
    }
    for (let d = 1; d <= end.getDate(); d++) {
      grid.push({ label: d, date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d), current: true });
    }
    while (grid.length % 7 !== 0) {
      const d = new Date(end);
      d.setDate(d.getDate() + (grid.length % 7 === 0 ? 0 : 1));
      grid.push({ label: grid.length - (startWeekday + end.getDate()) + 1, date: d, current: false });
    }
    return grid;
  }, [viewDate]);

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePick = (d: Date) => {
    onChange(formatDate(d));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-white flex items-center justify-between gap-2 focus:border-brand focus:ring-2 focus:ring-brand/30"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || placeholder}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-gray-500"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Mes anterior"
            >
              ◀
            </button>
            <p className="text-sm font-semibold text-gray-800">
              {viewDate.toLocaleString("es-ES", { month: "long" })} {viewDate.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Mes siguiente"
            >
              ▶
            </button>
          </div>
          <div className="grid grid-cols-7 text-[11px] font-semibold text-gray-500 uppercase mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {days.map((d, idx) => {
              const isSelected = value && formatDate(d.date) === value;
              return (
                <button
                  type="button"
                  key={`${d.label}-${idx}`}
                  onClick={() => handlePick(d.date)}
                  className={`py-1.5 text-center rounded-md transition ${
                    isSelected
                      ? "bg-brand text-white font-semibold"
                      : d.current
                        ? "text-gray-800 hover:bg-gray-100"
                        : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => handlePick(new Date())}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

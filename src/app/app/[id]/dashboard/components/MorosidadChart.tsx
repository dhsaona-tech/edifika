"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MorosidadCategory } from "../actions";
import { CheckCircle2 } from "lucide-react";

interface MorosidadChartProps {
  data: MorosidadCategory[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: MorosidadCategory }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
      <p className="text-sm text-gray-600">{formatCurrency(item.value)}</p>
    </div>
  );
}

export default function MorosidadChart({ data }: MorosidadChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-gray-700">No hay deuda registrada</p>
        <p className="text-xs text-gray-500 mt-1">Todas las cuentas están al día</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2">
        Deuda total: <span className="font-semibold text-gray-700">{formatCurrency(total)}</span>
      </p>
    </div>
  );
}

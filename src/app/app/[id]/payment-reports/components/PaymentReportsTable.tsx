"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approvePaymentReport, rejectPaymentReport } from "../../payments/actions";
import { formatCurrency } from "@/lib/utils";

type Report = {
  id: string;
  unit_id?: string | null;
  profile_id?: string | null;
  amount: number;
  payment_date?: string | null;
  payment_method?: string | null;
  bank_from?: string | null;
  attachment_url?: string | null;
  comment?: string | null;
};

type Option = { value: string; label: string };

export default function PaymentReportsTable({
  reports,
  accounts,
  condominiumId,
}: {
  reports: Report[];
  accounts: Option[];
  condominiumId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [accountPerRow, setAccountPerRow] = useState<Record<string, string>>({});

  const handleAccountChange = (reportId: string, value: string) => {
    setAccountPerRow((prev) => ({ ...prev, [reportId]: value }));
  };

  const approve = (reportId: string) => {
    const accountId = accountPerRow[reportId] || accounts[0]?.value;
    if (!accountId) {
      setMessage("Selecciona una cuenta para acreditar el pago.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const res = await approvePaymentReport(condominiumId, reportId, {
        financial_account_id: accountId,
        autoAllocateOldest: true,
      });
      if (res?.error) {
        setMessage(res.error);
      } else {
        setMessage("Reporte aprobado.");
        router.refresh();
      }
    });
  };

  const reject = (reportId: string) => {
    setMessage("");
    startTransition(async () => {
      const res = await rejectPaymentReport(condominiumId, reportId, "Rechazado por administrador");
      if (res?.error) {
        setMessage(res.error);
      } else {
        setMessage("Reporte rechazado.");
        router.refresh();
      }
    });
  };

  if (!reports.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 bg-white">
        No hay reportes pendientes.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 text-[11px] uppercase tracking-wide text-gray-600 font-bold">
            <tr>
              <th className="px-6 py-3">Unidad</th>
              <th className="px-6 py-3">Residente</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Monto</th>
              <th className="px-6 py-3">Metodo</th>
              <th className="px-6 py-3">Banco origen</th>
              <th className="px-6 py-3">Comprobante</th>
              <th className="px-6 py-3">Cuenta destino</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-3 text-xs text-gray-700">{r.unit_id || "—"}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{r.profile_id || "—"}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{r.payment_date || "—"}</td>
                <td className="px-6 py-3 text-xs text-gray-900 font-semibold">{formatCurrency(r.amount)}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{r.payment_method || "—"}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{r.bank_from || "—"}</td>
                <td className="px-6 py-3 text-xs">
                  {r.attachment_url ? (
                    <a href={r.attachment_url} target="_blank" className="text-brand underline">
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-3 text-xs">
                  <select
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[160px]"
                    value={accountPerRow[r.id] || accounts[0]?.value || ""}
                    onChange={(e) => handleAccountChange(r.id, e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => approve(r.id)}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs font-semibold disabled:opacity-60"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(r.id)}
                      disabled={isPending}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs font-semibold disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && (
        <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-700">{message}</div>
      )}
    </div>
  );
}

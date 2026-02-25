"use client";

import Link from "next/link";
import { BadgeCheck, Ban } from "lucide-react";
import { FinancialAccount } from "@/types/financial";
import FinancialAccountForm from "./FinancialAccountForm";
import DeleteAccountButton from "./DeleteAccountButton";
import { formatCurrency } from "@/lib/utils";

type Props = { accounts: FinancialAccount[]; condominiumId: string };

export default function FinancialAccountsTable({ accounts, condominiumId }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Cuenta</th>
            <th className="px-4 py-3 text-left">Numero</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-right">Saldo inicial</th>
            <th className="px-4 py-3 text-right">Saldo actual</th>
            <th className="px-4 py-3 text-center">Usa cheques</th>
            <th className="px-4 py-3 text-center">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {accounts.map((acc) => (
            <tr key={acc.id} className="hover:bg-gray-50/70">
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800">{acc.bank_name}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{acc.account_number}</td>
              <td className="px-4 py-3 text-gray-700">
                {acc.account_type === "corriente"
                  ? "Cuenta corriente"
                  : acc.account_type === "ahorros"
                  ? "Cuenta de ahorros"
                  : "Caja chica"}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(acc.initial_balance)}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                {formatCurrency(acc.current_balance)}
              </td>
              <td className="px-4 py-3 text-center">
                {acc.account_type === "corriente" ? (
                  <span
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                      acc.uses_checks
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {acc.uses_checks ? "Si" : "No"}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {acc.is_active ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                    <BadgeCheck size={14} /> Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full text-[11px] font-semibold">
                    <Ban size={14} /> Inactiva
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <FinancialAccountForm condominiumId={condominiumId} account={acc} trigger="icon" />
                  <DeleteAccountButton
                    condominiumId={condominiumId}
                    accountId={acc.id}
                    accountName={acc.bank_name}
                  />
                  <Link
                    href={`/app/${condominiumId}/financial-accounts/${acc.id}`}
                    className="text-xs font-semibold text-brand hover:text-brand-dark px-3 py-1 rounded-md border border-brand/40 hover:bg-brand/5 transition"
                  >
                    Ver
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={8}>
                No hay cuentas registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

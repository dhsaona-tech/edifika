import {
  getBudgetDetail,
  setActiveBudget,
  deactivateBudget,
  deleteBudget,
  getUnitsForDistribution,
} from "../actions";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BudgetMaster } from "@/types/budget";
import BackButton from "@/components/ui/BackButton";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

type PageProps = { params: { id: string; budgetId: string } | Promise<{ id: string; budgetId: string }> };

export default async function BudgetDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id: condominiumId, budgetId } = resolvedParams;

  const [detail, units] = await Promise.all([
    getBudgetDetail(condominiumId, budgetId),
    getUnitsForDistribution(condominiumId),
  ]);
  if (!detail) return <div className="text-sm text-gray-500">Presupuesto no encontrado.</div>;

  const master = detail.master as BudgetMaster;
  const monthly = master.total_annual_amount / 12;

  const distributionNotes: Record<string, string> = {
    por_aliquota: "Recomendado: reparticion segun % de alicuota de cada unidad.",
    igualitario: "Se divide el total mensual entre todas las unidades activas.",
    manual_por_unidad: "⚠ Se podra definir manualmente cuanto paga cada unidad. Usalo solo si la asamblea lo aprobo.",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton href={`/app/${condominiumId}/budget`} />
          <div>
            <p className="text-[11px] uppercase font-semibold text-gray-500">Presupuesto anual</p>
            <h1 className="text-2xl font-semibold text-gray-900">{master.name}</h1>
            <p className="text-sm text-gray-500">
              Año {master.year} · {master.budget_type === "global" ? "Global" : "Detallado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/${condominiumId}/budget/${budgetId}/edit`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-brand px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            Editar
          </Link>
          <SetActiveButton condominiumId={condominiumId} budgetId={budgetId} />
          {master.status !== "inactivo" && (
            <DeactivateButton condominiumId={condominiumId} budgetId={budgetId} />
          )}
          <DeleteButton condominiumId={condominiumId} budgetId={budgetId} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard title="Estado" value={master.status} tone={statusTone(master.status)} />
        <InfoCard
          title="Distribucion"
          value={labelDistribucion(master.distribution_method)}
          note={distributionNotes[master.distribution_method || "por_aliquota"]}
        />
        <InfoCard title="Total anual" value={formatCurrency(master.total_annual_amount)} />
        <InfoCard
          title="Total mensual"
          value={formatCurrency(monthly)}
        />
      </div>

      {master.budget_type === "global" ? (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
          Presupuesto global: se ingreso un total anual. Los egresos ordinarios podran registrarse en cualquier rubro;
          la distribucion a unidades se hara segun el metodo elegido cuando se generen cargos.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-semibold text-gray-500">Rubros ordinarios</p>
              <h3 className="text-lg font-semibold text-gray-900">Detalle anual y mensual</h3>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Rubro</th>
                  <th className="px-4 py-3 text-right">Anual</th>
                  <th className="px-4 py-3 text-right">Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.rubros?.map((r) => {
                  const monthlyLine = r.annual_amount / 12;
                  return (
                    <tr key={r.expense_item_id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                     <td className="px-4 py-3 text-right text-gray-800">
                        {formatCurrency(r.annual_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(monthlyLine)}
                      </td>
                    </tr>
                  );
                })}
                {(!detail.rubros || detail.rubros.length === 0) && (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={3}>
                      No hay lineas detalladas. Agrega valores en el editor.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-semibold text-gray-900">Totales</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(master.total_annual_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(monthly)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-3 py-2">
            En presupuestos detallados, los egresos ordinarios futuros deberian usar solo rubros incluidos. Los rubros
            fuera del presupuesto deberian marcarse como extraordinarios.
          </div>
        </div>
      )}

      <UnitPreviewTable
        units={units}
        monthlyTotal={monthly}
        method={master.distribution_method || "por_aliquota"}
      />
    </div>
  );
}

function SetActiveButton({ condominiumId, budgetId }: { condominiumId: string; budgetId: string }) {
  async function action() {
    "use server";
    await setActiveBudget(condominiumId, budgetId);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-2 rounded-md hover:bg-emerald-50"
      >
        <ShieldCheck size={14} />
        Marcar como activo
      </button>
    </form>
  );
}

function DeactivateButton({ condominiumId, budgetId }: { condominiumId: string; budgetId: string }) {
  async function action() {
    "use server";
    await deactivateBudget(condominiumId, budgetId);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 border border-amber-200 px-3 py-2 rounded-md hover:bg-amber-50"
      >
        Desactivar
      </button>
    </form>
  );
}

function DeleteButton({ condominiumId, budgetId }: { condominiumId: string; budgetId: string }) {
  async function action() {
    "use server";
    await deleteBudget(condominiumId, budgetId);
    redirect(`/app/${condominiumId}/budget`);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 border border-red-200 px-3 py-2 rounded-md hover:bg-red-50"
      >
        Eliminar
      </button>
    </form>
  );
}

function InfoCard({ title, value, note, tone }: { title: string; value: string; note?: string; tone?: "warn" | "ok" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <p className="text-[11px] uppercase font-semibold text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {note && <p className={`text-xs mt-1 ${tone === "warn" ? "text-amber-700" : "text-gray-600"}`}>{note}</p>}
    </div>
  );
}

function statusTone(status: string): "warn" | "ok" | undefined {
  if (status === "aprobado") return "ok";
  if (status === "inactivo") return "warn";
  return undefined;
}

function labelDistribucion(method?: string | null) {
  if (method === "igualitario") return "Igualitario";
  if (method === "manual_por_unidad") return "Manual por unidad";
  return "Por % de alicuota";
}

function UnitPreviewTable({
  units,
  monthlyTotal,
  method,
}: {
  units: { id: string; identifier: string; aliquot: number; status: string }[];
  monthlyTotal: number;
  method: string;
}) {
  const activeUnits = units.filter((u) => u.status === "activa");
  const totalAliquot = activeUnits.reduce((acc, u) => acc + Number(u.aliquot || 0), 0);

  const rows =
    method === "manual_por_unidad"
      ? activeUnits.map((u) => ({
          ...u,
          amount: null,
        }))
      : activeUnits.map((u) => {
          let amount = 0;
          if (method === "igualitario" && activeUnits.length > 0) {
            amount = monthlyTotal / activeUnits.length;
          } else if (method === "por_aliquota" && totalAliquot > 0) {
            amount = monthlyTotal * (Number(u.aliquot || 0) / totalAliquot);
          }
          const rounded = Math.round(amount * 100) / 100;
          return { ...u, amount: rounded };
        });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-500">Vista previa por unidad</p>
          <h3 className="text-lg font-semibold text-gray-900">Distribucion mensual estimada</h3>
        </div>
        <div className="text-xs text-gray-500">
          Metodo: {labelDistribucion(method)} {method === "manual_por_unidad" && "(asignacion pendiente)"}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">% Alicuota</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Valor mensual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/70">
                <td className="px-4 py-3 font-semibold text-gray-800">{u.identifier}</td>
                <td className="px-4 py-3 text-gray-700">{Number(u.aliquot || 0).toFixed(4)}%</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{u.status}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                  {method === "manual_por_unidad" ? "Pendiente" : formatCurrency(u.amount || 0)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-gray-500" colSpan={4}>
                  No hay unidades activas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
          {method !== "manual_por_unidad" && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-900" colSpan={3}>
                  Total mensual
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(monthlyTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Esto es una vista previa. El cobro real se aplicara en el modulo de cargos cuando se active la generacion
        segun el metodo seleccionado.
      </p>
    </div>
  );
}

import { getBillingSettings } from "./actions";
import BillingSettingsForm from "./components/BillingSettingsForm";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BillingSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const settings = await getBillingSettings(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
        <Link
          href={`/app/${id}/my-condo`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-brand hover:border-brand/30 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
            <Settings size={20} className="text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Configuraci&oacute;n de Facturaci&oacute;n
            </h1>
            <p className="text-xs text-gray-500">
              Pronto pago, mora, vencimientos y generaci&oacute;n autom&aacute;tica
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <BillingSettingsForm condominiumId={id} initialData={settings} />
    </div>
  );
}

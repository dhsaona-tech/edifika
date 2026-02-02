"use client";

import { useState, useTransition } from "react";
import { Save, Upload, X, Image as ImageIcon, Building2, MapPin, Phone, User, FileText, CreditCard } from "lucide-react";
import { updateCondominiumInfo, uploadLogo } from "../actions";
import SuccessMessage from "@/components/ui/SuccessMessage";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { validateRUC } from "@/lib/validations";

interface CondominiumFormProps {
  condominiumId: string;
  initialData: {
    name?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
    administrator_name?: string | null;
    property_type?: string | null;
    logo_url?: string | null;
  };
}

export default function CondominiumForm({ condominiumId, initialData }: CondominiumFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData.logo_url || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    // Validar RUC si se proporciona
    const ruc = formData.get("ruc") as string;
    if (ruc && ruc.trim() !== "") {
      const rucValidation = validateRUC(ruc);
      if (!rucValidation.isValid) {
        setErrors({ ruc: rucValidation.error });
        return;
      }
    }

    startTransition(async () => {
      const result = await updateCondominiumInfo(condominiumId, formData);

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Información actualizada correctamente" });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Solo se permiten imágenes (JPEG, PNG, WEBP)" });
      return;
    }

    // Validar tamaño
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "El archivo no debe superar 2MB" });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingLogo(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("logo", file);

    const result = await uploadLogo(condominiumId, formData);

    setIsUploadingLogo(false);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
      setLogoPreview(initialData.logo_url || null);
    } else {
      setMessage({ type: "success", text: "Logo subido correctamente" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const removeLogo = async () => {
    const formData = new FormData();
    formData.append("logo_url", "");

    startTransition(async () => {
      const result = await updateCondominiumInfo(condominiumId, formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setLogoPreview(null);
        setMessage({ type: "success", text: "Logo eliminado" });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow border border-secondary-dark overflow-hidden">
      <form onSubmit={handleSubmit} className="p-5">
        {message && (
          <div className="mb-4">
            {message.type === "success" ? (
              <SuccessMessage message={message.text} onDismiss={() => setMessage(null)} />
            ) : (
              <ErrorMessage message={message.text} onDismiss={() => setMessage(null)} />
            )}
          </div>
        )}

        {/* LAYOUT PRINCIPAL: Logo a la izquierda, campos a la derecha */}
        <div className="flex gap-6">
          {/* COLUMNA IZQUIERDA: Logo */}
          <div className="flex-shrink-0">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Logo
            </label>
            <div className="space-y-2">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-28 h-28 object-contain border-2 border-gray-200 rounded-lg bg-gray-50 p-2"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Eliminar logo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                  <ImageIcon size={24} className="text-gray-400" />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded text-xs font-medium hover:bg-brand-dark transition-colors cursor-pointer shadow-sm w-full justify-center">
                <Upload size={12} />
                <span>{logoPreview ? "Cambiar" : "Subir"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
              </label>
              {isUploadingLogo && (
                <p className="text-xs text-gray-500 text-center">Subiendo...</p>
              )}
              <p className="text-xs text-gray-400 text-center leading-tight">
                JPEG, PNG, WEBP<br />Max. 2MB
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: Todos los campos organizados en grid compacto */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {/* Fila 1: Nombre y Tipo */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 size={12} />
                Nombre *
              </label>
              <input
                name="name"
                type="text"
                defaultValue={initialData.name || ""}
                required
                placeholder="Ej: Residencial Los Pinos"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Tipo
              </label>
              <select
                name="property_type"
                defaultValue={initialData.property_type || ""}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              >
                <option value="">Seleccionar</option>
                <option value="urbanizacion">Urbanización</option>
                <option value="conjunto">Conjunto</option>
                <option value="edificio">Edificio</option>
              </select>
            </div>

            {/* Fila 2: RUC y Teléfono */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={12} />
                RUC
              </label>
              <input
                name="ruc"
                type="text"
                defaultValue={initialData.ruc || ""}
                placeholder="1791234567001"
                maxLength={13}
                className={`w-full border rounded-md px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-brand/20 outline-none ${
                  errors.ruc ? "border-red-300 bg-red-50" : "border-gray-300 focus:border-brand"
                }`}
              />
              {errors.ruc && <p className="text-xs text-red-600">{errors.ruc}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <Phone size={12} />
                Teléfono
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={initialData.phone || ""}
                placeholder="02-2345678"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>

            {/* Fila 3: Dirección (ancho completo) */}
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin size={12} />
                Dirección
              </label>
              <input
                name="address"
                type="text"
                defaultValue={initialData.address || ""}
                placeholder="Ej: Av. Principal 123, Quito"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>

            {/* Fila 4: Administrador (ancho completo) */}
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <User size={12} />
                Administrador
              </label>
              <input
                name="administrator_name"
                type="text"
                defaultValue={initialData.administrator_name || ""}
                placeholder="Ej: Juan Pérez - Administración XYZ"
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-md transition-all shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

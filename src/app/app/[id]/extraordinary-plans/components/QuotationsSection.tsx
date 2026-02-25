"use client";

import { useState, useTransition, useRef } from "react";
import { FileText, Upload, Trash2, Trophy, Eye, X } from "lucide-react";
import { uploadQuotation, deleteQuotation, setWinnerQuotation, getQuotationUrl } from "../actions";
import type { ProjectQuotation } from "@/types/billing";

interface Props {
  condominiumId: string;
  planId: string;
  quotations: ProjectQuotation[];
  isEditable: boolean;
}

export default function QuotationsSection({ condominiumId, planId, quotations, isEditable }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    isWinner: false,
    notes: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !file.type.includes("pdf")) {
      setError("Solo se permiten archivos PDF");
      return;
    }
    setUploadData({ ...uploadData, file });
    setError(null);
  };

  const handleUpload = () => {
    if (!uploadData.file) {
      setError("Selecciona un archivo PDF");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadData.file);
    formData.append("is_winner", String(uploadData.isWinner));
    formData.append("notes", uploadData.notes);

    startTransition(async () => {
      const result = await uploadQuotation(condominiumId, planId, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Cotizacion subida correctamente");
        setShowUploadModal(false);
        setUploadData({ file: null, isWinner: false, notes: "" });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleDelete = (quotationId: string) => {
    if (!confirm("¿Eliminar esta cotizacion?")) return;

    startTransition(async () => {
      const result = await deleteQuotation(condominiumId, planId, quotationId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Cotizacion eliminada");
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleSetWinner = (quotationId: string) => {
    startTransition(async () => {
      const result = await setWinnerQuotation(condominiumId, planId, quotationId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Cotizacion marcada como ganadora");
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleView = async (filePath: string) => {
    const url = await getQuotationUrl(filePath);
    if (url) {
      window.open(url, "_blank");
    } else {
      setError("No se pudo obtener el archivo");
    }
  };

  const winnerQuotation = quotations.find((q) => q.is_winner);
  const canAddMore = quotations.length < 4;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          Cotizaciones ({quotations.length}/4)
        </h2>
        {isEditable && canAddMore && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-dark"
          >
            <Upload size={16} />
            Subir Cotizacion
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay cotizaciones cargadas</p>
          {isEditable && (
            <p className="text-xs mt-1">Sube al menos 1 cotizacion (maximo 4)</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quotations.map((quotation, index) => (
            <div
              key={quotation.id}
              className={`border rounded-lg p-4 ${
                quotation.is_winner
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      quotation.is_winner ? "bg-yellow-200" : "bg-gray-200"
                    }`}
                  >
                    {quotation.is_winner ? (
                      <Trophy size={20} className="text-yellow-600" />
                    ) : (
                      <FileText size={20} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Cotizacion #{index + 1}
                      {quotation.is_winner && (
                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                          GANADORA
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      {quotation.file_name}
                    </p>
                    {quotation.notes && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        {quotation.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleView(quotation.file_path)}
                    className="p-1.5 text-gray-500 hover:text-brand hover:bg-gray-100 rounded"
                    title="Ver PDF"
                  >
                    <Eye size={16} />
                  </button>
                  {isEditable && !quotation.is_winner && (
                    <button
                      onClick={() => handleSetWinner(quotation.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-100 rounded"
                      title="Marcar como ganadora"
                    >
                      <Trophy size={16} />
                    </button>
                  )}
                  {isEditable && (
                    <button
                      onClick={() => handleDelete(quotation.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de subida */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Subir Cotizacion</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Archivo PDF *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-brand file:text-white file:text-xs file:font-medium hover:file:bg-brand-dark"
                />
                <p className="text-xs text-gray-500 mt-1">Maximo 10MB</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                  placeholder="Ej: Proveedor ABC, mejor precio..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadData.isWinner}
                  onChange={(e) => setUploadData({ ...uploadData, isWinner: e.target.checked })}
                  className="w-4 h-4 text-brand rounded"
                />
                <span className="text-sm text-gray-700">Marcar como cotizacion ganadora</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={isPending || !uploadData.file}
                className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                <Upload size={16} />
                {isPending ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

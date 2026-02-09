"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  FolderOpen,
  FolderPlus,
  Upload,
  Search,
  FileText,
  Trash2,
  ChevronRight,
  Home,
  Eye,
  EyeOff,
  Lock,
  MoreVertical,
  Pencil,
  FolderInput,
  Download,
  X,
  File,
  Calendar,
  User,
  Shield,
  Tag,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentFolder, Document } from "../actions";
import {
  getFolders,
  getDocuments,
  createFolder,
  renameFolder,
  deleteFolder,
  deleteDocument,
  moveDocument,
  updateDocument,
} from "../actions";

const DOCUMENT_TYPES = [
  { value: "acta", label: "Acta de Asamblea", color: "bg-purple-100 text-purple-700" },
  { value: "reglamento", label: "Reglamento", color: "bg-blue-100 text-blue-700" },
  { value: "contrato", label: "Contrato", color: "bg-emerald-100 text-emerald-700" },
  { value: "informe_economico", label: "Informe Económico", color: "bg-amber-100 text-amber-700" },
  { value: "estado_cuenta", label: "Estado de Cuenta", color: "bg-cyan-100 text-cyan-700" },
  { value: "cotizacion", label: "Cotización", color: "bg-pink-100 text-pink-700" },
  { value: "otro", label: "Otro", color: "bg-gray-100 text-gray-700" },
];

const VISIBILITY_OPTIONS = [
  {
    value: "solo_admin",
    label: "Solo Admin",
    icon: Lock,
    description: "Solo administradores pueden ver",
    color: "text-red-500",
    bgColor: "bg-red-50"
  },
  {
    value: "publico_residentes",
    label: "Todos los Residentes",
    icon: Eye,
    description: "Visible para todos los residentes",
    color: "text-green-500",
    bgColor: "bg-green-50"
  },
  {
    value: "residentes_al_dia",
    label: "Residentes al Día",
    icon: EyeOff,
    description: "Solo residentes sin deuda",
    color: "text-amber-500",
    bgColor: "bg-amber-50"
  },
];

interface Props {
  condominiumId: string;
  initialFolders: DocumentFolder[];
  initialDocuments: Document[];
}

export default function DocumentsClient({ condominiumId, initialFolders, initialDocuments }: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [documents, setDocuments] = useState(initialDocuments);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Inicio" },
  ]);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<Document | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState<Document | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const refreshData = useCallback(async () => {
    const [newFolders, newDocs] = await Promise.all([
      getFolders(condominiumId),
      // En la raíz (null), mostrar TODOS los documentos (undefined = sin filtro)
      getDocuments(condominiumId, currentFolderId === null ? undefined : currentFolderId, search || undefined),
    ]);
    setFolders(newFolders);
    setDocuments(newDocs);
  }, [condominiumId, currentFolderId, search]);

  const navigateToFolder = async (folderId: string | null, folderName?: string) => {
    setCurrentFolderId(folderId);
    setSearch("");
    setMenuOpen(null);
    setShowDetailPanel(null);

    if (folderId === null) {
      setBreadcrumb([{ id: null, name: "Inicio" }]);
    } else {
      const existing = breadcrumb.findIndex((b) => b.id === folderId);
      if (existing >= 0) {
        setBreadcrumb(breadcrumb.slice(0, existing + 1));
      } else {
        setBreadcrumb([...breadcrumb, { id: folderId, name: folderName || "Carpeta" }]);
      }
    }

    // En la raíz (null), mostrar TODOS los documentos (undefined = sin filtro)
    // En una carpeta específica, filtrar por esa carpeta
    const newDocs = await getDocuments(condominiumId, folderId === null ? undefined : folderId);
    setDocuments(newDocs);
  };

  const handleSearch = async (value: string) => {
    setSearch(value);
    if (value.trim()) {
      const newDocs = await getDocuments(condominiumId, undefined, value);
      setDocuments(newDocs);
    } else {
      const newDocs = await getDocuments(condominiumId, currentFolderId);
      setDocuments(newDocs);
    }
  };

  const handleCreateFolder = async (name: string) => {
    setLoading(true);
    setError(null);
    const result = await createFolder(condominiumId, name, currentFolderId || undefined);
    if (result.error) {
      setError(result.error);
    } else {
      setShowFolderModal(false);
      setSuccessMessage("Carpeta creada exitosamente");
      await refreshData();
    }
    setLoading(false);
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    setLoading(true);
    const result = await renameFolder(condominiumId, folderId, editingFolderName);
    if (result.error) setError(result.error);
    else {
      setEditingFolder(null);
      setSuccessMessage("Carpeta renombrada");
      await refreshData();
    }
    setLoading(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta carpeta? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    const result = await deleteFolder(condominiumId, folderId);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccessMessage("Carpeta eliminada");
      await refreshData();
    }
    setLoading(false);
    setMenuOpen(null);
  };

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${docTitle}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const result = await deleteDocument(condominiumId, docId);
    if (result.error) setError(result.error);
    else {
      setSuccessMessage("Documento eliminado");
      setShowDetailPanel(null);
      await refreshData();
    }
    setLoading(false);
    setMenuOpen(null);
  };

  const handleMoveDocument = async (docId: string, targetFolderId: string | null) => {
    setLoading(true);
    const result = await moveDocument(condominiumId, docId, targetFolderId);
    if (result.error) setError(result.error);
    else {
      setShowMoveModal(null);
      setSuccessMessage("Documento movido");
      await refreshData();
    }
    setLoading(false);
  };

  const handleUpdateDocument = async (docId: string, data: { title?: string; document_type?: string; visibility?: string }) => {
    setLoading(true);
    const result = await updateDocument(condominiumId, docId, data);
    if (result.error) setError(result.error);
    else {
      setShowEditModal(null);
      setSuccessMessage("Documento actualizado");
      if (showDetailPanel?.id === docId) {
        // Update the detail panel with new data
        setShowDetailPanel({ ...showDetailPanel, ...data } as Document);
      }
      await refreshData();
    }
    setLoading(false);
  };

  const currentFolders = folders.filter((f) => f.parent_folder_id === currentFolderId);

  const getTypeConfig = (type: string) => DOCUMENT_TYPES.find((t) => t.value === type) || DOCUMENT_TYPES[6];
  const getVisibilityConfig = (vis: string) => VISIBILITY_OPTIONS.find((v) => v.value === vis) || VISIBILITY_OPTIONS[0];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateLong = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-EC", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col", showDetailPanel && "mr-80")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Archivo Virtual</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona los documentos de tu condominio de forma segura
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl hover:opacity-90 transition-all shadow-sm shadow-brand/25"
            >
              <Upload size={18} />
              Subir Documento
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Check className="text-green-500 shrink-0" size={20} />
            <p className="text-sm text-green-700 flex-1">{successMessage}</p>
          </div>
        )}

        {/* Breadcrumb + Search Bar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-1.5 text-sm bg-white px-3 py-2 rounded-xl border border-gray-200">
            {breadcrumb.map((item, index) => (
              <div key={item.id || "root"} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={14} className="text-gray-300" />}
                <button
                  onClick={() => navigateToFolder(item.id, item.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                    index === breadcrumb.length - 1
                      ? "font-semibold text-gray-900 bg-gray-100"
                      : "text-gray-500 hover:text-brand hover:bg-brand/5"
                  )}
                >
                  {index === 0 && <Home size={14} />}
                  {item.name}
                </button>
              </div>
            ))}
          </div>

          <div className="relative w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Folders */}
          {!search && currentFolders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FolderOpen size={14} />
                Carpetas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {currentFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-brand/40 hover:shadow-md hover:shadow-brand/5 transition-all cursor-pointer"
                  >
                    {editingFolder === folder.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameFolder(folder.id);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                          <FolderOpen size={20} className="text-brand" />
                        </div>
                        <input
                          autoFocus
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={() => setEditingFolder(null)}
                          className="flex-1 text-sm font-medium border-b-2 border-brand focus:outline-none bg-transparent min-w-0"
                        />
                      </form>
                    ) : (
                      <>
                        <div
                          onClick={() => navigateToFolder(folder.id, folder.name)}
                          className="flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand/20 to-brand/10 flex items-center justify-center shrink-0">
                            <FolderOpen size={20} className="text-brand" />
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {folder.name}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(menuOpen === folder.id ? null : folder.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical size={14} className="text-gray-400" />
                          </button>
                          {menuOpen === folder.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setEditingFolder(folder.id);
                                  setEditingFolderName(folder.name);
                                  setMenuOpen(null);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                              >
                                <Pencil size={14} className="text-gray-400" /> Renombrar
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={14} />
              Documentos {search && <span className="normal-case font-normal">— Resultados para "{search}"</span>}
            </h3>

            {documents.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 border-dashed rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <FileText size={32} className="text-gray-300" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  {search ? "No se encontraron documentos" : "No hay documentos aquí"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {search ? "Intenta con otros términos de búsqueda" : "Sube tu primer documento para comenzar"}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand hover:bg-brand/5 rounded-lg transition-colors"
                  >
                    <Upload size={16} />
                    Subir documento
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Visibilidad
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => {
                      const typeConfig = getTypeConfig(doc.document_type);
                      const visConfig = getVisibilityConfig(doc.visibility);
                      const VisIcon = visConfig.icon;

                      return (
                        <tr
                          key={doc.id}
                          className={cn(
                            "group hover:bg-gray-50/80 transition-colors cursor-pointer",
                            showDetailPanel?.id === doc.id && "bg-brand/5"
                          )}
                          onClick={() => setShowDetailPanel(doc)}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 flex items-center justify-center shrink-0">
                                <File size={18} className="text-red-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{doc.uploaded_by?.full_name || "—"}</span>
                                  {doc.folder && (
                                    <>
                                      <span>•</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigateToFolder(doc.folder!.id, doc.folder!.name);
                                        }}
                                        className="flex items-center gap-1 hover:text-brand transition-colors"
                                      >
                                        <FolderOpen size={12} />
                                        {doc.folder.name}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", typeConfig.color)}>
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", visConfig.bgColor, visConfig.color)}>
                              <VisIcon size={12} />
                              {visConfig.label}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm text-gray-500">{formatDate(doc.created_at)}</span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`/api/documents/view?id=${doc.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand opacity-0 group-hover:opacity-100 transition-all"
                                title="Ver"
                              >
                                <Eye size={16} />
                              </a>
                              <a
                                href={`/api/documents/view?id=${doc.id}&download=1`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand opacity-0 group-hover:opacity-100 transition-all"
                                title="Descargar"
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {showDetailPanel && (
        <DetailPanel
          document={showDetailPanel}
          onClose={() => setShowDetailPanel(null)}
          onEdit={() => setShowEditModal(showDetailPanel)}
          onMove={() => setShowMoveModal(showDetailPanel.id)}
          onDelete={() => handleDeleteDocument(showDetailPanel.id, showDetailPanel.title)}
          onNavigateToFolder={(folderId, folderName) => {
            setShowDetailPanel(null);
            navigateToFolder(folderId, folderName);
          }}
          getTypeConfig={getTypeConfig}
          getVisibilityConfig={getVisibilityConfig}
          formatDateLong={formatDateLong}
        />
      )}

      {/* Modals */}
      {showFolderModal && (
        <FolderModal
          onClose={() => setShowFolderModal(false)}
          onSubmit={handleCreateFolder}
          loading={loading}
        />
      )}

      {showUploadModal && (
        <UploadModal
          condominiumId={condominiumId}
          currentFolderId={currentFolderId}
          folders={folders}
          onClose={() => setShowUploadModal(false)}
          onUploaded={async () => {
            setShowUploadModal(false);
            setSuccessMessage("Documento subido exitosamente");
            await refreshData();
          }}
        />
      )}

      {showMoveModal && (
        <MoveModal
          folders={folders}
          currentFolderId={currentFolderId}
          onClose={() => setShowMoveModal(null)}
          onMove={(targetId) => handleMoveDocument(showMoveModal, targetId)}
          loading={loading}
        />
      )}

      {showEditModal && (
        <EditModal
          document={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSave={(data) => handleUpdateDocument(showEditModal.id, data)}
          loading={loading}
        />
      )}
    </div>
  );
}

// ==================== DETAIL PANEL ====================

function DetailPanel({
  document,
  onClose,
  onEdit,
  onMove,
  onDelete,
  onNavigateToFolder,
  getTypeConfig,
  getVisibilityConfig,
  formatDateLong,
}: {
  document: Document;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onNavigateToFolder: (folderId: string, folderName: string) => void;
  getTypeConfig: (type: string) => typeof DOCUMENT_TYPES[0];
  getVisibilityConfig: (vis: string) => typeof VISIBILITY_OPTIONS[0];
  formatDateLong: (date: string) => string;
}) {
  const typeConfig = getTypeConfig(document.document_type);
  const visConfig = getVisibilityConfig(document.visibility);
  const VisIcon = visConfig.icon;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Detalles</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Preview */}
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center mb-4">
          <div className="text-center">
            <File size={48} className="mx-auto text-red-400 mb-2" />
            <span className="text-xs font-medium text-gray-500 uppercase">PDF</span>
          </div>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-gray-900 mb-4 leading-snug">{document.title}</h4>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-6">
          <a
            href={`/api/documents/view?id=${document.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-dark transition-colors"
          >
            <Eye size={16} /> Ver
          </a>
          <a
            href={`/api/documents/view?id=${document.id}&download=1`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Download size={16} /> Descargar
          </a>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Tag size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Tipo</p>
              <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", typeConfig.color)}>
                {typeConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Visibilidad</p>
              <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", visConfig.bgColor, visConfig.color)}>
                <VisIcon size={12} />
                {visConfig.label}
              </div>
              <p className="text-xs text-gray-400 mt-1">{visConfig.description}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Subido por</p>
              <p className="text-sm text-gray-900">{document.uploaded_by?.full_name || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Fecha de subida</p>
              <p className="text-sm text-gray-900 capitalize">{formatDateLong(document.created_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FolderOpen size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Ubicación</p>
              {document.folder ? (
                <button
                  onClick={() => onNavigateToFolder(document.folder!.id, document.folder!.name)}
                  className="flex items-center gap-1.5 text-sm text-brand hover:underline"
                >
                  <FolderOpen size={14} />
                  {document.folder.name}
                </button>
              ) : (
                <p className="text-sm text-gray-500">Raíz (sin carpeta)</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Pencil size={16} className="text-gray-400" /> Editar documento
        </button>
        <button
          onClick={onMove}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <FolderInput size={16} className="text-gray-400" /> Mover a carpeta
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={16} /> Eliminar documento
        </button>
      </div>
    </div>
  );
}

// ==================== MODALS ====================

function FolderModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (name: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <FolderPlus size={20} className="text-brand" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nueva Carpeta</h3>
            <p className="text-sm text-gray-500">Organiza tus documentos en carpetas</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onSubmit(name);
          }}
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la carpeta</label>
            <input
              autoFocus
              type="text"
              placeholder="Ej: Actas 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creando..." : "Crear carpeta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadModal({
  condominiumId,
  currentFolderId,
  folders,
  onClose,
  onUploaded,
}: {
  condominiumId: string;
  currentFolderId: string | null;
  folders: DocumentFolder[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        setError("Solo se permiten archivos PDF");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const file = selectedFile;

    if (!file) {
      setError("Debes seleccionar un archivo");
      setLoading(false);
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("El archivo no puede superar 20MB");
      setLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append("condominium_id", condominiumId);
      payload.append("title", (formData.get("title") as string) ?? "");
      payload.append("document_type", (formData.get("document_type") as string) ?? "");
      payload.append("visibility", (formData.get("visibility") as string) ?? "");
      payload.append("folder_id", (formData.get("folder_id") as string) ?? "");
      payload.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setError(result.error || "Error al subir el documento");
        setLoading(false);
      } else {
        onUploaded();
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Upload size={20} className="text-brand" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Subir Documento</h3>
            <p className="text-sm text-gray-500">Agrega un nuevo documento al archivo</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              dragActive ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              selectedFile && "border-green-300 bg-green-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Check size={20} className="text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-lg"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Upload size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-brand">Haz clic para seleccionar</span> o arrastra tu archivo
                </p>
                <p className="text-xs text-gray-400">Solo archivos PDF, máximo 20MB</p>
              </>
            )}
          </div>

          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título del documento *</label>
            <input
              name="title"
              type="text"
              required
              placeholder="Ej: Acta de Asamblea Enero 2026"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
              <select
                name="document_type"
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibilidad *</label>
              <select
                name="visibility"
                required
                defaultValue="solo_admin"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Carpeta</label>
            <select
              name="folder_id"
              defaultValue={currentFolderId || ""}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
            >
              <option value="">Sin carpeta (raíz)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Subiendo..." : "Subir documento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveModal({
  folders,
  currentFolderId,
  onClose,
  onMove,
  loading,
}: {
  folders: DocumentFolder[];
  currentFolderId: string | null;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(currentFolderId);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <FolderInput size={20} className="text-brand" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mover documento</h3>
            <p className="text-sm text-gray-500">Selecciona la carpeta destino</p>
          </div>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto mb-6">
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 text-sm rounded-xl transition-all",
              selected === null ? "bg-brand/10 text-brand font-medium" : "hover:bg-gray-50"
            )}
          >
            <Home size={16} className={selected === null ? "text-brand" : "text-gray-400"} />
            Raíz (sin carpeta)
            {selected === null && <Check size={16} className="ml-auto" />}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-sm rounded-xl transition-all",
                selected === f.id ? "bg-brand/10 text-brand font-medium" : "hover:bg-gray-50"
              )}
            >
              <FolderOpen size={16} className={selected === f.id ? "text-brand" : "text-gray-400"} />
              {f.name}
              {selected === f.id && <Check size={16} className="ml-auto" />}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onMove(selected)}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading ? "Moviendo..." : "Mover aquí"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  document,
  onClose,
  onSave,
  loading,
}: {
  document: Document;
  onClose: () => void;
  onSave: (data: { title?: string; document_type?: string; visibility?: string }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState(document.title);
  const [documentType, setDocumentType] = useState(document.document_type);
  const [visibility, setVisibility] = useState(document.visibility);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, document_type: documentType, visibility });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
            <Pencil size={20} className="text-brand" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar documento</h3>
            <p className="text-sm text-gray-500">Modifica la información del documento</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de documento</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibilidad</label>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((v) => {
                const Icon = v.icon;
                return (
                  <label
                    key={v.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                      visibility === v.value
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={v.value}
                      checked={visibility === v.value}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="sr-only"
                    />
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", v.bgColor)}>
                      <Icon size={16} className={v.color} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{v.label}</p>
                      <p className="text-xs text-gray-500">{v.description}</p>
                    </div>
                    {visibility === v.value && (
                      <Check size={18} className="text-brand" />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-xl hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

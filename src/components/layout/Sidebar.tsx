"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Wrench,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Gauge, // Lecturas
  Palmtree, // Areas Comunales
  Truck, // Proveedores
  Briefcase, // Empleados
  FolderOpen, // Archivo
  Building, // Mi Condominio
  Gavel, // Directiva
  Banknote, // Cajas y Bancos
  Tags, // Rubros
} from "lucide-react";

interface SidebarProps {
  condominiumId: string;
}

export default function Sidebar({ condominiumId }: SidebarProps) {
  const pathname = usePathname();
  const getPath = (path: string) => `/app/${condominiumId}${path}`;

  const menuItems = [
    {
      title: "Principal",
      items: [{ name: "Dashboard", href: getPath("/dashboard"), icon: LayoutDashboard }],
    },
    {
      title: "Administrativo",
      items: [
        { name: "Unidades", href: getPath("/units"), icon: Building2 },
        { name: "Directorio", href: getPath("/residents"), icon: Users },
        { name: "Lecturas", href: getPath("/readings"), icon: Gauge },
        { name: "Areas Comunales", href: getPath("/amenities"), icon: Palmtree },
        { name: "Proveedores", href: getPath("/suppliers"), icon: Truck },
        { name: "Empleados", href: getPath("/employees"), icon: Briefcase },
        { name: "Archivo Virtual", href: getPath("/documents"), icon: FolderOpen },
        { name: "Mi Condominio", href: getPath("/my-condo"), icon: Building },
        { name: "Directiva", href: getPath("/board"), icon: Gavel },
        { name: "Tickets", href: getPath("/tickets"), icon: Wrench },
      ],
    },
    {
      title: "Financiero",
      items: [
        { name: "Rubros", href: getPath("/expense-items"), icon: Tags },
        { name: "Cargos (Cobrar)", href: getPath("/charges"), icon: FileText },
        { name: "Ingresos (REC)", href: getPath("/payments"), icon: ArrowDownLeft },
        { name: "Cuentas por Pagar", href: getPath("/payables"), icon: CreditCard },
        { name: "Egresos (EG)", href: getPath("/egresses"), icon: ArrowUpRight },
        { name: "Conciliacion", href: getPath("/reconciliation"), icon: Scale },
        { name: "Cajas y Bancos", href: getPath("/financial-accounts"), icon: Banknote },
        { name: "Presupuesto", href: getPath("/budget"), icon: Wallet },
        { name: "Anulados", href: getPath("/voided"), icon: BarChart3 },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes Generales", href: getPath("/reports"), icon: BarChart3 }],
    },
  ];

  const findSectionForPath = () => {
    for (const section of menuItems) {
      if (section.items.some((item) => pathname?.startsWith(item.href))) return section.title;
    }
    return null;
  };

  const [openSection, setOpenSection] = useState<string | null>(findSectionForPath() || "Administrativo");

  const toggleSection = (title: string) => {
    setOpenSection(openSection === title ? null : title);
  };

  return (
    <aside className="w-52 bg-secondary h-screen flex flex-col border-r border-secondary-dark fixed left-0 top-0 z-40 text-sm">
      <div className="h-14 flex items-center justify-center bg-white border-b border-secondary-dark p-3">
        <h1 className="text-xl font-bold text-brand tracking-tight">EDIFIKA</h1>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((section) => (
          <div key={section.title} className="mb-1">
            {section.title !== "Principal" ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide hover:text-brand transition-colors"
              >
                {section.title}
                {openSection === section.title ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="h-2" />
            )}

            <div
              className={cn(
                "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
                openSection === section.title || section.title === "Principal"
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              )}
            >
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive ? "bg-brand text-white shadow-sm" : "text-gray-700 hover:bg-brand/5 hover:text-brand-dark"
                    )}
                  >
                    <item.icon size={16} strokeWidth={2} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

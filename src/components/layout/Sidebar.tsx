"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/membership";
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
  Gauge,
  Palmtree,
  Truck,
  Briefcase,
  FolderOpen,
  Building,
  Gavel,
  Banknote,
  Tags,
  BadgeDollarSign,
  Settings2,
  CalendarClock,
  Handshake,
} from "lucide-react";

interface SidebarProps {
  condominiumId: string;
  userRole: UserRole;
}

// Roles que pueden ver cada sección
const ROLE_ACCESS: Record<string, UserRole[]> = {
  "Dashboard": ['SUPER_ADMIN', 'ADMIN', 'DIRECTIVA', 'RESIDENTE'],
  "Unidades": ['SUPER_ADMIN', 'ADMIN'],
  "Directorio": ['SUPER_ADMIN', 'ADMIN'],
  "Lecturas": ['SUPER_ADMIN', 'ADMIN'],
  "Areas Comunales": ['SUPER_ADMIN', 'ADMIN', 'RESIDENTE'],
  "Proveedores": ['SUPER_ADMIN', 'ADMIN'],
  "Empleados": ['SUPER_ADMIN', 'ADMIN'],
  "Archivo Virtual": ['SUPER_ADMIN', 'ADMIN', 'DIRECTIVA', 'RESIDENTE'],
  "Mi Condominio": ['SUPER_ADMIN', 'ADMIN'],
  "Directiva": ['SUPER_ADMIN', 'ADMIN', 'DIRECTIVA'],
  "Tickets": ['SUPER_ADMIN', 'ADMIN', 'RESIDENTE'],
  "Rubros": ['SUPER_ADMIN', 'ADMIN'],
  "Cargos (Cobrar)": ['SUPER_ADMIN', 'ADMIN'],
  "Ingresos (REC)": ['SUPER_ADMIN', 'ADMIN'],
  "Creditos": ['SUPER_ADMIN', 'ADMIN'],
  "Proyectos": ['SUPER_ADMIN', 'ADMIN'],
  "Convenios de Pago": ['SUPER_ADMIN', 'ADMIN'],
  "Cuentas por Pagar": ['SUPER_ADMIN', 'ADMIN'],
  "Egresos (EG)": ['SUPER_ADMIN', 'ADMIN'],
  "Conciliacion": ['SUPER_ADMIN', 'ADMIN'],
  "Cajas y Bancos": ['SUPER_ADMIN', 'ADMIN'],
  "Presupuesto": ['SUPER_ADMIN', 'ADMIN', 'DIRECTIVA'],
  "Config. Facturacion": ['SUPER_ADMIN', 'ADMIN'],
  "Anulados": ['SUPER_ADMIN', 'ADMIN'],
  "Reportes Generales": ['SUPER_ADMIN', 'ADMIN', 'DIRECTIVA'],
};

export default function Sidebar({ condominiumId, userRole }: SidebarProps) {
  const pathname = usePathname();

  const getPath = (path: string) => `/app/${condominiumId}${path}`;

  const allMenuItems = [
    {
      title: "Principal",
      items: [{ name: "Dashboard", href: getPath("/dashboard"), icon: LayoutDashboard }],
    },
    {
      title: "Administrativo",
      items: [
        { name: "Unidades", href: getPath("/units"), icon: Building2 },
        { name: "Directorio", href: getPath("/residents"), icon: Users },
        { name: "Lecturas", href: getPath("/readings"), icon: Gauge, comingSoon: true },
        { name: "Areas Comunales", href: getPath("/amenities"), icon: Palmtree, comingSoon: true },
        { name: "Proveedores", href: getPath("/suppliers"), icon: Truck },
        { name: "Empleados", href: getPath("/employees"), icon: Briefcase, comingSoon: true },
        { name: "Archivo Virtual", href: getPath("/documents"), icon: FolderOpen },
        { name: "Mi Condominio", href: getPath("/my-condo"), icon: Building },
        { name: "Directiva", href: getPath("/board"), icon: Gavel, comingSoon: true },
        { name: "Tickets", href: getPath("/tickets"), icon: Wrench, comingSoon: true },
      ],
    },
    {
      title: "Financiero",
      items: [
        { name: "Rubros", href: getPath("/expense-items"), icon: Tags },
        { name: "Cargos (Cobrar)", href: getPath("/charges"), icon: FileText },
        { name: "Ingresos (REC)", href: getPath("/payments"), icon: ArrowDownLeft },
        { name: "Creditos", href: getPath("/credits"), icon: BadgeDollarSign },
        { name: "Proyectos", href: getPath("/extraordinary-plans"), icon: CalendarClock },
        { name: "Convenios de Pago", href: getPath("/payment-agreements"), icon: Handshake },
        { name: "Cuentas por Pagar", href: getPath("/payables"), icon: CreditCard },
        { name: "Egresos (EG)", href: getPath("/egresses"), icon: ArrowUpRight },
        { name: "Conciliacion", href: getPath("/reconciliation"), icon: Scale },
        { name: "Cajas y Bancos", href: getPath("/financial-accounts"), icon: Banknote },
        { name: "Presupuesto", href: getPath("/budget"), icon: Wallet },
        { name: "Config. Facturacion", href: getPath("/billing-settings"), icon: Settings2 },
        { name: "Anulados", href: getPath("/voided"), icon: BarChart3 },
      ],
    },
    {
      title: "Reportes",
      items: [{ name: "Reportes Generales", href: getPath("/reports"), icon: BarChart3, comingSoon: true }],
    },
  ];

  // Filtrar items según el rol del usuario
  const menuItems = allMenuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const allowedRoles = ROLE_ACCESS[item.name];
        return !allowedRoles || allowedRoles.includes(userRole);
      }),
    }))
    .filter((section) => section.items.length > 0);

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
                const isComingSoon = "comingSoon" in item && item.comingSoon;

                if (isComingSoon) {
                  return (
                    <div
                      key={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed"
                      title="Este m\u00f3dulo est\u00e1 en desarrollo"
                    >
                      <item.icon size={16} strokeWidth={2} />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        Pronto
                      </span>
                    </div>
                  );
                }

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

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutData } from "@/lib/layout/getLayoutData";

export default function TopHeaderClient({ data }: { data: LayoutData }) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCondoMenu, setShowCondoMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const condoMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (condoMenuRef.current && !condoMenuRef.current.contains(event.target as Node)) {
        setShowCondoMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSwitchCondo = (condoId: string) => {
    setShowCondoMenu(false);
    router.push(`/app/${condoId}/dashboard`);
  };

  return (
    <header className="h-14 bg-white border-b border-secondary-dark flex items-center justify-between px-6 fixed top-0 right-0 left-52 z-30">
      {/* Izquierda: Nombre del conjunto con selector */}
      <div className="relative" ref={condoMenuRef}>
        <button
          onClick={() => setShowCondoMenu(!showCondoMenu)}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
        >
          <div className="flex flex-col justify-center text-left">
            <h2 className="text-sm font-bold text-brand leading-tight capitalize">
              {data.condominiumName}
            </h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
              {data.currentMonth}
            </span>
          </div>
          {data.condominiums.length > 1 && (
            <ChevronDown
              size={14}
              className={cn(
                "text-gray-400 transition-transform",
                showCondoMenu && "rotate-180"
              )}
            />
          )}
        </button>

        {/* Dropdown de conjuntos */}
        {showCondoMenu && data.condominiums.length > 1 && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Cambiar conjunto
              </p>
            </div>
            {data.condominiums.map((condo) => (
              <button
                key={condo.id}
                onClick={() => handleSwitchCondo(condo.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors",
                  condo.id === data.condominiumId && "bg-brand/5"
                )}
              >
                <Building2 size={14} className="text-gray-400 shrink-0" />
                <span className="truncate flex-1 capitalize">{condo.name}</span>
                {condo.id === data.condominiumId && (
                  <Check size={14} className="text-brand shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Derecha: Notificaciones + perfil con menú */}
      <div className="flex items-center gap-3">
        <button className="p-1.5 hover:bg-secondary rounded-full text-gray-500 hover:text-brand transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        {/* Perfil con dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-gray-800 leading-none capitalize">
                {data.userName}
              </p>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">
                {data.userRole}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {data.userInitials}
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "text-gray-400 transition-transform",
                showUserMenu && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown de usuario */}
          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-800 capitalize">{data.userName}</p>
                <p className="text-[10px] text-gray-500">{data.userRole}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

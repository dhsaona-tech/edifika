import { Settings, User, Bell } from "lucide-react";

export default function TopHeader() {
  return (
    // CAMBIO: h-16 a h-14 (Más bajo), left-64 a left-52 (Ajuste al nuevo sidebar)
    <header className="h-14 bg-white border-b border-secondary-dark flex items-center justify-between px-6 fixed top-0 right-0 left-52 z-30">
      
      {/* Izquierda: Contexto */}
      <div className="flex flex-col justify-center">
        <h2 className="text-sm font-bold text-brand leading-tight">Edificio Demo Nativa</h2>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Noviembre 2025</span>
      </div>

      {/* Derecha: Acciones */}
      <div className="flex items-center gap-3">
        <button className="p-1.5 hover:bg-secondary rounded-full text-gray-500 hover:text-brand transition-colors">
          <Settings size={18} />
        </button>

        <button className="p-1.5 hover:bg-secondary rounded-full text-gray-500 hover:text-brand transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
            <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-gray-800 leading-none">David Hernández</p>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">Administrador</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <User size={16} />
            </div>
        </div>
      </div>
    </header>
  );
}
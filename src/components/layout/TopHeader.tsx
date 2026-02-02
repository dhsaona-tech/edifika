import { Settings, User, Bell } from "lucide-react";
import { getLayoutData } from "@/lib/layout/getLayoutData";

export default async function TopHeader({ condominiumId }: { condominiumId: string }) {
  const data = await getLayoutData(condominiumId);

  return (
    <header className="h-14 bg-white border-b border-secondary-dark flex items-center justify-between px-6 fixed top-0 right-0 left-52 z-30">
      
      {/* Izquierda: Contexto */}
      <div className="flex flex-col justify-center">
        <h2 className="text-sm font-bold text-brand leading-tight capitalize">
          {data.condominiumName}
        </h2>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
          {data.currentMonth}
        </span>
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
        </div>
      </div>
    </header>
  );
}
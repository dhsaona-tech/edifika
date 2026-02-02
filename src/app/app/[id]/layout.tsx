import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; 
  
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar condominiumId={id} />
      <TopHeader condominiumId={id} />  {/* ← AGREGAR condominiumId */}
      
      <div className="ml-52 pt-14 transition-all duration-300">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
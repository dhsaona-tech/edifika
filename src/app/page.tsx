import Link from "next/link";
import { Building2, Shield, BarChart3, Users, Wallet, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-brand">EDIFIKA</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="#features"
                className="text-sm font-medium text-gray-600 hover:text-brand transition-colors"
              >
                Características
              </Link>
              <Link
                href="#about"
                className="text-sm font-medium text-gray-600 hover:text-brand transition-colors"
              >
                Acerca de
              </Link>
              <Link
                href="/app"
                className="text-sm font-semibold text-brand hover:text-brand-dark transition-colors"
              >
                Iniciar Sesión
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Administración de Condominios
            <span className="block text-brand">Simplificada</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Gestiona tu condominio de manera eficiente. Controla unidades, residentes, finanzas y
            más desde una sola plataforma.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/app"
              className="bg-brand hover:bg-brand-dark text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Comenzar Ahora
            </Link>
            <Link
              href="#features"
              className="bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-lg font-semibold border border-gray-300 shadow-sm hover:shadow transition-all"
            >
              Ver Características
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Unidades</h3>
            <p className="text-sm text-gray-600">
              Administra todas las unidades de tu condominio, alícuotas, propietarios y más.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Residentes</h3>
            <p className="text-sm text-gray-600">
              Mantén un registro completo de propietarios, inquilinos y contactos.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Finanzas</h3>
            <p className="text-sm text-gray-600">
              Control total de ingresos, egresos, presupuestos y cuentas por pagar.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cargos y Cobros</h3>
            <p className="text-sm text-gray-600">
              Genera expensas, cargos individuales y gestiona el cobro de manera eficiente.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
            <p className="text-sm text-gray-600">
              Genera reportes detallados de pagos, deudas y estados financieros.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Seguro y Confiable</h3>
            <p className="text-sm text-gray-600">
              Tus datos están protegidos con las mejores prácticas de seguridad.
            </p>
          </div>
        </div>

        {/* About Section */}
        <div id="about" className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">¿Por qué EDIFIKA?</h3>
          <p className="text-gray-600 mb-4">
            EDIFIKA es una plataforma completa diseñada específicamente para la administración de
            condominios en Ecuador. Compite directamente con soluciones como Habitanto y Mi Casita,
            ofreciendo:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Gestión integral de unidades y residentes</li>
            <li>Control financiero completo con presupuestos y reportes</li>
            <li>Generación automática de expensas y cargos</li>
            <li>Seguimiento de pagos y deudas pendientes</li>
            <li>Interfaz moderna e intuitiva</li>
            <li>Acceso desde cualquier dispositivo</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-brand">EDIFIKA</span>
            </div>
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} EDIFIKA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

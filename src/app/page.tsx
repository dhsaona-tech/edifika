"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CreditCard,
  BarChart3,
  Users,
  FileText,
  Shield,
  ArrowRight,
  ChevronRight,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";

/* ── Animated counter hook ─────────────────────────────────── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

  return { count, ref };
}

/* ── Scroll reveal hook ──────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ── Features data ───────────────────────────────────────── */
const features = [
  {
    icon: CreditCard,
    title: "Cobranza automatizada",
    description:
      "Genera cargos recurrentes y extraordinarios en segundos. Cada movimiento queda auditado.",
    accent: "from-brand-light/20 to-brand/10",
    iconColor: "text-brand-light",
  },
  {
    icon: Wallet,
    title: "Control de pagos",
    description:
      "Registra pagos, aplica créditos y gestiona convenios. Recibos electrónicos al instante.",
    accent: "from-brand-light/15 to-brand/10",
    iconColor: "text-brand-light",
  },
  {
    icon: BarChart3,
    title: "Egresos y presupuesto",
    description:
      "Controla cada egreso contra el presupuesto anual. Caja chica, cuentas bancarias y más.",
    accent: "from-brand/20 to-brand-dark/10",
    iconColor: "text-brand-light",
  },
  {
    icon: Users,
    title: "Residentes y directorio",
    description:
      "Base de datos de propietarios, inquilinos y contactos. Comunicación centralizada.",
    accent: "from-brand-light/15 to-brand/10",
    iconColor: "text-brand-light",
  },
  {
    icon: FileText,
    title: "Reportes profesionales",
    description:
      "PDFs de conciliación, estados de cuenta y egresos con diseño corporativo impecable.",
    accent: "from-brand/20 to-brand-light/10",
    iconColor: "text-brand-light",
  },
  {
    icon: Shield,
    title: "Transparencia total",
    description:
      "Estado de cuenta público por unidad. La directiva y residentes ven todo en tiempo real.",
    accent: "from-brand-light/20 to-brand/10",
    iconColor: "text-brand-light",
  },
];

const modules = [
  { name: "Unidades", desc: "Gestión de departamentos y locales" },
  { name: "Residentes", desc: "Propietarios, inquilinos, contactos" },
  { name: "Cobranzas", desc: "Cargos mensuales y extraordinarios" },
  { name: "Pagos", desc: "Registro, recibos y créditos" },
  { name: "Egresos", desc: "Control de gastos y proveedores" },
  { name: "Conciliación", desc: "Libros vs banco, cuadre automático" },
  { name: "Cuentas", desc: "Bancos, caja chica, movimientos" },
  { name: "Reportes", desc: "PDFs profesionales en un clic" },
];

/* ══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stat1 = useCountUp(40, 2000);
  const stat2 = useCountUp(100, 2200);
  const stat3 = useCountUp(24, 1800);

  const revealBenefits = useReveal();
  const revealFeatures = useReveal();
  const revealModules = useReveal();
  const revealTestimonial = useReveal();
  const revealCta = useReveal();

  return (
    <main className="relative overflow-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      {/* ─── NAVBAR ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="h-10 w-10 relative rounded-xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                  <Image
                    src="/logos/edifika-logo.png"
                    alt="Edifika"
                    fill
                    sizes="40px"
                    className="object-contain p-1.5"
                  />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">
                  EDIFIKA
                </span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-8">
                <a
                  href="#beneficios"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Beneficios
                </a>
                <a
                  href="#funcionalidades"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Funcionalidades
                </a>
                <a
                  href="#modulos"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Módulos
                </a>
              </div>

              {/* CTA buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-white/70 hover:text-white px-4 py-2 rounded-full transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/login?redirect=/app"
                  className="text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 px-5 py-2 rounded-full transition-all"
                >
                  Probar gratis
                </Link>
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white/70 hover:text-white p-2"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-b border-white/5">
            <div className="px-5 py-4 space-y-3">
              <a href="#beneficios" className="block text-sm text-white/70 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Beneficios
              </a>
              <a href="#funcionalidades" className="block text-sm text-white/70 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Funcionalidades
              </a>
              <a href="#modulos" className="block text-sm text-white/70 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Módulos
              </a>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <Link href="/login" className="text-sm text-white/70 py-2">
                  Iniciar sesión
                </Link>
                <Link
                  href="/login?redirect=/app"
                  className="text-sm font-semibold text-white bg-white/10 border border-white/10 px-5 py-2.5 rounded-full text-center"
                >
                  Probar gratis
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="relative mesh-gradient-dark min-h-screen flex items-center pt-16">
        {/* Ambient light blobs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand/20 blur-[120px] opacity-40" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-brand-light/15 blur-[100px] opacity-30" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="opacity-0 animate-fade-up">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Plataforma de administración de condominios
                </span>
              </div>

              {/* Headline */}
              <div className="opacity-0 animate-fade-up-delay-1">
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-white">
                  Administra
                  <br />
                  tu condominio{" "}
                  <span className="text-gradient-gold">sin caos.</span>
                </h1>
              </div>

              {/* Subtitle */}
              <div className="opacity-0 animate-fade-up-delay-2">
                <p className="text-lg lg:text-xl text-white/50 max-w-lg leading-relaxed">
                  Centraliza cobranza, pagos, residentes y reportes en una sola
                  plataforma. Más claridad, menos estrés.
                </p>
              </div>

              {/* CTAs */}
              <div className="opacity-0 animate-fade-up-delay-3 flex flex-wrap items-center gap-4">
                <Link
                  href="/login?redirect=/app"
                  className="btn-glow inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-light transition-colors animate-glow-pulse"
                >
                  Comenzar ahora
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium text-white/70 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  Ver demo
                  <ChevronRight size={16} />
                </Link>
              </div>

              {/* Trust signals */}
              <div className="opacity-0 animate-fade-up-delay-4 flex items-center gap-6 text-xs text-white/30">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500/60" />
                  Sin instalación
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500/60" />
                  Datos seguros
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-500/60" />
                  Soporte incluido
                </span>
              </div>
            </div>

            {/* Right: App mockup */}
            <div className="opacity-0 animate-fade-in-delay-1 relative">
              <div className="animate-float">
                <div className="mockup-shadow rounded-2xl overflow-hidden border border-white/10">
                  {/* Window chrome */}
                  <div className="bg-white/5 border-b border-white/5 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="bg-white/5 rounded-md px-3 py-1 text-[10px] text-white/30 text-center">
                        app.edifika.com
                      </div>
                    </div>
                  </div>

                  {/* Mock dashboard */}
                  <div className="bg-gradient-to-b from-[#0f0a18] to-[#15102a] p-5 space-y-4">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-brand/40 flex items-center justify-center">
                          <Building2 size={14} className="text-white/80" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white/90">
                            Condominio Las Palmeras
                          </p>
                          <p className="text-[10px] text-white/40">
                            Panel de administración
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        En línea
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">
                          Recaudación
                        </p>
                        <p className="text-base font-bold text-white mt-1">
                          $18,450
                        </p>
                        <p className="text-[9px] text-emerald-400 mt-1">
                          +12% vs anterior
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">
                          Al día
                        </p>
                        <p className="text-base font-bold text-white mt-1">
                          78%
                        </p>
                        <div className="mt-2 h-1 rounded-full bg-white/10">
                          <div className="h-1 w-4/5 rounded-full bg-gradient-to-r from-brand-light to-brand" />
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">
                          Egresos
                        </p>
                        <p className="text-base font-bold text-white mt-1">
                          $9,230
                        </p>
                        <p className="text-[9px] text-amber-400 mt-1">
                          3 pendientes
                        </p>
                      </div>
                    </div>

                    {/* Mini table */}
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-white/70">
                          Últimos pagos
                        </span>
                        <span className="text-[9px] text-brand-light">
                          Ver todos
                        </span>
                      </div>
                      {[
                        {
                          unit: "A-101",
                          name: "García M.",
                          amount: "$285.00",
                          status: "Aplicado",
                          color: "text-emerald-400 bg-emerald-400/10",
                        },
                        {
                          unit: "B-204",
                          name: "López R.",
                          amount: "$285.00",
                          status: "Aplicado",
                          color: "text-emerald-400 bg-emerald-400/10",
                        },
                        {
                          unit: "C-302",
                          name: "Torres P.",
                          amount: "$142.50",
                          status: "Parcial",
                          color: "text-amber-400 bg-amber-400/10",
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 flex items-center justify-between border-b border-white/[0.03] last:border-0"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-bold text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">
                              {row.unit}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {row.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-semibold text-white/80">
                              {row.amount}
                            </span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${row.color}`}
                            >
                              {row.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative blobs behind mockup */}
              <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-brand/20 blur-[60px]" />
              <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-brand-light/15 blur-[50px]" />
            </div>
          </div>
        </div>

        {/* Bottom fade to next section */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent to-[#0a0612]" />
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────── */}
      <section className="relative bg-[#0a0612] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-white/10">
            {[
              {
                ref: stat1.ref,
                count: stat1.count,
                suffix: "%",
                prefix: "+",
                label: "más control sobre ingresos y egresos",
                icon: TrendingUp,
              },
              {
                ref: stat2.ref,
                count: stat2.count,
                suffix: "%",
                prefix: "",
                label: "histórico digital sin carpetas físicas",
                icon: FileText,
              },
              {
                ref: stat3.ref,
                count: stat3.count,
                suffix: "/7",
                prefix: "",
                label: "estado de cuenta disponible para residentes",
                icon: Clock,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center px-8"
              >
                <stat.icon
                  size={20}
                  className="text-white/20 mb-3"
                  strokeWidth={1.5}
                />
                <span
                  ref={stat.ref}
                  className="stat-number text-4xl lg:text-5xl font-bold text-white"
                >
                  {stat.prefix}
                  {stat.count}
                  {stat.suffix}
                </span>
                <span className="text-sm text-white/40 mt-2 max-w-[220px]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ───────────────────────────────────────── */}
      <section
        id="beneficios"
        className="relative bg-[#0a0612] overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/10 blur-[120px] rounded-full" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-24 lg:py-32">
          <div ref={revealBenefits} className="reveal space-y-16">
            {/* Section header */}
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-light/70">
                Beneficios
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Todo lo que necesitas,
                <br />
                <span className="text-white/40">nada que te sobre.</span>
              </h2>
            </div>

            {/* Benefits grid */}
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  title: "Cobranza clara y ordenada",
                  description:
                    "Genera cargos recurrentes, extraordinarios y convenios de pago en pocos clics. Todo auditado y listo para reporte.",
                  icon: CreditCard,
                  gradient: "from-brand-light/15 to-transparent",
                },
                {
                  title: "Información para la directiva",
                  description:
                    "Presupuesto, cartera, egresos y conciliaciones en un mismo lugar. Sin perseguir archivos sueltos.",
                  icon: BarChart3,
                  gradient: "from-brand/15 to-transparent",
                },
                {
                  title: "Transparencia para residentes",
                  description:
                    "Estado de cuenta siempre disponible, recibos electrónicos y comunicación clara sobre cargos y pagos.",
                  icon: Users,
                  gradient: "from-brand-dark/20 to-transparent",
                },
              ].map((benefit, i) => (
                <div
                  key={i}
                  className={`reveal reveal-delay-${i + 1} feature-card group rounded-2xl bg-white/[0.03] border border-white/[0.06] p-7 lg:p-8 relative overflow-hidden`}
                >
                  {/* Gradient corner */}
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${benefit.gradient} rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="relative z-10 space-y-4">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center group-hover:bg-brand/20 group-hover:border-brand/20 transition-all duration-300">
                      <benefit.icon
                        size={20}
                        className="text-white/50 group-hover:text-white transition-colors duration-300"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEPARATOR ──────────────────────────────────────── */}
      <div className="gradient-line" />

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section
        id="funcionalidades"
        className="relative bg-[#0a0612] overflow-hidden"
      >
        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-24 lg:py-32">
          <div ref={revealFeatures} className="reveal space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-light/70">
                Funcionalidades
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Diseñado para la
                <br />
                <span className="text-gradient-gold">administración real.</span>
              </h2>
              <p className="text-base text-white/40 max-w-lg mx-auto">
                Cada módulo resuelve un problema concreto del día a día
                administrativo.
              </p>
            </div>

            {/* Feature cards - bento grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className={`reveal reveal-delay-${(i % 4) + 1} feature-card group rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 relative overflow-hidden`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative z-10 space-y-3">
                    <feature.icon
                      size={22}
                      className={`${feature.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`}
                      strokeWidth={1.5}
                    />
                    <h3 className="text-base font-semibold text-white/90">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MODULES SHOWCASE ───────────────────────────────── */}
      <section id="modulos" className="relative bg-[#0a0612]">
        <div className="gradient-line" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-24 lg:py-32">
          <div ref={revealModules} className="reveal space-y-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Description */}
              <div className="space-y-6">
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-light/70">
                  Módulos
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Todo el flujo administrativo
                  <br />
                  <span className="text-white/40">en un solo lugar.</span>
                </h2>
                <p className="text-base text-white/40 max-w-md leading-relaxed">
                  Edifika integra los módulos clave para la administración de
                  condominios, desde la gestión de unidades hasta la
                  contabilidad operativa.
                </p>

                <div className="pt-4">
                  <Link
                    href="/login?redirect=/app"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-light hover:text-white transition-colors"
                  >
                    Explorar la plataforma
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Right: Module grid */}
              <div className="grid grid-cols-2 gap-3">
                {modules.map((mod, i) => (
                  <div
                    key={i}
                    className={`reveal reveal-delay-${(i % 4) + 1} group rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3.5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300`}
                  >
                    <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                      {mod.name}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {mod.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL ────────────────────────────────────── */}
      <section className="relative bg-[#0a0612]">
        <div className="gradient-line" />

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand/8 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-4xl mx-auto px-5 lg:px-8 py-24 lg:py-32">
          <div ref={revealTestimonial} className="reveal text-center space-y-8">
            {/* Oversized quote mark */}
            <span className="block font-serif text-7xl lg:text-8xl text-brand/20 leading-none select-none">
              &ldquo;
            </span>

            <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium text-white/80 leading-snug -mt-8">
              Pasamos de perder tiempo armando reportes a tener todo listo para
              la asamblea en segundos.
            </blockquote>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-white/60">
                Administradora de condominio
              </p>
              <p className="text-xs text-white/30">
                Condominio residencial, 80 unidades
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────── */}
      <section className="relative bg-[#0a0612] overflow-hidden">
        <div className="gradient-line" />

        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand/15 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-brand-light/10 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 py-24 lg:py-32">
          <div ref={revealCta} className="reveal">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] px-8 py-14 lg:px-16 lg:py-20 text-center space-y-8 relative overflow-hidden">
              {/* Inner ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-brand/20 blur-[80px] rounded-full" />

              <div className="relative z-10 space-y-8">
                <div className="space-y-4">
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                    Tu condominio merece
                    <br />
                    <span className="text-gradient-gold">
                      mejor administración.
                    </span>
                  </h2>
                  <p className="text-base text-white/40 max-w-lg mx-auto">
                    Deja atrás las hojas de cálculo complicadas. Edifika te da
                    una estructura clara, lista para crecer con tu comunidad.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login?redirect=/app"
                    className="btn-glow inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-light transition-colors animate-glow-pulse"
                  >
                    Comenzar ahora
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                  >
                    Ingresar con demo
                  </Link>
                </div>

                <p className="text-xs text-white/20">
                  Sin tarjeta de crédito. Demo disponible con usuario de prueba.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="relative bg-[#060410] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 relative rounded-lg overflow-hidden bg-white/5 border border-white/5">
                <Image
                  src="/logos/edifika-logo.png"
                  alt="Edifika"
                  fill
                  sizes="36px"
                  className="object-contain p-1.5"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white/70">EDIFIKA</p>
                <p className="text-[10px] text-white/30">
                  Administración Inteligente
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-xs text-white/30">
              <a
                href="#beneficios"
                className="hover:text-white/60 transition-colors"
              >
                Beneficios
              </a>
              <a
                href="#funcionalidades"
                className="hover:text-white/60 transition-colors"
              >
                Funcionalidades
              </a>
              <a
                href="#modulos"
                className="hover:text-white/60 transition-colors"
              >
                Módulos
              </a>
              <Link
                href="/login"
                className="hover:text-white/60 transition-colors"
              >
                Acceder
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-[10px] text-white/20">
              © {new Date().getFullYear()} Edifika. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

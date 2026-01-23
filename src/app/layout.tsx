import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDIFIKA",
  description: "Plataforma de Administración de Conjuntos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50">
        {children}
      </body>
    </html>
  );
}
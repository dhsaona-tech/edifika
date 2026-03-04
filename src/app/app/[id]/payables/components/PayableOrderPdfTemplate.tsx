import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

/* ═══════════════════════════════════════════════════════════════
   EDIFIKA — Orden de Pago (OP) PDF
   Tecnología: @react-pdf/renderer (compatible con Vercel)
   ═══════════════════════════════════════════════════════════════ */

export type PayableOrderPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    ruc?: string | null;
  };
  edifikaLogoUrl?: string | null;
  payable: {
    folio?: string;
    supplier: string;
    expenseItem: string;
    issueDate: string;
    dueDate: string;
    invoice: string;
    total: string;
    detail?: string;
    plannedMethod?: string | null;
    plannedReference?: string | null;
  };
};

const brand = {
  primary: "#3c1d4e",
  primaryLt: "#5e3b75",
  primaryFaint: "#f5f0f8",
  slate900: "#0f172a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  white: "#ffffff",
  border: "#e5e7eb",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 80,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: brand.slate700,
    backgroundColor: brand.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: brand.primary,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    maxWidth: 320,
  },
  condoLogo: {
    width: 52,
    height: 52,
    objectFit: "contain",
    marginRight: 10,
  },
  condoName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
  },
  condoDetail: {
    fontSize: 8,
    color: brand.slate500,
    lineHeight: 1.6,
    marginTop: 3,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  docLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate400,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: "right",
  },
  folioNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    textAlign: "right",
  },

  banner: {
    backgroundColor: brand.primaryFaint,
    borderRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: brand.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  bannerText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1.5,
  },

  dataBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    marginBottom: 14,
    flexDirection: "row",
  },
  dataCol: {
    flex: 1,
    padding: 12,
  },
  dataColRight: {
    flex: 1,
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: brand.border,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  dataName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
    marginBottom: 5,
  },
  dataField: {
    fontSize: 8.5,
    color: brand.slate600,
    lineHeight: 1.7,
  },

  tableWrap: { marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    letterSpacing: 0.5,
  },
  thRight: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    letterSpacing: 0.5,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  td: { fontSize: 9, color: brand.slate700, flex: 3 },
  tdRight: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
    textAlign: "right",
    flex: 1,
  },
  tableBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: brand.border,
  },

  totalBox: {
    backgroundColor: brand.primary,
    borderRadius: 4,
    padding: 16,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
  },

  authSection: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  authHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  authRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  authCol: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
  },
  authLine: {
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: brand.slate400,
    marginBottom: 6,
  },
  authLabel: {
    fontSize: 8,
    color: brand.slate500,
  },

  pageFooter: {
    position: "absolute",
    bottom: 12,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: brand.slate200,
    paddingTop: 6,
    alignItems: "center",
  },
  footerBrand: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: brand.primaryLt,
    letterSpacing: 1,
    marginBottom: 3,
  },
  footerLogo: {
    width: 165,
    height: 52,
    objectFit: "contain",
    marginBottom: 2,
  },
  footerTagline: {
    fontSize: 7,
    color: brand.slate400,
    textAlign: "center",
  },
});

export default function PayableOrderPdfTemplate({
  condo,
  edifikaLogoUrl,
  payable,
}: PayableOrderPdfProps) {
  return (
    <Document
      title={`Orden de Pago ${payable.folio ? `OP-${payable.folio}` : ""} — ${condo.name}`}
      author="EDIFIKA"
      subject="Orden de Pago"
    >
      <Page size="A4" style={s.page}>
        {/* Footer fijo */}
        <View fixed style={s.pageFooter}>
          {edifikaLogoUrl ? (
            <Image src={edifikaLogoUrl} style={s.footerLogo} />
          ) : (
            <Text style={s.footerBrand}>EDIFIKA</Text>
          )}
          <Text style={s.footerTagline}>
            Generado por EDIFIKA {"\u2014"} Software de Administraci{"\u00F3"}n
          </Text>
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {condo.logoUrl ? (
              <Image src={condo.logoUrl} style={s.condoLogo} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={s.condoName}>{condo.name}</Text>
              <Text style={s.condoDetail}>
                {[
                  condo.ruc ? `RUC: ${condo.ruc}` : null,
                  condo.address || null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docLabel}>ORDEN DE PAGO</Text>
            <Text style={s.folioNumber}>
              {payable.folio ? `OP-${payable.folio}` : "Sin folio"}
            </Text>
          </View>
        </View>

        {/* Banner */}
        <View style={s.banner}>
          <Text style={s.bannerText}>ORDEN DE PAGO</Text>
        </View>

        {/* Datos: Proveedor + Factura */}
        <View style={s.dataBox}>
          <View style={s.dataCol}>
            <Text style={s.sectionLabel}>PROVEEDOR</Text>
            <Text style={s.dataName}>{payable.supplier}</Text>
            <Text style={s.dataField}>Rubro: {payable.expenseItem}</Text>
            {payable.plannedMethod && (
              <Text style={s.dataField}>
                Forma de pago: {payable.plannedMethod}
              </Text>
            )}
            {payable.plannedReference && (
              <Text style={s.dataField}>Ref: {payable.plannedReference}</Text>
            )}
          </View>
          <View style={s.dataColRight}>
            <Text style={s.sectionLabel}>FACTURA Y FECHAS</Text>
            <Text style={s.dataField}>Factura: {payable.invoice}</Text>
            <Text style={s.dataField}>
              Emisi{"\u00F3"}n: {payable.issueDate}
            </Text>
            <Text style={s.dataField}>Vencimiento: {payable.dueDate}</Text>
          </View>
        </View>

        {/* Tabla detalle */}
        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={{ flex: 3 }}>
              <Text style={s.th}>DETALLE</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.thRight}>MONTO</Text>
            </View>
          </View>
          <View style={s.tableBottom}>
            <View style={s.tableRow}>
              <Text style={s.td}>
                {payable.detail || "Gasto registrado"}
              </Text>
              <Text style={s.tdRight}>{payable.total}</Text>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={s.totalBox}>
          <Text style={s.totalLabel}>MONTO TOTAL A PAGAR</Text>
          <Text style={s.totalValue}>{payable.total}</Text>
        </View>

        {/* Firmas */}
        <View style={s.authSection} wrap={false}>
          <Text style={s.authHeader}>AUTORIZACIONES</Text>
          <View style={s.authRow}>
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authLabel}>Administrador / Presidente</Text>
            </View>
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authLabel}>Proveedor - Recepci{"\u00F3"}n conforme</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

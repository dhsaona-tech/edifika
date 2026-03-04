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
   EDIFIKA — Borrador de Cuenta por Pagar (Draft OP)
   Tecnología: @react-pdf/renderer (compatible con Vercel)
   ═══════════════════════════════════════════════════════════════ */

export type PayableDraftPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    fiscalId?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  edifikaLogoUrl?: string | null;
  documentType: string;
  supplier: {
    name: string;
    fiscalId?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
  };
  payable: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    expenseItem: string;
    description?: string | null;
    totalAmount: string;
    plannedMethod?: string | null;
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
  amber700: "#b45309",
  amber100: "#fef3c7",
  amber50: "#fffbeb",
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

  draftBanner: {
    borderWidth: 2,
    borderColor: brand.amber700,
    borderStyle: "dashed",
    borderRadius: 6,
    backgroundColor: brand.amber100,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  draftTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
    letterSpacing: 2,
  },
  draftSubtitle: {
    fontSize: 8,
    color: brand.amber700,
    marginTop: 4,
  },

  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    transform: "rotate(-35deg)",
    opacity: 0.05,
  },
  watermarkText: {
    fontSize: 80,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
    letterSpacing: 14,
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
  },
  docLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate400,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: "right",
  },
  docNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    textAlign: "right",
  },

  section: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "47%",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 7,
    color: brand.slate400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: brand.slate900,
    fontFamily: "Helvetica-Bold",
  },

  descriptionBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  descriptionText: {
    fontSize: 9,
    color: brand.slate600,
    lineHeight: 1.5,
  },

  totalBox: {
    backgroundColor: brand.primary,
    borderRadius: 6,
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
  },

  authSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
  },
  authCol: {
    flex: 1,
    alignItems: "center",
    paddingTop: 50,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: brand.slate400,
    lineHeight: 1.5,
  },
  footerBrand: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: brand.primaryLt,
    letterSpacing: 1,
  },
  footerLogo: {
    width: 80,
    height: 26,
    objectFit: "contain",
  },
});

export default function PayableDraftPdfTemplate({
  condo,
  edifikaLogoUrl,
  documentType,
  supplier,
  payable,
}: PayableDraftPdfProps) {
  const today = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document
      title={`Borrador - ${payable.invoiceNumber} — ${condo.name}`}
      author="EDIFIKA"
      subject="Borrador de Cuenta por Pagar"
    >
      <Page size="A4" style={s.page}>
        {/* Watermark */}
        <View fixed style={s.watermark}>
          <Text style={s.watermarkText}>BORRADOR</Text>
        </View>

        {/* Footer fijo */}
        <View fixed style={s.pageFooter}>
          <View>
            <Text style={s.footerText}>Generado el {today}</Text>
            <Text style={s.footerText}>
              Este documento es un borrador y no tiene validez contable.
            </Text>
          </View>
          {edifikaLogoUrl ? (
            <Image src={edifikaLogoUrl} style={s.footerLogo} />
          ) : (
            <Text style={s.footerBrand}>EDIFIKA</Text>
          )}
        </View>

        {/* Draft Banner */}
        <View style={s.draftBanner}>
          <Text style={s.draftTitle}>
            {"\u26A0\uFE0F"} BORRADOR - PENDIENTE DE PAGO
          </Text>
          <Text style={s.draftSubtitle}>
            Este documento NO es un comprobante de pago. Es solo para
            autorizaci{"\u00F3"}n previa.
          </Text>
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {condo.logoUrl ? (
              <Image src={condo.logoUrl} style={s.condoLogo} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={s.condoName}>{condo.name || "Condominio"}</Text>
              <Text style={s.condoDetail}>
                {[
                  condo.fiscalId ? `RUC: ${condo.fiscalId}` : null,
                  condo.address || null,
                  condo.phone ? `Tel: ${condo.phone}` : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docLabel}>{documentType.toUpperCase()}</Text>
            <Text style={s.docNumber}>{payable.invoiceNumber}</Text>
          </View>
        </View>

        {/* Proveedor */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>PROVEEDOR</Text>
          <View style={s.grid}>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>NOMBRE</Text>
              <Text style={s.fieldValue}>{supplier.name || "-"}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>RUC / ID</Text>
              <Text style={s.fieldValue}>{supplier.fiscalId || "-"}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>CONTACTO</Text>
              <Text style={s.fieldValue}>
                {supplier.contactPerson || "-"}
              </Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>TEL{"\u00C9"}FONO</Text>
              <Text style={s.fieldValue}>{supplier.phone || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Detalle del gasto */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DETALLE DEL GASTO</Text>
          <View style={s.grid}>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>RUBRO</Text>
              <Text style={s.fieldValue}>{payable.expenseItem}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>FECHA DE EMISI{"\u00D3"}N</Text>
              <Text style={s.fieldValue}>{payable.issueDate}</Text>
            </View>
            <View style={s.gridItem}>
              <Text style={s.fieldLabel}>FECHA DE VENCIMIENTO</Text>
              <Text style={s.fieldValue}>{payable.dueDate}</Text>
            </View>
            {payable.plannedMethod && (
              <View style={s.gridItem}>
                <Text style={s.fieldLabel}>FORMA DE PAGO PREVISTA</Text>
                <Text style={s.fieldValue}>{payable.plannedMethod}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Descripción */}
        {payable.description && (
          <View style={s.descriptionBox}>
            <Text style={s.sectionLabel}>
              DESCRIPCI{"\u00D3"}N / JUSTIFICACI{"\u00D3"}N
            </Text>
            <Text style={s.descriptionText}>{payable.description}</Text>
          </View>
        )}

        {/* Total */}
        <View style={s.totalBox}>
          <Text style={s.totalLabel}>MONTO TOTAL A PAGAR</Text>
          <Text style={s.totalValue}>{payable.totalAmount}</Text>
        </View>

        {/* Firmas */}
        <View style={s.authSection} wrap={false}>
          <View style={s.authCol}>
            <View style={s.authLine} />
            <Text style={s.authLabel}>Autorizado por</Text>
          </View>
          <View style={s.authCol}>
            <View style={s.authLine} />
            <Text style={s.authLabel}>Fecha de autorizaci{"\u00F3"}n</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

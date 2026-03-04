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
   EDIFIKA — Comprobante de Egreso
   Diseño Corporativo v3
   Tecnología: @react-pdf/renderer
   ═══════════════════════════════════════════════════════════════ */

/* ─── Exported Types ─── */

export type EgressAllocation = {
  invoice: string;
  issueDate?: string | null;
  expenseItem?: string | null;
  description?: string | null;
  amount: string;
};

export type EgressPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  edifikaLogoUrl?: string | null;
  isVoided?: boolean;
  cancellationReason?: string | null;
  creatorName?: string | null;
  supplier: {
    name: string;
    ruc?: string | null;
    contact?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  egress: {
    folio: string;
    paymentDate: string;
    paymentDateFormatted?: string;
    method: string;
    reference?: string | null;
    account: string;
    accountNumber?: string | null;
    total: string;
    notes?: string | null;
  };
  allocations: EgressAllocation[];
};

/* ─── Brand Palette ─── */

const brand = {
  primary: "#3c1d4e",
  primaryLt: "#5e3b75",
  primaryDk: "#2a1438",
  primaryFaint: "#f5f0f8",

  slate900: "#0f172a",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  white: "#ffffff",

  red700: "#b91c1c",
  red600: "#dc2626",
  red50: "#fef2f2",

  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  rowAlt: "#faf9fb",
};

/* ─── StyleSheet ─── */

const s = StyleSheet.create({
  /* ─ Page ─ */
  page: {
    paddingTop: 32,
    paddingBottom: 96,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: brand.slate700,
    backgroundColor: brand.white,
  },

  /* ─ Header ─ */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
    paddingBottom: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: brand.primary,
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
  condoTextBlock: {
    flex: 1,
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
    minHeight: 55,
  },
  docLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate400,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: "right",
  },
  folioNumberBig: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    lineHeight: 1,
    textAlign: "right",
  },
  headerDate: {
    fontSize: 8.5,
    color: brand.slate500,
    marginTop: 4,
    textAlign: "right",
  },

  /* ─ Title Banner ─ */
  banner: {
    backgroundColor: brand.primaryFaint,
    borderRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: brand.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  bannerText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1.5,
  },

  /* ─ Voided Banner ─ */
  voidedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: brand.red600,
    borderRadius: 4,
    backgroundColor: brand.red50,
  },
  voidedIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  voidedTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.red700,
  },
  voidedDesc: {
    fontSize: 8,
    color: brand.red700,
    marginTop: 2,
    lineHeight: 1.4,
  },

  /* ─ Voided Watermark ─ */
  watermark: {
    position: "absolute",
    top: "38%",
    left: "12%",
    transform: "rotate(-35deg)",
    opacity: 0.07,
  },
  watermarkText: {
    fontSize: 76,
    fontFamily: "Helvetica-Bold",
    color: brand.red600,
    letterSpacing: 14,
  },

  /* ─ Data Box (Beneficiario) ─ */
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
    justifyContent: "center",
    alignItems: "center",
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
  dataFieldBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate700,
  },
  /* Summary total in data box right */
  summaryDateLabel: {
    fontSize: 8,
    color: brand.slate500,
    marginBottom: 2,
    textAlign: "center",
  },
  summaryDateValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
    textAlign: "center",
    marginBottom: 12,
  },
  summaryTotalLabel: {
    fontSize: 8,
    color: brand.slate500,
    marginBottom: 2,
    textAlign: "center",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    textAlign: "center",
  },

  /* ─ Table ─ */
  tableWrap: {
    marginBottom: 4,
  },
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
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  tableRowAlt: {
    backgroundColor: brand.rowAlt,
  },
  td: {
    fontSize: 8,
    color: brand.slate700,
  },
  tdRight: {
    fontSize: 8,
    color: brand.slate700,
    textAlign: "right",
  },
  tdBoldRight: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
    textAlign: "right",
  },
  tableBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: brand.border,
  },

  /* Column flex proportions (5 columns for egress) */
  colFactura: { flex: 1.2 },
  colFecha: { flex: 1.0 },
  colRubro: { flex: 1.5 },
  colDetalle: { flex: 2.8 },
  colMonto: { flex: 1.2 },

  /* ─ Forma de Pago Section ─ */
  formaPagoBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    marginTop: 14,
    marginBottom: 14,
    padding: 14,
  },
  formaPagoHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  formaPagoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  formaPagoLabel: {
    fontSize: 9,
    color: brand.slate500,
    width: 140,
  },
  formaPagoValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.slate700,
    flex: 1,
  },

  /* ─ Autorizaciones Section ─ */
  authSection: {
    marginTop: 10,
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
    paddingTop: 30,
  },
  authLine: {
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: brand.slate400,
    marginBottom: 6,
  },
  authFirmaLabel: {
    fontSize: 8,
    color: brand.slate500,
    marginBottom: 10,
  },
  authRoleLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.slate700,
    marginBottom: 4,
  },
  authFieldLabel: {
    fontSize: 8,
    color: brand.slate600,
    marginBottom: 2,
    alignSelf: "flex-start",
    paddingLeft: 8,
  },

  /* ─ Notes ─ */
  notesBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 10,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: brand.slate600,
    lineHeight: 1.5,
  },

  /* ─ Page Footer (fixed on every page) ─ */
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
  footerLogo: {
    width: 165,
    height: 52,
    objectFit: "contain",
    marginBottom: 2,
  },
  footerBrandFallback: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: brand.primaryLt,
    letterSpacing: 1,
    marginBottom: 3,
  },
  footerTagline: {
    fontSize: 7,
    color: brand.slate400,
    textAlign: "center",
  },

  /* ─ Creator line ─ */
  creatorLine: {
    marginTop: 14,
    fontSize: 8,
    color: brand.slate500,
  },
});

/* ═══════════════════════════════════════════════════════
   Main Document Component
   ═══════════════════════════════════════════════════════ */

export default function EgressPdfTemplate({
  condo,
  edifikaLogoUrl,
  isVoided = false,
  cancellationReason,
  creatorName,
  supplier,
  egress,
  allocations,
}: EgressPdfProps) {
  const paymentMethodLabel = (() => {
    const labels: Record<string, string> = {
      transferencia: "Transferencia Bancaria",
      deposito: "Deposito Bancario",
      efectivo: "Efectivo",
      cheque: "Cheque",
      tarjeta: "Tarjeta",
      otros: "Otros",
    };
    return labels[egress.method] || egress.method || "\u2014";
  })();

  const dateDisplay = egress.paymentDateFormatted || egress.paymentDate;

  return (
    <Document
      title={`Egreso EG-${egress.folio} \u2014 ${condo.name}`}
      author="EDIFIKA"
      subject="Comprobante de Egreso"
    >
      <Page size="A4" style={s.page}>
        {/* ── Watermark (voided) ── */}
        {isVoided && (
          <View fixed style={s.watermark}>
            <Text style={s.watermarkText}>ANULADO</Text>
          </View>
        )}

        {/* ── Page Footer (fixed = every page) ── */}
        <View fixed style={s.pageFooter}>
          {edifikaLogoUrl ? (
            <Image src={edifikaLogoUrl} style={s.footerLogo} />
          ) : (
            <Text style={s.footerBrandFallback}>EDIFIKA</Text>
          )}
          <Text style={s.footerTagline}>
            Generado por EDIFIKA {"\u2014"} Software de Administraci{"\u00F3"}n
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════
            HEADER: Condo identity LEFT  |  Egress info RIGHT
            ══════════════════════════════════════════════════════ */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {condo.logoUrl ? (
              <Image src={condo.logoUrl} style={s.condoLogo} />
            ) : null}
            <View style={s.condoTextBlock}>
              <Text style={s.condoName}>{condo.name}</Text>
              <Text style={s.condoDetail}>
                {[
                  condo.ruc ? `RUC: ${condo.ruc}` : null,
                  condo.address || null,
                  condo.phone ? `Tel: ${condo.phone}` : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            <Text style={s.docLabel}>COMPROBANTE DE EGRESO</Text>
            <Text style={s.folioNumberBig}>
              EG-{egress.folio}
            </Text>
          </View>
        </View>

        {/* ── Title Banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerText}>COMPROBANTE DE EGRESO</Text>
        </View>

        {/* ── Voided Alert ── */}
        {isVoided && (
          <View style={s.voidedBanner}>
            <Text style={s.voidedIcon}>{"\u26A0"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.voidedTitle}>DOCUMENTO ANULADO</Text>
              <Text style={s.voidedDesc}>
                {
                  "Este comprobante ha sido anulado y no tiene validez contable."
                }
                {cancellationReason
                  ? ` Motivo: ${cancellationReason}`
                  : ""}
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            DATA BOX: Supplier LEFT  |  Payment Info RIGHT
            ══════════════════════════════════════════════════════ */}
        <View style={s.dataBox}>
          {/* Left: Supplier / Beneficiario */}
          <View style={s.dataCol}>
            <Text style={s.sectionLabel}>BENEFICIARIO</Text>
            <Text style={s.dataName}>{supplier.name}</Text>
            <Text style={s.dataField}>
              {[
                supplier.ruc ? `RUC/ID: ${supplier.ruc}` : null,
                supplier.contact ? `Contacto: ${supplier.contact}` : null,
                supplier.phone ? `Tel\u00E9fono: ${supplier.phone}` : null,
                supplier.email ? `Correo: ${supplier.email}` : null,
                supplier.address ? `Direcci\u00F3n: ${supplier.address}` : null,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>

          {/* Right: Date + Total summary */}
          <View style={s.dataColRight}>
            <Text style={s.summaryDateLabel}>FECHA DEL PAGO</Text>
            <Text style={s.summaryDateValue}>{dateDisplay}</Text>
            <Text style={s.summaryTotalLabel}>TOTAL PAGADO</Text>
            <Text style={s.summaryTotalValue}>{egress.total}</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            ALLOCATIONS TABLE — Facturas Pagadas
            ══════════════════════════════════════════════════════ */}
        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={s.colFactura}>
              <Text style={s.th}>FACTURA</Text>
            </View>
            <View style={s.colFecha}>
              <Text style={s.th}>FECHA</Text>
            </View>
            <View style={s.colRubro}>
              <Text style={s.th}>RUBRO</Text>
            </View>
            <View style={s.colDetalle}>
              <Text style={s.th}>DETALLE</Text>
            </View>
            <View style={s.colMonto}>
              <Text style={s.thRight}>MONTO</Text>
            </View>
          </View>

          <View style={s.tableBottom}>
            {allocations.length === 0 ? (
              <View style={[s.tableRow, { justifyContent: "center" }]}>
                <Text style={[s.td, { textAlign: "center", flex: 1 }]}>
                  Sin asignaciones
                </Text>
              </View>
            ) : (
              allocations.map((a, i) => (
                <View
                  key={i}
                  style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                  wrap={false}
                >
                  <View style={s.colFactura}>
                    <Text style={s.td}>{a.invoice || "\u2014"}</Text>
                  </View>
                  <View style={s.colFecha}>
                    <Text style={s.td}>{a.issueDate || "\u2014"}</Text>
                  </View>
                  <View style={s.colRubro}>
                    <Text style={s.td}>{a.expenseItem || "\u2014"}</Text>
                  </View>
                  <View style={s.colDetalle}>
                    <Text style={s.td}>{a.description || "\u2014"}</Text>
                  </View>
                  <View style={s.colMonto}>
                    <Text style={s.tdBoldRight}>{a.amount}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            FORMA DE PAGO EN DOLARES
            ══════════════════════════════════════════════════════ */}
        <View style={s.formaPagoBox} wrap={false}>
          <Text style={s.formaPagoHeader}>FORMA DE PAGO</Text>
          <View style={s.formaPagoRow}>
            <Text style={s.formaPagoLabel}>Forma de pago:</Text>
            <Text style={s.formaPagoValue}>{paymentMethodLabel}</Text>
          </View>
          {egress.reference && egress.reference !== "-" ? (
            <View style={s.formaPagoRow}>
              <Text style={s.formaPagoLabel}>Nro. documento/cheque:</Text>
              <Text style={s.formaPagoValue}>{egress.reference}</Text>
            </View>
          ) : null}
          <View style={s.formaPagoRow}>
            <Text style={s.formaPagoLabel}>Cuenta bancaria:</Text>
            <Text style={s.formaPagoValue}>
              {egress.account}
              {egress.accountNumber && egress.accountNumber !== "-"
                ? ` \u2014 ${egress.accountNumber}`
                : ""}
            </Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {egress.notes && (
          <View style={s.notesBox} wrap={false}>
            <Text style={s.notesLabel}>OBSERVACIONES</Text>
            <Text style={s.notesText}>{egress.notes}</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            AUTORIZACIONES (signature lines — Habitanto style)
            ══════════════════════════════════════════════════════ */}
        <View style={s.authSection} wrap={false}>
          <Text style={s.authHeader}>AUTORIZACIONES</Text>
          <View style={s.authRow}>
            {/* Revisado por */}
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Revisado por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
            {/* Autorizado por */}
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Autorizado por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
            {/* Recibido por */}
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Recibido por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
          </View>
        </View>

        {/* ── Creator (left-aligned, below all content) ── */}
        {creatorName ? (
          <Text style={s.creatorLine}>
            Elaborado por: {creatorName}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}

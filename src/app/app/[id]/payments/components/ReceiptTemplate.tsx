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
   EDIFIKA — Comprobante de Pago (Ingresos)
   Dise\u00F1o Corporativo v3
   Tecnolog\u00EDa: @react-pdf/renderer
   ═══════════════════════════════════════════════════════════════ */

/* ─── Exported Types ─── */

export type ReceiptAllocation = {
  unidad: string;
  rubro: string;
  detalle: string;
  valor: string;
  descuento: string;
  pago: string;
};

export type ReceiptPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  receiptNumber: string;
  isVoided?: boolean;
  cancellationReason?: string | null;
  edifikaLogoUrl?: string | null;
  creatorName?: string | null;
  payment: {
    paymentDate: string;
    paymentDateFormatted?: string;
    method: string;
    reference: string;
    account: string;
    accountNumber: string;
    total: string;
    subtotal: string;
    discount?: string;
    creditGenerated?: string | null;
    notes?: string | null;
  };
  payer: {
    name: string;
    id?: string | null;
    phone?: string | null;
    email?: string | null;
    unit?: string | null;
    address?: string | null;
  };
  allocations: ReceiptAllocation[];
  unitPendingBalance?: string | null;
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

  green700: "#15803d",
  green50: "#f0fdf4",

  amber700: "#b45309",
  amber50: "#fffbeb",

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
  /* Left: Condo identity */
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
  /* Right: Receipt identity */
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
  receiptNumberBig: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    lineHeight: 1,
    textAlign: "right",
  },
  receiptDate: {
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

  /* ─ Data Box ─ */
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
  dataFieldBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate700,
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

  /* Column flex proportions */
  colUnidad: { flex: 1.3 },
  colRubro: { flex: 1.6 },
  colDetalle: { flex: 2.5 },
  colValor: { flex: 1.2 },
  colDescuento: { flex: 1.0 },
  colPago: { flex: 1.2 },

  /* ─ Totals Section ─ */
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalsBox: {
    minWidth: 200,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: brand.slate50,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: brand.slate500,
  },
  totalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.slate700,
  },
  totalGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 7,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: brand.primary,
  },
  totalGrandLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
  },
  totalGrandValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
  },

  /* ─ Credit / Pending Balance ─ */
  balanceSummary: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  balanceBox: {
    minWidth: 200,
    borderRadius: 4,
    padding: 8,
  },
  creditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: brand.green50,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: brand.green700,
    marginBottom: 4,
  },
  creditLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
  },
  creditValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: brand.amber50,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: brand.amber700,
  },
  pendingLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
  },
  pendingValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
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
  /* ─ Creator line (in document body, left-aligned) ─ */
  creatorLine: {
    marginTop: 14,
    fontSize: 8,
    color: brand.slate500,
  },
});

/* ═══════════════════════════════════════════════════════
   Main Document Component
   ═══════════════════════════════════════════════════════ */

export default function ReceiptTemplate({
  condo,
  receiptNumber,
  isVoided = false,
  cancellationReason,
  edifikaLogoUrl,
  creatorName,
  payment,
  payer,
  allocations,
  unitPendingBalance,
}: ReceiptPdfProps) {
  const paymentMethodLabel = (() => {
    const labels: Record<string, string> = {
      transferencia: "Transferencia Bancaria",
      deposito: "Dep\u00F3sito Bancario",
      efectivo: "Efectivo",
      cheque: "Cheque",
      tarjeta: "Tarjeta",
      otros: "Otros",
    };
    return labels[payment.method] || payment.method || "\u2014";
  })();

  const dateDisplay = payment.paymentDateFormatted || payment.paymentDate;

  const showBalanceSummary = !!payment.creditGenerated || !!unitPendingBalance;

  return (
    <Document
      title={`Recibo ${receiptNumber} \u2014 ${condo.name}`}
      author="EDIFIKA"
      subject="Comprobante de Pago"
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
            HEADER: Condo identity LEFT  |  Receipt info RIGHT
            ══════════════════════════════════════════════════════ */}
        <View style={s.header}>
          {/* Left: Condo logo + name + info */}
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

          {/* Right: Receipt number */}
          <View style={s.headerRight}>
            <Text style={s.docLabel}>COMPROBANTE DE PAGO</Text>
            <Text style={s.receiptNumberBig}>
              Nro. {receiptNumber}
            </Text>
          </View>
        </View>

        {/* ── Title Banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerText}>COMPROBANTE DE PAGO</Text>
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
            DATA BOX: Payer LEFT  |  Payment Info RIGHT
            ══════════════════════════════════════════════════════ */}
        <View style={s.dataBox}>
          {/* Left: Payer */}
          <View style={s.dataCol}>
            <Text style={s.sectionLabel}>{"RECIB\u00CD DE"}</Text>
            <Text style={s.dataName}>{payer.name}</Text>
            <Text style={s.dataField}>
              {[
                payer.id ? `Identificaci\u00F3n: ${payer.id}` : null,
                payer.unit ? `Unidad: ${payer.unit}` : null,
                payer.phone ? `Tel\u00E9fono: ${payer.phone}` : null,
                payer.email ? `Correo: ${payer.email}` : null,
                payer.address ? `Direcci\u00F3n: ${payer.address}` : null,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>

          {/* Right: Payment Info (unified) */}
          <View style={s.dataColRight}>
            <Text style={s.sectionLabel}>{"INFORMACI\u00D3N DEL PAGO"}</Text>
            <Text style={s.dataField}>
              {`Fecha: `}
              <Text style={s.dataFieldBold}>{dateDisplay}</Text>
            </Text>
            <Text style={s.dataField}>
              {`M\u00E9todo: `}
              <Text style={s.dataFieldBold}>{paymentMethodLabel}</Text>
            </Text>
            {payment.reference && payment.reference !== "-" ? (
              <Text style={s.dataField}>
                {`Referencia: `}
                <Text style={s.dataFieldBold}>{payment.reference}</Text>
              </Text>
            ) : null}
            <Text style={s.dataField}>
              {`Cuenta: `}
              <Text style={s.dataFieldBold}>
                {payment.account}
                {payment.accountNumber && payment.accountNumber !== "-"
                  ? ` \u2014 ${payment.accountNumber}`
                  : ""}
              </Text>
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            ALLOCATIONS TABLE
            ══════════════════════════════════════════════════════ */}
        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={s.colUnidad}>
              <Text style={s.th}>UNIDAD</Text>
            </View>
            <View style={s.colRubro}>
              <Text style={s.th}>RUBRO</Text>
            </View>
            <View style={s.colDetalle}>
              <Text style={s.th}>DETALLE</Text>
            </View>
            <View style={s.colValor}>
              <Text style={s.thRight}>VALOR</Text>
            </View>
            <View style={s.colDescuento}>
              <Text style={s.thRight}>DESCT.</Text>
            </View>
            <View style={s.colPago}>
              <Text style={s.thRight}>PAGO</Text>
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
                  <View style={s.colUnidad}>
                    <Text style={s.td}>{a.unidad || "\u2014"}</Text>
                  </View>
                  <View style={s.colRubro}>
                    <Text style={s.td}>{a.rubro}</Text>
                  </View>
                  <View style={s.colDetalle}>
                    <Text style={s.td}>{a.detalle}</Text>
                  </View>
                  <View style={s.colValor}>
                    <Text style={s.tdRight}>{a.valor}</Text>
                  </View>
                  <View style={s.colDescuento}>
                    <Text style={s.tdRight}>{a.descuento}</Text>
                  </View>
                  <View style={s.colPago}>
                    <Text style={s.tdBoldRight}>{a.pago}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            TOTALS
            ══════════════════════════════════════════════════════ */}
        <View style={s.totalsSection} wrap={false}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{payment.subtotal}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Descuentos</Text>
              <Text style={s.totalValue}>
                {payment.discount || "$0.00"}
              </Text>
            </View>
            <View style={s.totalGrandRow}>
              <Text style={s.totalGrandLabel}>TOTAL PAGADO</Text>
              <Text style={s.totalGrandValue}>{payment.total}</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            SALDO A FAVOR / SALDO PENDIENTE
            ══════════════════════════════════════════════════════ */}
        {showBalanceSummary && (
          <View style={s.balanceSummary} wrap={false}>
            <View style={s.balanceBox}>
              {payment.creditGenerated && (
                <View style={s.creditRow}>
                  <Text style={s.creditLabel}>Saldo a favor generado</Text>
                  <Text style={s.creditValue}>{payment.creditGenerated}</Text>
                </View>
              )}
              {unitPendingBalance && (
                <View style={s.pendingRow}>
                  <Text style={s.pendingLabel}>Saldo pendiente</Text>
                  <Text style={s.pendingValue}>{unitPendingBalance}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Notes ── */}
        {payment.notes && (
          <View style={s.notesBox} wrap={false}>
            <Text style={s.notesLabel}>OBSERVACIONES</Text>
            <Text style={s.notesText}>{payment.notes}</Text>
          </View>
        )}

        {/* ── Creator (left-aligned, below all content) ── */}
        {creatorName ? (
          <Text style={s.creatorLine}>
            Comprobante creado por: {creatorName}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}

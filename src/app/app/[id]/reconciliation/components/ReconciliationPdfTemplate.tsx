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
   EDIFIKA — Conciliación Bancaria
   Diseño Corporativo v3
   Tecnología: @react-pdf/renderer
   ═══════════════════════════════════════════════════════════════ */

/* ─── Exported Types ─── */

export type ReconciliationItemRow = {
  date: string;
  comprobante: string;
  contact: string;
  unit: string;
  detail: string;
  nroDocumento: string;
  paymentMethod: string;
  type: "ingreso" | "egreso";
  amount: string;
  isCheckPending?: boolean;
};

export type CheckInTransitRow = {
  date: string;
  reference: string;
  description: string;
  amount: string;
};

export type ReconciliationPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  edifikaLogoUrl?: string | null;
  creatorName?: string | null;
  reconciliation: {
    cutoffDate: string;
    periodStart: string;
    periodEnd: string;
    accountName: string;
    accountNumber?: string | null;
    status: string;
    statusLabel: string;
    notes?: string | null;
    description?: string | null;
  };
  summary: {
    saldoInicial: string;
    totalIngresos: string;
    totalEgresos: string;
    totalChequesTransito: string;
    chequesTransitoCount: number;
    saldoEnLibros: string;
    saldoBanco: string;
    diferencia: string;
    isDiferenciaCero: boolean;
  };
  items: ReconciliationItemRow[];
  chequesEnTransito: CheckInTransitRow[];
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

  green700: "#15803d",
  green100: "#dcfce7",
  amber700: "#b45309",
  amber100: "#fef3c7",
  red700: "#b91c1c",
  red600: "#dc2626",

  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  rowAlt: "#faf9fb",
};

/* ─── StyleSheet ─── */

const s = StyleSheet.create({
  /* ─ Page (Landscape A4) ─ */
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 8,
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
    maxWidth: 300,
  },
  condoLogo: {
    width: 48,
    height: 48,
    objectFit: "contain",
    marginRight: 10,
  },
  condoTextBlock: { flex: 1 },
  condoName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
  },
  condoDetail: {
    fontSize: 7.5,
    color: brand.slate500,
    lineHeight: 1.6,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    minHeight: 50,
  },
  docLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.slate400,
    letterSpacing: 1.5,
    marginBottom: 2,
    textAlign: "right",
  },
  headerCondoName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    textAlign: "right",
    marginBottom: 2,
  },
  headerPeriod: {
    fontSize: 9,
    color: brand.slate600,
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

  /* ─ Info Box ─ */
  infoBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  infoBoxLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoCell: {
    width: "33%",
    marginBottom: 5,
  },
  infoCellLabel: {
    fontSize: 7,
    color: brand.slate500,
  },
  infoCellValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
  },
  statusBadgeConciliada: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
    backgroundColor: brand.green100,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  statusBadgeBorrador: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
    backgroundColor: brand.amber100,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 2,
    alignSelf: "flex-start",
  },

  /* ─ Summary Box ─ */
  summaryBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    marginBottom: 14,
    flexDirection: "row",
  },
  summaryCol: {
    flex: 1,
    padding: 12,
  },
  summaryColRight: {
    flex: 1,
    padding: 12,
    borderLeftWidth: 1,
    borderLeftColor: brand.border,
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  summaryRowLabel: {
    fontSize: 8,
    color: brand.slate600,
  },
  summaryRowValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.slate900,
  },
  summaryRowValueGreen: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
  },
  summaryRowValueRed: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: brand.red600,
  },
  summaryHighlight: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: brand.primaryFaint,
  },
  summaryHighlightLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
  },
  summaryHighlightValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
  },
  diferenciaCero: {
    backgroundColor: brand.green100,
  },
  diferenciaNoZero: {
    backgroundColor: brand.amber100,
  },
  diferenciaCeroLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
  },
  diferenciaCeroValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
  },
  diferenciaNoZeroLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
  },
  diferenciaNoZeroValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
  },

  /* ─ Section Title ─ */
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 10,
  },
  sectionTitleAmber: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.amber700,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 14,
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
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    letterSpacing: 0.4,
  },
  thRight: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    letterSpacing: 0.4,
    textAlign: "right",
  },
  thCenter: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  tableRowAlt: {
    backgroundColor: brand.rowAlt,
  },
  td: {
    fontSize: 7,
    color: brand.slate700,
  },
  tdRight: {
    fontSize: 7,
    color: brand.slate700,
    textAlign: "right",
  },
  tdBoldGreen: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
    textAlign: "right",
  },
  tdBoldRed: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.red600,
    textAlign: "right",
  },
  tdCenterGreen: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
    textAlign: "center",
  },
  tdCenterRed: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.red600,
    textAlign: "center",
  },
  tableBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: brand.border,
  },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: brand.slate100,
    borderTopWidth: 2,
    borderTopColor: brand.slate300,
  },

  /* Column flex — Transactions (8 cols) */
  colFecha: { flex: 0.55, paddingRight: 5 },
  colComprobante: { flex: 0.4, paddingRight: 5 },
  colContacto: { flex: 1.7, paddingRight: 5 },
  colUnidad: { flex: 0.7, paddingRight: 8 },
  colDetalle: { flex: 2.3, paddingRight: 5 },
  colNroDoc: { flex: 0.6, paddingRight: 5 },
  colFormaPago: { flex: 0.75, paddingRight: 5 },
  colValor: { flex: 0.65 },

  /* Column flex — Cheques (4 cols) */
  colChFecha: { flex: 1 },
  colChRef: { flex: 1.2 },
  colChDesc: { flex: 3 },
  colChMonto: { flex: 1.2 },

  /* ─ Cruce Verification Box ─ */
  cruceBox: {
    borderWidth: 1.5,
    borderColor: brand.primary,
    borderRadius: 4,
    padding: 14,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: brand.primaryFaint,
  },
  cruceTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 10,
  },
  cruceRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cruceItem: {
    backgroundColor: brand.white,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: brand.border,
    minWidth: 120,
  },
  cruceItemLabel: {
    fontSize: 6.5,
    color: brand.slate500,
    marginBottom: 3,
  },
  cruceItemValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
  },
  cruceOp: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: brand.slate400,
  },

  /* ─ Status Message ─ */
  statusMessageBox: {
    borderWidth: 1,
    borderColor: brand.green700,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: brand.green100,
  },
  statusMessageText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
    textAlign: "center",
  },

  /* ─ Notes ─ */
  notesBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
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

  /* ─ Autorizaciones ─ */
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

  /* ─ EDIFIKA Footer (end of document, pushed to page bottom) ─ */
  edifikaFooter: {
    marginTop: "auto",
    borderTopWidth: 0.5,
    borderTopColor: brand.slate200,
    paddingTop: 8,
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

  /* ─ Creator ─ */
  creatorLine: {
    marginTop: 14,
    fontSize: 8,
    color: brand.slate500,
  },

  /* ─ Empty state ─ */
  emptyText: {
    fontSize: 8,
    color: brand.slate400,
    textAlign: "center",
    paddingVertical: 16,
  },
});

/* ═══════════════════════════════════════════════════════
   Main Document Component
   ═══════════════════════════════════════════════════════ */

export default function ReconciliationPdfTemplate({
  condo,
  edifikaLogoUrl,
  creatorName,
  reconciliation,
  summary,
  items,
  chequesEnTransito,
}: ReconciliationPdfProps) {
  return (
    <Document
      title={`Conciliaci\u00F3n Bancaria \u2014 ${reconciliation.cutoffDate} \u2014 ${condo.name}`}
      author="EDIFIKA"
      subject="Conciliaci\u00F3n Bancaria"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ══════════════════════════════════════════════════════
            HEADER
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
            <Text style={s.docLabel}>{"CONCILIACI\u00D3N BANCARIA"}</Text>
            <Text style={s.headerCondoName}>{condo.name}</Text>
            {reconciliation.description ? (
              <Text style={s.headerPeriod}>{reconciliation.description}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Title Banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerText}>{"CONCILIACI\u00D3N BANCARIA"}</Text>
        </View>

        {/* ══════════════════════════════════════════════════════
            INFO BOX
            ══════════════════════════════════════════════════════ */}
        <View style={s.infoBox}>
          <Text style={s.infoBoxLabel}>{"INFORMACI\u00D3N DE LA CONCILIACI\u00D3N"}</Text>
          <View style={s.infoGrid}>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Fecha de corte</Text>
              <Text style={s.infoCellValue}>{reconciliation.cutoffDate}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Estado</Text>
              <Text
                style={
                  reconciliation.status === "conciliada"
                    ? s.statusBadgeConciliada
                    : s.statusBadgeBorrador
                }
              >
                {reconciliation.statusLabel}
              </Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Cuenta</Text>
              <Text style={s.infoCellValue}>
                {reconciliation.accountName}
                {reconciliation.accountNumber
                  ? ` \u2014 ${reconciliation.accountNumber}`
                  : ""}
              </Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>{"Per\u00EDodo"}</Text>
              <Text style={s.infoCellValue}>
                {reconciliation.periodStart} {"\u2014"} {reconciliation.periodEnd}
              </Text>
            </View>
            {reconciliation.description ? (
              <View style={s.infoCell}>
                <Text style={s.infoCellLabel}>{"Descripci\u00F3n"}</Text>
                <Text style={s.infoCellValue}>{reconciliation.description}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            RESUMEN FINANCIERO
            ══════════════════════════════════════════════════════ */}
        <View style={s.summaryBox}>
          {/* Left column */}
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>RESUMEN FINANCIERO</Text>

            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Saldo Inicial Conciliado</Text>
              <Text style={s.summaryRowValue}>{summary.saldoInicial}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>(+) {"Dep\u00F3sitos"} Conciliados</Text>
              <Text style={s.summaryRowValueGreen}>+{summary.totalIngresos}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>(-) Retiros Conciliados</Text>
              <Text style={s.summaryRowValueRed}>-{summary.totalEgresos}</Text>
            </View>

            <View style={s.summaryHighlight}>
              <Text style={s.summaryHighlightLabel}>= Saldo en Libros</Text>
              <Text style={s.summaryHighlightValue}>{summary.saldoEnLibros}</Text>
            </View>
          </View>

          {/* Right column */}
          <View style={s.summaryColRight}>
            <Text style={s.summaryLabel}>SALDOS BANCARIOS</Text>

            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Cheques Girados No Cobrados</Text>
              <Text style={s.summaryRowValue}>
                {summary.chequesTransitoCount} cheque{summary.chequesTransitoCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Total Cheques en {"Tr\u00E1nsito"}</Text>
              <Text style={s.summaryRowValue}>{summary.totalChequesTransito}</Text>
            </View>

            <View style={s.summaryHighlight}>
              <Text style={s.summaryHighlightLabel}>Saldo Real en Banco</Text>
              <Text style={s.summaryHighlightValue}>{summary.saldoBanco}</Text>
            </View>

            <View
              style={[
                s.summaryHighlight,
                summary.isDiferenciaCero ? s.diferenciaCero : s.diferenciaNoZero,
              ]}
            >
              <Text
                style={
                  summary.isDiferenciaCero
                    ? s.diferenciaCeroLabel
                    : s.diferenciaNoZeroLabel
                }
              >
                Diferencia
              </Text>
              <Text
                style={
                  summary.isDiferenciaCero
                    ? s.diferenciaCeroValue
                    : s.diferenciaNoZeroValue
                }
              >
                {summary.diferencia} {summary.isDiferenciaCero ? "\u2713" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            TRANSACCIONES CONCILIADAS
            ══════════════════════════════════════════════════════ */}
        <Text style={s.sectionTitle}>TRANSACCIONES CONCILIADAS</Text>

        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={s.colFecha}><Text style={s.th}>FECHA</Text></View>
            <View style={s.colComprobante}><Text style={s.th}>COMPROBANTE</Text></View>
            <View style={s.colContacto}><Text style={s.th}>CONTACTO</Text></View>
            <View style={s.colUnidad}><Text style={s.th}>UNIDAD</Text></View>
            <View style={s.colDetalle}><Text style={s.th}>DETALLE</Text></View>
            <View style={s.colNroDoc}><Text style={s.th}>NRO. DOC.</Text></View>
            <View style={s.colFormaPago}><Text style={s.th}>FORMA PAGO</Text></View>
            <View style={s.colValor}><Text style={s.thRight}>VALOR</Text></View>
          </View>

          <View style={s.tableBottom}>
            {items.length === 0 ? (
              <Text style={s.emptyText}>
                No hay transacciones registradas en esta {"conciliaci\u00F3n"}
              </Text>
            ) : (
              <>
                {items.map((item, i) => (
                  <View
                    key={i}
                    style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <View style={s.colFecha}>
                      <Text style={s.td}>{item.date}</Text>
                    </View>
                    <View style={s.colComprobante}>
                      <Text style={s.td}>{item.comprobante || "\u2014"}</Text>
                    </View>
                    <View style={s.colContacto}>
                      <Text style={s.td}>{item.contact || "\u2014"}</Text>
                    </View>
                    <View style={s.colUnidad}>
                      <Text style={s.td}>{item.unit || "\u2014"}</Text>
                    </View>
                    <View style={s.colDetalle}>
                      <Text style={s.td}>
                        {item.detail || "\u2014"}
                        {item.isCheckPending ? " (cheque no cobrado)" : ""}
                      </Text>
                    </View>
                    <View style={s.colNroDoc}>
                      <Text style={s.td}>{item.nroDocumento || "\u2014"}</Text>
                    </View>
                    <View style={s.colFormaPago}>
                      <Text style={s.td}>{item.paymentMethod || "\u2014"}</Text>
                    </View>
                    <View style={s.colValor}>
                      <Text style={item.isCheckPending ? s.td : (item.type === "ingreso" ? s.tdBoldGreen : s.tdBoldRed)}>
                        {item.isCheckPending ? "" : item.amount}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Totals rows */}
                <View style={s.totalRow} wrap={false}>
                  <View style={s.colFecha} />
                  <View style={s.colComprobante} />
                  <View style={s.colContacto} />
                  <View style={s.colUnidad} />
                  <View style={{ flex: 2.3 + 0.6 + 0.75, paddingRight: 5 }}>
                    <Text style={[s.td, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>{"Total Dep\u00F3sitos Conciliados:"}</Text>
                  </View>
                  <View style={s.colValor}>
                    <Text style={s.tdBoldGreen}>{summary.totalIngresos}</Text>
                  </View>
                </View>
                <View style={[s.totalRow, { borderTopWidth: 0, paddingTop: 0 }]} wrap={false}>
                  <View style={s.colFecha} />
                  <View style={s.colComprobante} />
                  <View style={s.colContacto} />
                  <View style={s.colUnidad} />
                  <View style={{ flex: 2.3 + 0.6 + 0.75, paddingRight: 5 }}>
                    <Text style={[s.td, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>Total Retiros Conciliados:</Text>
                  </View>
                  <View style={s.colValor}>
                    <Text style={s.tdBoldRed}>{summary.totalEgresos}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            VERIFICACIÓN DEL CRUCE
            ══════════════════════════════════════════════════════ */}
        <View style={s.cruceBox} wrap={false}>
          <Text style={s.cruceTitle}>{"VERIFICACI\u00D3N DEL CRUCE FINAL"}</Text>
          <View style={s.cruceRow}>
            <View style={s.cruceItem}>
              <Text style={s.cruceItemLabel}>Saldo en Libros</Text>
              <Text style={s.cruceItemValue}>{summary.saldoEnLibros}</Text>
            </View>
            <Text style={s.cruceOp}>+</Text>
            <View style={s.cruceItem}>
              <Text style={s.cruceItemLabel}>Cheques No Cobrados</Text>
              <Text style={s.cruceItemValue}>{summary.totalChequesTransito}</Text>
            </View>
            <Text style={s.cruceOp}>=</Text>
            <View style={s.cruceItem}>
              <Text style={s.cruceItemLabel}>Saldo Final en Banco</Text>
              <Text style={s.cruceItemValue}>{summary.saldoBanco}</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            CHEQUES GIRADOS Y NO COBRADOS
            ══════════════════════════════════════════════════════ */}
        {chequesEnTransito.length > 0 && (
          <>
            <Text style={s.sectionTitleAmber}>
              {"CHEQUES GIRADOS Y NO COBRADOS (EN TR\u00C1NSITO)"}
            </Text>

            <View style={s.tableWrap}>
              <View style={[s.tableHeader, { backgroundColor: brand.amber700 }]}>
                <View style={s.colChFecha}><Text style={s.th}>FECHA</Text></View>
                <View style={s.colChRef}><Text style={s.th}>REFERENCIA</Text></View>
                <View style={s.colChDesc}><Text style={s.th}>{"DESCRIPCI\u00D3N"}</Text></View>
                <View style={s.colChMonto}><Text style={s.thRight}>MONTO</Text></View>
              </View>

              <View style={s.tableBottom}>
                {chequesEnTransito.map((ch, i) => (
                  <View
                    key={i}
                    style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <View style={s.colChFecha}>
                      <Text style={s.td}>{ch.date}</Text>
                    </View>
                    <View style={s.colChRef}>
                      <Text style={s.td}>{ch.reference || "\u2014"}</Text>
                    </View>
                    <View style={s.colChDesc}>
                      <Text style={s.td}>{ch.description || "\u2014"}</Text>
                    </View>
                    <View style={s.colChMonto}>
                      <Text style={[s.tdRight, { fontFamily: "Helvetica-Bold" }]}>
                        {ch.amount}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={s.totalRow} wrap={false}>
                  <View style={s.colChFecha} />
                  <View style={s.colChRef} />
                  <View style={s.colChDesc}>
                    <Text style={[s.td, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>
                      {"Total Cheques en Tr\u00E1nsito:"}
                    </Text>
                  </View>
                  <View style={s.colChMonto}>
                    <Text style={[s.tdRight, { fontFamily: "Helvetica-Bold" }]}>
                      {summary.totalChequesTransito}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Status message ── */}
        {summary.isDiferenciaCero && (
          <View style={s.statusMessageBox} wrap={false}>
            <Text style={s.statusMessageText}>
              {"La conciliaci\u00F3n se encuentra correctamente registrada"}
            </Text>
          </View>
        )}

        {/* OBSERVACIONES removido — datos de notas no relevantes para el PDF */}

        {/* ══════════════════════════════════════════════════════
            AUTORIZACIONES
            ══════════════════════════════════════════════════════ */}
        <View style={s.authSection} wrap={false}>
          <Text style={s.authHeader}>AUTORIZACIONES</Text>
          <View style={s.authRow}>
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Elaborado por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Aprobado por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
            <View style={s.authCol}>
              <View style={s.authLine} />
              <Text style={s.authFirmaLabel}>Firma</Text>
              <Text style={s.authRoleLabel}>Revisado por</Text>
              <Text style={s.authFieldLabel}>Nombre:</Text>
              <Text style={s.authFieldLabel}>CC:</Text>
            </View>
          </View>
        </View>

        {/* ── Creator ── */}
        {creatorName ? (
          <Text style={s.creatorLine}>
            Elaborado por: {creatorName}
          </Text>
        ) : null}

        {/* ── EDIFIKA Footer (solo última página) ── */}
        <View style={s.edifikaFooter} wrap={false}>
          {edifikaLogoUrl ? (
            <Image src={edifikaLogoUrl} style={s.footerLogo} />
          ) : (
            <Text style={s.footerBrandFallback}>EDIFIKA</Text>
          )}
          <Text style={s.footerTagline}>
            Generado por EDIFIKA {"\u2014"} Software de Administraci{"\u00F3"}n
          </Text>
        </View>
      </Page>
    </Document>
  );
}

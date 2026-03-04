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
   EDIFIKA — Estado de Cuenta de la Unidad
   Diseño Corporativo v3
   Tecnología: @react-pdf/renderer
   ═══════════════════════════════════════════════════════════════ */

/* ─── Exported Types ─── */

export type AccountStatementRow = {
  contacto: string;
  rubro: string;
  detalle: string;
  valor: string;
  fechaPago: string;
  nroRecibo: string;
  valorPagado: string;
  descuento: string;
  saldo: string;
  saldoNumerico: number;
  isPaymentRow?: boolean;
};

export type AccountStatementPdfProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  edifikaLogoUrl?: string | null;
  unit: {
    identifier: string;
    fullIdentifier?: string | null;
    type: string;
    aliquot: number;
  };
  owner: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  summary: {
    totalCharges: string;
    totalPaid: string;
    totalPending: string;
    totalOverdue: string;
    creditBalance: string;
    isOverdue: boolean;
  };
  rows: AccountStatementRow[];
  generatedAt: string;
  filterLabel?: string | null;
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
  red700: "#b91c1c",
  red600: "#dc2626",
  red100: "#fee2e2",
  amber700: "#b45309",
  amber100: "#fef3c7",

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
  headerDate: {
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
    width: "25%",
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
  moraSi: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.red600,
  },
  moraNo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.green700,
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

  /* ─ Section Title ─ */
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.primary,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 10,
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
  tableBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: brand.border,
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
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: brand.slate100,
    borderTopWidth: 2,
    borderTopColor: brand.slate300,
  },

  /* Column flex — 9 cols */
  colContacto: { flex: 1.4, paddingRight: 5 },
  colRubro: { flex: 1.3, paddingRight: 5 },
  colDetalle: { flex: 2.0, paddingRight: 5 },
  colValor: { flex: 0.7, paddingRight: 5 },
  colFechaPago: { flex: 0.7, paddingRight: 5 },
  colNroRecibo: { flex: 0.6, paddingRight: 5 },
  colValorPagado: { flex: 0.75, paddingRight: 5 },
  colDescuento: { flex: 0.55 },
  colSaldo: { flex: 0.7 },

  /* ─ Notes ─ */
  notesBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
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

  /* ─ EDIFIKA Footer ─ */
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

export default function AccountStatementPdfTemplate({
  condo,
  edifikaLogoUrl,
  unit,
  owner,
  summary,
  rows,
  generatedAt,
  filterLabel,
}: AccountStatementPdfProps) {
  return (
    <Document
      title={`Estado de Cuenta \u2014 ${unit.fullIdentifier || unit.identifier} \u2014 ${condo.name}`}
      author="EDIFIKA"
      subject="Estado de Cuenta"
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
            <Text style={s.docLabel}>ESTADO DE CUENTA</Text>
            <Text style={s.headerCondoName}>{condo.name}</Text>
            <Text style={s.headerDate}>{generatedAt}</Text>
          </View>
        </View>

        {/* ── Title Banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerText}>ESTADO DE CUENTA DE LA UNIDAD</Text>
        </View>

        {/* ══════════════════════════════════════════════════════
            INFO BOX
            ══════════════════════════════════════════════════════ */}
        <View style={s.infoBox}>
          <Text style={s.infoBoxLabel}>{"\u0049NFORMACI\u00D3N DE LA UNIDAD"}</Text>
          <View style={s.infoGrid}>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Unidad</Text>
              <Text style={s.infoCellValue}>
                {unit.fullIdentifier || `${unit.type} ${unit.identifier}`}
              </Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>Representante</Text>
              <Text style={s.infoCellValue}>{owner.name}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>{"\u00BFEst\u00E1 en mora?"}</Text>
              <Text style={summary.isOverdue ? s.moraSi : s.moraNo}>
                {summary.isOverdue ? "S\u00ED" : "No"}
              </Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoCellLabel}>{"Porcentaje de al\u00EDcuota"}</Text>
              <Text style={s.infoCellValue}>{unit.aliquot.toFixed(6)}%</Text>
            </View>
            {owner.email ? (
              <View style={s.infoCell}>
                <Text style={s.infoCellLabel}>Email</Text>
                <Text style={s.infoCellValue}>{owner.email}</Text>
              </View>
            ) : null}
            {owner.phone ? (
              <View style={s.infoCell}>
                <Text style={s.infoCellLabel}>{"Tel\u00E9fono"}</Text>
                <Text style={s.infoCellValue}>{owner.phone}</Text>
              </View>
            ) : null}
            {filterLabel ? (
              <View style={s.infoCell}>
                <Text style={s.infoCellLabel}>Filtros aplicados</Text>
                <Text style={s.infoCellValue}>{filterLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            RESUMEN FINANCIERO
            ══════════════════════════════════════════════════════ */}
        <View style={s.summaryBox}>
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>RESUMEN FINANCIERO</Text>

            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Total Cargos Generados</Text>
              <Text style={s.summaryRowValue}>{summary.totalCharges}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Total Pagado</Text>
              <Text style={s.summaryRowValueGreen}>{summary.totalPaid}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Total Pendiente</Text>
              <Text style={s.summaryRowValueRed}>{summary.totalPending}</Text>
            </View>

            <View style={s.summaryHighlight}>
              <Text style={s.summaryHighlightLabel}>Saldo por Pagar</Text>
              <Text style={s.summaryHighlightValue}>{summary.totalPending}</Text>
            </View>
          </View>

          <View style={s.summaryColRight}>
            <Text style={s.summaryLabel}>ESTADO DE MORA</Text>

            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Monto Vencido</Text>
              <Text style={s.summaryRowValueRed}>{summary.totalOverdue}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryRowLabel}>Saldo a Favor</Text>
              <Text style={s.summaryRowValueGreen}>{summary.creditBalance}</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════
            DETALLE DE CARGOS Y PAGOS
            ══════════════════════════════════════════════════════ */}
        <Text style={s.sectionTitle}>DETALLE DE CARGOS Y PAGOS</Text>

        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={s.colContacto}><Text style={s.th}>CONTACTO</Text></View>
            <View style={s.colRubro}><Text style={s.th}>RUBRO</Text></View>
            <View style={s.colDetalle}><Text style={s.th}>DETALLE</Text></View>
            <View style={s.colValor}><Text style={s.thRight}>VALOR</Text></View>
            <View style={s.colFechaPago}><Text style={s.th}>FECHA PAGO</Text></View>
            <View style={s.colNroRecibo}><Text style={s.th}>NRO. RECIBO</Text></View>
            <View style={s.colValorPagado}><Text style={s.thRight}>VALOR PAGADO</Text></View>
            <View style={s.colDescuento}><Text style={s.thRight}>DESCT</Text></View>
            <View style={s.colSaldo}><Text style={s.thRight}>SALDO</Text></View>
          </View>

          <View style={s.tableBottom}>
            {rows.length === 0 ? (
              <Text style={s.emptyText}>
                No hay cargos registrados para esta unidad
              </Text>
            ) : (
              <>
                {rows.map((row, i) => (
                  <View
                    key={i}
                    style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <View style={s.colContacto}>
                      <Text style={s.td}>{row.contacto || "\u2014"}</Text>
                    </View>
                    <View style={s.colRubro}>
                      <Text style={s.td}>{row.rubro || "\u2014"}</Text>
                    </View>
                    <View style={s.colDetalle}>
                      <Text style={s.td}>{row.detalle || "\u2014"}</Text>
                    </View>
                    <View style={s.colValor}>
                      <Text style={s.tdRight}>{row.valor}</Text>
                    </View>
                    <View style={s.colFechaPago}>
                      <Text style={s.td}>{row.fechaPago || "\u2014"}</Text>
                    </View>
                    <View style={s.colNroRecibo}>
                      <Text style={s.td}>{row.nroRecibo || "\u2014"}</Text>
                    </View>
                    <View style={s.colValorPagado}>
                      <Text style={s.tdRight}>{row.valorPagado}</Text>
                    </View>
                    <View style={s.colDescuento}>
                      <Text style={s.tdRight}>{row.descuento}</Text>
                    </View>
                    <View style={s.colSaldo}>
                      <Text style={row.saldoNumerico > 0.01 ? s.tdBoldRed : s.tdBoldGreen}>
                        {row.saldo}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Totals row */}
                <View style={s.totalRow} wrap={false}>
                  <View style={s.colContacto} />
                  <View style={s.colRubro} />
                  <View style={s.colDetalle} />
                  <View style={{ flex: 0.7 + 0.7 + 0.6 + 0.75, paddingRight: 5 }}>
                    <Text style={[s.td, { fontFamily: "Helvetica-Bold", textAlign: "right" }]}>
                      Total Pendiente de Pago:
                    </Text>
                  </View>
                  <View style={s.colDescuento} />
                  <View style={s.colSaldo}>
                    <Text style={s.tdBoldRed}>{summary.totalPending}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Nota ── */}
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>NOTA</Text>
          <Text style={s.notesText}>
            * Los valores negativos (-) indican saldo a favor. Este documento es digital: no lo imprimas si no es necesario.
          </Text>
        </View>

        {/* ── EDIFIKA Footer ── */}
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

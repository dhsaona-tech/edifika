import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Hr,
  Img,
  Preview,
  Heading,
} from "@react-email/components";
import * as React from "react";

type Allocation = {
  concepto: string;
  periodo: string;
  asignado: string;
};

export type PaymentReceiptEmailProps = {
  condoName: string;
  condoLogoUrl?: string | null;
  payerName: string;
  unitIdentifier: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  totalAmount: string;
  pdfUrl: string;
  allocations: Allocation[];
};

export default function PaymentReceiptEmail({
  condoName,
  condoLogoUrl,
  payerName,
  unitIdentifier,
  receiptNumber,
  paymentDate,
  paymentMethod,
  totalAmount,
  pdfUrl,
  allocations,
}: PaymentReceiptEmailProps) {
  const firstName = payerName.split(" ")[0] || payerName;

  return (
    <Html lang="es">
      <Head />
      <Preview>
        {`Recibo de pago #${receiptNumber} - ${condoName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            {condoLogoUrl ? (
              <Img
                src={condoLogoUrl}
                alt={condoName}
                height="50"
                style={logoStyle}
              />
            ) : null}
            <Heading as="h1" style={headerTitle}>
              {condoName}
            </Heading>
          </Section>

          <Hr style={divider} />

          {/* Saludo */}
          <Section style={contentSection}>
            <Text style={greeting}>
              Estimado(a) {firstName},
            </Text>
            <Text style={bodyText}>
              Hemos registrado su pago exitosamente. A continuaci&oacute;n, el resumen de su transacci&oacute;n:
            </Text>
          </Section>

          {/* Resumen del pago */}
          <Section style={summaryCard}>
            <Row>
              <Column style={summaryLabelCol}>
                <Text style={summaryLabel}>Recibo N&deg;</Text>
                <Text style={summaryValue}>#{receiptNumber}</Text>
              </Column>
              <Column style={summaryLabelCol}>
                <Text style={summaryLabel}>Fecha</Text>
                <Text style={summaryValue}>{paymentDate}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={summaryLabelCol}>
                <Text style={summaryLabel}>Unidad</Text>
                <Text style={summaryValue}>{unitIdentifier}</Text>
              </Column>
              <Column style={summaryLabelCol}>
                <Text style={summaryLabel}>M&eacute;todo</Text>
                <Text style={summaryValue}>{paymentMethod}</Text>
              </Column>
            </Row>
            <Hr style={summaryDivider} />
            <Row>
              <Column>
                <Text style={totalLabel}>Total pagado</Text>
              </Column>
              <Column>
                <Text style={totalValue}>{totalAmount}</Text>
              </Column>
            </Row>
          </Section>

          {/* Detalle de conceptos */}
          {allocations.length > 0 && (
            <Section style={contentSection}>
              <Text style={sectionTitle}>Conceptos pagados</Text>
              {allocations.map((a, idx) => (
                <Row key={idx} style={allocationRow}>
                  <Column style={{ width: "55%" }}>
                    <Text style={allocationConcept}>{a.concepto}</Text>
                    <Text style={allocationPeriod}>{a.periodo}</Text>
                  </Column>
                  <Column style={{ width: "45%", textAlign: "right" as const }}>
                    <Text style={allocationAmount}>{a.asignado}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* Bot\u00f3n de descarga del PDF */}
          <Section style={ctaSection}>
            <Button
              href={pdfUrl}
              style={ctaButton}
            >
              Descargar comprobante PDF
            </Button>
            <Text style={ctaNote}>
              Este enlace estar&aacute; disponible por 365 d&iacute;as.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Agradecimiento */}
          <Section style={contentSection}>
            <Text style={thankYou}>
              Gracias por su puntual pago. Su contribuci&oacute;n es fundamental para el buen mantenimiento de nuestra comunidad.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Este correo fue enviado autom&aacute;ticamente por {condoName} a trav&eacute;s de EDIFIKA.
            </Text>
            <Text style={footerText}>
              Si no reconoce este pago, por favor contacte a su administrador.
            </Text>
            <Text style={footerBrand}>
              EDIFIKA &middot; Administraci&oacute;n Inteligente
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const main: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "580px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
};

const headerSection: React.CSSProperties = {
  backgroundColor: "#3c1d4e",
  padding: "28px 32px",
  textAlign: "center" as const,
};

const logoStyle: React.CSSProperties = {
  margin: "0 auto 12px",
  display: "block",
  borderRadius: "8px",
};

const headerTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "0.5px",
};

const divider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "0",
};

const contentSection: React.CSSProperties = {
  padding: "24px 32px",
};

const greeting: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0 0 8px",
};

const bodyText: React.CSSProperties = {
  fontSize: "14px",
  color: "#475569",
  lineHeight: "1.6",
  margin: "0",
};

const summaryCard: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  margin: "0 32px",
  padding: "20px 24px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
};

const summaryLabelCol: React.CSSProperties = {
  width: "50%",
  paddingBottom: "12px",
};

const summaryLabel: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 2px",
};

const summaryValue: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0",
};

const summaryDivider: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "4px 0 12px",
};

const totalLabel: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0",
};

const totalValue: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "800",
  color: "#3c1d4e",
  margin: "0",
  textAlign: "right" as const,
};

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#0f172a",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const allocationRow: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  paddingBottom: "8px",
  marginBottom: "8px",
};

const allocationConcept: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#0f172a",
  margin: "0",
};

const allocationPeriod: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  margin: "2px 0 0",
};

const allocationAmount: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#0f172a",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "8px 32px 24px",
  textAlign: "center" as const,
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#3c1d4e",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
  padding: "14px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const ctaNote: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: "10px 0 0",
};

const thankYou: React.CSSProperties = {
  fontSize: "14px",
  color: "#16a34a",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0",
  lineHeight: "1.6",
};

const footerSection: React.CSSProperties = {
  padding: "20px 32px",
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: "0 0 4px",
  lineHeight: "1.5",
};

const footerBrand: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#3c1d4e",
  margin: "8px 0 0",
  letterSpacing: "1px",
};

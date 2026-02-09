import React from "react";


type Allocation = {
  concepto: string;
  detalle: string;
  periodo: string;
  asignado: string;
  saldo: string;
  unidad?: string;
};

type ReceiptTemplateProps = {
  condo: {
    name: string;
    logoUrl?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
  };
  receiptNumber: string;
  qrDataUrl?: string;
  isVoided?: boolean;
  edifikaLogoUrl?: string | null; // Logo de EDIFIKA como base64
  payment: {
    paymentDate: string;
    method: string;
    reference: string;
    account: string;
    accountNumber: string;
    total: string;
    subtotal: string;
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
  allocations: Allocation[];
  createdLabel?: string;
};

export default function ReceiptTemplate({
  condo,
  receiptNumber,
  qrDataUrl,
  isVoided = false,
  edifikaLogoUrl,
  payment,
  payer,
  allocations,
  createdLabel = "",
}: ReceiptTemplateProps) {
  return (
    <html>
      <head>
        <style>{`
          * { box-sizing: border-box; }
          body { font-family: "Inter", Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #f8fafc; font-size: 11px; }
          .container { padding: 24px; }
          .header { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: center; }
          .logo { height: 60px; object-fit: contain; }
          .title { text-align: center; }
          .title h1 { margin: 0; font-size: 18px; letter-spacing: 0.5px; text-transform: uppercase; }
          .codes { text-align: right; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
          .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 90px; padding: 6px 10px; border: 1px solid #4c1d95; color: #4c1d95; border-radius: 12px; font-weight: 800; font-size: 12px; letter-spacing: 0.4px; }
          .section { margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #fff; }
          .section h3 { margin: 0 0 10px; font-size: 13px; color: #0f172a; }
          .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .label { font-size: 10px; color: #64748b; margin-bottom: 2px; text-transform: uppercase; font-weight: 700; }
          .value { font-size: 12px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #475569; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          .totals { text-align: right; margin-top: 8px; font-size: 11px; }
          .totals div { margin-top: 2px; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .footer-left { flex: 1; font-size: 10px; color: #64748b; line-height: 1.5; }
          .footer-right { display: flex; align-items: center; gap: 12px; }
          .edifika-logo { height: 50px; width: auto; max-width: 200px; object-fit: contain; }
          .condo-info { font-size: 9px; color: #64748b; line-height: 1.4; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <div>
              {condo.logoUrl ? (
                <img src={condo.logoUrl} alt="Logo" className="logo" />
              ) : null}
              <div style={{ fontSize: 11, marginTop: condo.logoUrl ? 4 : 0, color: "#475569" }}>
                <strong style={{ fontSize: 13, color: "#0f172a" }}>{condo.name}</strong><br />
                {condo.ruc && <>RUC: {condo.ruc}<br /></>}
                {condo.address && <>Dirección: {condo.address}<br /></>}
                {condo.phone && <>Teléfono: {condo.phone}</>}
              </div>
            </div>
            <div className="title">
              <h1>COMPROBANTE DE PAGO</h1>
              {isVoided && (
                <div style={{ marginTop: 6, padding: "6px 10px", display: "inline-flex", border: "1px solid #ef4444", color: "#b91c1c", background: "#fee2e2", borderRadius: 8, fontWeight: 800, fontSize: 12 }}>
                  ANULADO
                </div>
              )}
            </div>
            <div className="codes">
              <div className="badge">Recibo #{receiptNumber}</div>
            </div>
          </div>

          <div className="section card-grid">
            <div>
              <div className="label">Recibí de</div>
              <div className="value">{payer.name}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                Identificación: {payer.id || "—"}<br />
                Teléfono: {payer.phone || "—"}<br />
                Correo: {payer.email || "—"}<br />
                Unidad: {payer.unit || "—"}<br />
                Dirección: {payer.address || "—"}
              </div>
            </div>
            <div>
              <div className="label">Pago</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                Fecha: {payment.paymentDate}<br />
                Método: {payment.method}<br />
                Referencia: {payment.reference}<br />
                Cuenta: {payment.account} · {payment.accountNumber}
              </div>
              <div style={{ marginTop: 12, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                Total: {payment.total}
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Detalle de asignaciones</h3>
            <table>
              <thead>
                <tr>
                <th>Unidad</th>
                <th>Rubro</th>
                <th>Periodo</th>
                <th>Detalle</th>
                <th style={{ textAlign: "right" }}>Asignado</th>
                <th style={{ textAlign: "right" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.unidad || "—"}</td>
                    <td>{a.concepto}</td>
                    <td>{a.periodo}</td>
                    <td>{a.detalle}</td>
                    <td style={{ textAlign: "right" }}>{a.asignado}</td>
                    <td style={{ textAlign: "right" }}>{a.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="totals">
              <div>Subtotal: {payment.subtotal}</div>
              <div><strong>Total pagado: {payment.total}</strong></div>
            </div>
          </div>

          {payment.notes && (
            <div className="section">
              <div className="label">Notas</div>
              <div className="value" style={{ fontWeight: 400 }}>{payment.notes}</div>
            </div>
          )}

          <div className="footer">
            <div className="footer-left">
              <div style={{ fontSize: 9, color: "#94a3b8" }}>
                Elaborado por: {condo.name} · {createdLabel}
                <br />
                Este documento es digital. No lo imprimas si no es necesario.
              </div>
            </div>
            <div className="footer-right">
              {/* Logo de EDIFIKA del sistema */}
              {edifikaLogoUrl ? (
                <img
                  src={edifikaLogoUrl}
                  alt="EDIFIKA"
                  style={{ height: "70px", width: "auto", minWidth: "180px", objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e3a8a" }}>
                  EDIFIKA
                  <div style={{ fontSize: "9px", color: "#64748b", marginTop: 2 }}>Administración Inteligente</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

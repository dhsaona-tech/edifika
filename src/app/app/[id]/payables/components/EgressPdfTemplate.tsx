type Allocation = {
  invoice: string;
  issueDate?: string | null;
  expenseItem?: string | null;
  amount: string;
  description?: string | null;
};

type Props = {
  condo: { name: string; logoUrl?: string | null; address?: string | null; ruc?: string | null; phone?: string | null };
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
    method: string;
    reference?: string | null;
    account: string;
    total: string;
    notes?: string | null;
  };
  allocations: Allocation[];
};

export default function EgressPdfTemplate({ condo, edifikaLogoUrl, supplier, egress, allocations }: Props) {
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
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700 }}>{condo.name}</div>
              )}
              <div style={{ fontSize: 11, marginTop: 4, color: "#475569" }}>
                <strong>{condo.name}</strong><br />
                {condo.ruc && <>RUC: {condo.ruc}<br /></>}
                {condo.address && <>Dirección: {condo.address}<br /></>}
                {condo.phone && <>Teléfono: {condo.phone}<br /></>}
              </div>
            </div>
            <div className="title">
              <h1>COMPROBANTE DE EGRESO</h1>
            </div>
            <div className="codes">
              <div className="badge">EG #{egress.folio}</div>
            </div>
          </div>

          <div className="section card-grid">
            <div>
              <div className="label">Proveedor</div>
              <div className="value">{supplier.name}</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                RUC/ID: {supplier.ruc || "--"}<br />
                Contacto: {supplier.contact || "--"}<br />
                Telefono: {supplier.phone || "--"}<br />
                Correo: {supplier.email || "--"}<br />
                Direccion: {supplier.address || "--"}
              </div>
            </div>
            <div>
              <div className="label">Pago</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                Fecha: {egress.paymentDate}<br />
                Metodo: {egress.method}<br />
                Referencia: {egress.reference || "--"}<br />
                Cuenta: {egress.account}
              </div>
              <div style={{ marginTop: 12, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                Total pagado: {egress.total}
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Facturas pagadas</h3>
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Rubro</th>
                  <th>Detalle</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.invoice}</td>
                    <td>{a.issueDate || "--"}</td>
                    <td>{a.expenseItem || "--"}</td>
                    <td>{a.description || "--"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{a.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="totals">
              <div><strong>Total pagado: {egress.total}</strong></div>
            </div>
          </div>

          {egress.notes && (
            <div className="section">
              <div className="label">Notas</div>
              <div className="value" style={{ fontWeight: 400 }}>{egress.notes}</div>
            </div>
          )}

          <div className="footer">
            <div className="footer-left">
              <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{condo.name}</div>
              {condo.address && <div>Dirección: {condo.address}</div>}
              {condo.ruc && <div>RUC: {condo.ruc}</div>}
              {condo.phone && <div>Teléfono: {condo.phone}</div>}
              <div style={{ marginTop: 6, fontSize: 9, color: "#94a3b8" }}>
                Elaborado por: {condo.name} - Folio {egress.folio}
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
                  className="edifika-logo" 
                  style={{ height: "50px", width: "auto", maxWidth: "200px", objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e3a8a" }}>
                  EDIFIKA
                  <div style={{ fontSize: "8px", color: "#64748b", marginTop: 2 }}>Administración Inteligente</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

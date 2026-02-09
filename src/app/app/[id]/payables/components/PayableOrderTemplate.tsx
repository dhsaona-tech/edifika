type OrderProps = {
  condo: { name: string; logoUrl?: string | null; address?: string | null; ruc?: string | null };
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

export default function PayableOrderTemplate({ condo, payable }: OrderProps) {
  return (
    <html>
      <head>
        <style>{`
          body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; background: #f8fafc; }
          .shell { max-width: 760px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; }
          .muted { color: #64748b; }
          .title { font-size: 22px; font-weight: 800; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; }
          th, td { padding: 10px 10px; text-align: left; }
          th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #475569; }
          td { border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 12px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #fff; }
          .label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; }
        `}</style>
      </head>
      <body>
        <div className="shell">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <p className="label">Orden de pago</p>
              <h1 className="title">{condo.name}</h1>
              <p className="muted" style={{ fontSize: "12px" }}>
                {condo.address || ""} {condo.ruc ? ` · RUC: ${condo.ruc}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              {condo.logoUrl && <img src={condo.logoUrl} alt="Logo" style={{ maxHeight: "64px", objectFit: "contain", marginLeft: "auto" }} />}
              {payable.folio ? <span className="badge">OP {payable.folio}</span> : <span className="badge">Sin folio</span>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginBottom: "14px" }}>
            <div className="card">
              <p className="label">Proveedor</p>
              <p style={{ fontSize: "15px", fontWeight: 700 }}>{payable.supplier}</p>
              <p className="muted" style={{ fontSize: "12px" }}>
                Rubro: {payable.expenseItem}
              </p>
              {payable.plannedMethod && (
                <p className="muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                  Forma de pago: {payable.plannedMethod}
                </p>
              )}
              {payable.plannedReference && (
                <p className="muted" style={{ fontSize: "12px", marginTop: "2px" }}>
                  Ref: {payable.plannedReference}
                </p>
              )}
            </div>
            <div className="card">
              <p className="label">Factura y fechas</p>
              <p style={{ fontSize: "13px", color: "#0f172a" }}>Factura: {payable.invoice}</p>
              <p style={{ fontSize: "13px", color: "#0f172a" }}>Emision: {payable.issueDate}</p>
              <p style={{ fontSize: "13px", color: "#0f172a" }}>Vencimiento: {payable.dueDate}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Detalle</th>
                <th style={{ textAlign: "right" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{payable.detail || "Gasto registrado"}</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{payable.total}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "24px", marginTop: "28px" }}>
            <div>
              <p className="label" style={{ marginBottom: "12px" }}>Firma Autorizacion</p>
              <div style={{ height: "70px", borderBottom: "1px solid #e2e8f0", marginBottom: "12px" }}></div>
              <p className="muted" style={{ fontSize: "12px" }}>Administrador / Presidente</p>
            </div>
            <div>
              <p className="label" style={{ marginBottom: "12px" }}>Firma Proveedor</p>
              <div style={{ height: "70px", borderBottom: "1px solid #e2e8f0", marginBottom: "12px" }}></div>
              <p className="muted" style={{ fontSize: "12px" }}>Recepcion conforme</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

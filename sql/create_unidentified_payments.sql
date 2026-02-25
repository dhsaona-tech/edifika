-- ============================================================================
-- TABLA: unidentified_payments (Ingresos No Identificados)
-- ============================================================================
-- Registra depósitos/transferencias que aparecen en el banco pero no se sabe
-- a qué unidad pertenecen. El admin puede asignarlos después.

CREATE TABLE IF NOT EXISTS unidentified_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,

  -- Datos del depósito/transferencia
  payment_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'deposito',
  reference_number TEXT, -- Número de comprobante/voucher
  bank_reference TEXT,   -- Referencia que aparece en el estado de cuenta
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id),
  notes TEXT,

  -- Estado
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'asignado', 'devuelto')),

  -- Cuando se asigna
  assigned_payment_id UUID REFERENCES payments(id),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES profiles(id),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_unidentified_payments_condo
  ON unidentified_payments(condominium_id);
CREATE INDEX IF NOT EXISTS idx_unidentified_payments_status
  ON unidentified_payments(condominium_id, status);
CREATE INDEX IF NOT EXISTS idx_unidentified_payments_date
  ON unidentified_payments(condominium_id, payment_date DESC);

-- RLS
ALTER TABLE unidentified_payments ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven pagos de condominios donde tienen membresía
CREATE POLICY "Users can view unidentified payments of their condos"
  ON unidentified_payments FOR SELECT
  USING (
    condominium_id IN (
      SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert unidentified payments to their condos"
  ON unidentified_payments FOR INSERT
  WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update unidentified payments of their condos"
  ON unidentified_payments FOR UPDATE
  USING (
    condominium_id IN (
      SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
    )
  );

-- Comentarios
COMMENT ON TABLE unidentified_payments IS 'Depósitos/transferencias sin unidad identificada';
COMMENT ON COLUMN unidentified_payments.bank_reference IS 'Referencia que aparece en el estado de cuenta del banco';
COMMENT ON COLUMN unidentified_payments.status IS 'pendiente = sin asignar, asignado = convertido en REC, devuelto = dinero devuelto';

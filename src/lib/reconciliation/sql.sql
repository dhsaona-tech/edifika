-- ============================================
-- TABLAS PARA CONCILIACIÓN BANCARIA
-- ============================================

-- Tabla principal de conciliaciones
CREATE TABLE IF NOT EXISTS reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  
  -- Período de conciliación
  cutoff_date DATE NOT NULL,  -- Fecha de corte (último día del período)
  period_start DATE NOT NULL,  -- Primer día del período
  period_end DATE NOT NULL,    -- Último día del período (igual a cutoff_date o diferente)
  
  -- Saldos
  opening_balance NUMERIC(15, 2) NOT NULL,  -- Saldo inicial al inicio del período
  closing_balance_bank NUMERIC(15, 2) NOT NULL,  -- Saldo según banco (extracto)
  closing_balance_calculated NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- Saldo calculado por sistema
  difference NUMERIC(15, 2) NOT NULL DEFAULT 0,  -- Diferencia (banco - calculado)
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'borrador',  -- 'borrador' | 'conciliada' | 'cerrada'
  reconciled_at TIMESTAMPTZ,  -- Fecha/hora de finalización
  reconciled_by UUID REFERENCES profiles(id),  -- Usuario que finalizó
  
  -- Metadatos
  notes TEXT,  -- Notas adicionales
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items de conciliación (movimientos seleccionados)
CREATE TABLE IF NOT EXISTS reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  
  -- Referencia al movimiento (uno u otro, no ambos)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  egress_id UUID REFERENCES egresses(id) ON DELETE SET NULL,
  
  -- Información del cheque (si aplica)
  check_id UUID REFERENCES checks(id) ON DELETE SET NULL,
  is_check_cashed BOOLEAN NOT NULL DEFAULT false,  -- Si el cheque ya fue cobrado
  
  -- Datos del movimiento (snapshot para el PDF)
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,  -- 'ingreso' | 'egreso'
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,  -- Descripción del movimiento
  reference_number TEXT,  -- Número de referencia/cheque
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Solo uno de payment_id o egress_id
  CONSTRAINT check_payment_or_egress CHECK (
    (payment_id IS NOT NULL AND egress_id IS NULL) OR
    (payment_id IS NULL AND egress_id IS NOT NULL)
  )
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_reconciliations_condominium ON reconciliations(condominium_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON reconciliations(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_cutoff_date ON reconciliations(financial_account_id, cutoff_date);
CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON reconciliations(status);

-- Constraint único: Una conciliación conciliada por cuenta y fecha de corte
-- (Solo aplica cuando status = 'conciliada')
CREATE UNIQUE INDEX IF NOT EXISTS unique_reconciliation_per_account_date 
  ON reconciliations(financial_account_id, cutoff_date) 
  WHERE status = 'conciliada';
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_payment ON reconciliation_items(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_egress ON reconciliation_items(egress_id) WHERE egress_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_date ON reconciliation_items(transaction_date);

-- Comentarios
COMMENT ON TABLE reconciliations IS 'Registros de conciliaciones bancarias por período';
COMMENT ON TABLE reconciliation_items IS 'Movimientos seleccionados en cada conciliación';

-- ============================================
-- FUNCIONES PARA VALIDACIÓN
-- ============================================

-- Función para verificar si un payment está conciliado
CREATE OR REPLACE FUNCTION is_payment_reconciled(in_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reconciliation_items ri
  INNER JOIN reconciliations r ON ri.reconciliation_id = r.id
  WHERE ri.payment_id = in_payment_id
    AND r.status = 'conciliada';
  
  RETURN v_count > 0;
END;
$$;

-- Función para verificar si un egress está conciliado
CREATE OR REPLACE FUNCTION is_egress_reconciled(in_egress_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reconciliation_items ri
  INNER JOIN reconciliations r ON ri.reconciliation_id = r.id
  WHERE ri.egress_id = in_egress_id
    AND r.status = 'conciliada';
  
  RETURN v_count > 0;
END;
$$;

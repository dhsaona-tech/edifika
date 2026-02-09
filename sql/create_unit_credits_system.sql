-- =====================================================
-- SISTEMA DE CRÉDITOS/ANTICIPOS DE UNIDADES - EDIFIKA
-- =====================================================
-- Implementa la gestión de saldos a favor y pagos adelantados
-- Regla de negocio: El crédito pertenece a la UNIDAD, no al residente
-- =====================================================

-- 1. TABLA PRINCIPAL DE CRÉDITOS
-- =====================================================
CREATE TABLE IF NOT EXISTS unit_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,

  -- Montos
  original_amount NUMERIC(15, 2) NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),

  -- Origen del crédito
  source_type TEXT NOT NULL CHECK (source_type IN ('excedente_pago', 'anticipo', 'ajuste_manual', 'devolucion')),
  source_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

  -- Metadatos
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Estado: activo (disponible), agotado (remaining=0), cancelado (anulado manualmente)
  status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'agotado', 'cancelado')),

  -- Auditoría
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unit_credits_unit_id ON unit_credits(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_credits_condominium_id ON unit_credits(condominium_id);
CREATE INDEX IF NOT EXISTS idx_unit_credits_status ON unit_credits(status) WHERE status = 'activo';
CREATE INDEX IF NOT EXISTS idx_unit_credits_source_payment ON unit_credits(source_payment_id);

-- 2. TABLA DE APLICACIONES DE CRÉDITO (Historial de cruces)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL REFERENCES unit_credits(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,

  -- Monto aplicado de este crédito a este cargo
  amount_applied NUMERIC(15, 2) NOT NULL CHECK (amount_applied > 0),

  -- Metadatos
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES profiles(id),
  notes TEXT,

  -- Para reversar aplicaciones si es necesario
  is_reversed BOOLEAN DEFAULT FALSE,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES profiles(id),
  reversal_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_applications_credit_id ON credit_applications(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_charge_id ON credit_applications(charge_id);

-- 3. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE unit_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

-- Políticas para unit_credits (usando tabla memberships)
DROP POLICY IF EXISTS "Users can view credits of their condominiums" ON unit_credits;
CREATE POLICY "Users can view credits of their condominiums" ON unit_credits
  FOR SELECT
  USING (
    condominium_id IN (
      SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage credits" ON unit_credits;
CREATE POLICY "Admins can manage credits" ON unit_credits
  FOR ALL
  USING (
    condominium_id IN (
      SELECT condominium_id FROM memberships
      WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Políticas para credit_applications
DROP POLICY IF EXISTS "Users can view credit applications of their condominiums" ON credit_applications;
CREATE POLICY "Users can view credit applications of their condominiums" ON credit_applications
  FOR SELECT
  USING (
    credit_id IN (
      SELECT uc.id FROM unit_credits uc
      WHERE uc.condominium_id IN (
        SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage credit applications" ON credit_applications;
CREATE POLICY "Admins can manage credit applications" ON credit_applications
  FOR ALL
  USING (
    credit_id IN (
      SELECT uc.id FROM unit_credits uc
      WHERE uc.condominium_id IN (
        SELECT condominium_id FROM memberships
        WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
      )
    )
  );

-- 4. FUNCIÓN: Obtener saldo a favor de una unidad
-- =====================================================
CREATE OR REPLACE FUNCTION get_unit_credit_balance(p_unit_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(remaining_amount), 0)
  FROM unit_credits
  WHERE unit_id = p_unit_id
    AND status = 'activo'
    AND remaining_amount > 0;
$$ LANGUAGE SQL STABLE;

-- 5. FUNCIÓN: Obtener créditos activos de una unidad
-- =====================================================
CREATE OR REPLACE FUNCTION get_unit_active_credits(p_unit_id UUID)
RETURNS TABLE (
  id UUID,
  original_amount NUMERIC,
  remaining_amount NUMERIC,
  source_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    uc.id,
    uc.original_amount,
    uc.remaining_amount,
    uc.source_type,
    uc.description,
    uc.created_at
  FROM unit_credits uc
  WHERE uc.unit_id = p_unit_id
    AND uc.status = 'activo'
    AND uc.remaining_amount > 0
  ORDER BY uc.created_at ASC;  -- FIFO: primero los más antiguos
$$ LANGUAGE SQL STABLE;

-- 6. FUNCIÓN: Aplicar crédito a un cargo (Cruce de cuentas)
-- =====================================================
CREATE OR REPLACE FUNCTION apply_credit_to_charge(
  p_credit_id UUID,
  p_charge_id UUID,
  p_amount NUMERIC,
  p_applied_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_credit unit_credits%ROWTYPE;
  v_charge charges%ROWTYPE;
  v_application_id UUID;
  v_actual_amount NUMERIC;
BEGIN
  -- Bloquear crédito para evitar race conditions
  SELECT * INTO v_credit
  FROM unit_credits
  WHERE id = p_credit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Crédito no encontrado');
  END IF;

  IF v_credit.status != 'activo' THEN
    RETURN json_build_object('success', false, 'error', 'El crédito no está activo');
  END IF;

  IF v_credit.remaining_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'El crédito no tiene saldo disponible');
  END IF;

  -- Bloquear cargo
  SELECT * INTO v_charge
  FROM charges
  WHERE id = p_charge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cargo no encontrado');
  END IF;

  IF v_charge.unit_id != v_credit.unit_id THEN
    RETURN json_build_object('success', false, 'error', 'El crédito y el cargo deben ser de la misma unidad');
  END IF;

  IF v_charge.balance <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'El cargo ya está pagado');
  END IF;

  -- Calcular monto real a aplicar (no puede exceder crédito disponible ni saldo del cargo)
  v_actual_amount := LEAST(p_amount, v_credit.remaining_amount, v_charge.balance);

  IF v_actual_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Monto inválido para aplicar');
  END IF;

  -- Crear registro de aplicación
  INSERT INTO credit_applications (credit_id, charge_id, amount_applied, applied_by, notes)
  VALUES (p_credit_id, p_charge_id, v_actual_amount, p_applied_by, p_notes)
  RETURNING id INTO v_application_id;

  -- Actualizar crédito
  UPDATE unit_credits
  SET remaining_amount = remaining_amount - v_actual_amount,
      status = CASE WHEN remaining_amount - v_actual_amount <= 0 THEN 'agotado' ELSE 'activo' END
  WHERE id = p_credit_id;

  -- Actualizar cargo (similar a como lo hace apply_payment_to_charges)
  UPDATE charges
  SET paid_amount = paid_amount + v_actual_amount,
      balance = total_amount - (paid_amount + v_actual_amount),
      status = CASE
        WHEN total_amount - (paid_amount + v_actual_amount) <= 0 THEN 'pagado'
        ELSE 'pendiente'
      END
  WHERE id = p_charge_id;

  RETURN json_build_object(
    'success', true,
    'application_id', v_application_id,
    'amount_applied', v_actual_amount,
    'credit_remaining', v_credit.remaining_amount - v_actual_amount,
    'charge_new_balance', v_charge.balance - v_actual_amount
  );
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN: Crear crédito por excedente de pago
-- =====================================================
CREATE OR REPLACE FUNCTION create_credit_from_payment_excess(
  p_condominium_id UUID,
  p_unit_id UUID,
  p_amount NUMERIC,
  p_source_payment_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO unit_credits (
    condominium_id,
    unit_id,
    original_amount,
    remaining_amount,
    source_type,
    source_payment_id,
    description,
    created_by
  ) VALUES (
    p_condominium_id,
    p_unit_id,
    p_amount,
    p_amount,
    'excedente_pago',
    p_source_payment_id,
    'Saldo a favor por excedente de pago #' || (SELECT folio_rec FROM payments WHERE id = p_source_payment_id),
    p_created_by
  )
  RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN: Crear crédito por anticipo (pago adelantado sin cargo)
-- =====================================================
CREATE OR REPLACE FUNCTION create_advance_credit(
  p_condominium_id UUID,
  p_unit_id UUID,
  p_amount NUMERIC,
  p_source_payment_id UUID,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO unit_credits (
    condominium_id,
    unit_id,
    original_amount,
    remaining_amount,
    source_type,
    source_payment_id,
    description,
    created_by
  ) VALUES (
    p_condominium_id,
    p_unit_id,
    p_amount,
    p_amount,
    'anticipo',
    p_source_payment_id,
    COALESCE(p_description, 'Pago adelantado'),
    p_created_by
  )
  RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN: Cancelar/Anular un crédito
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_credit(
  p_credit_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_credit unit_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_credit
  FROM unit_credits
  WHERE id = p_credit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Crédito no encontrado');
  END IF;

  IF v_credit.status = 'cancelado' THEN
    RETURN json_build_object('success', false, 'error', 'El crédito ya está cancelado');
  END IF;

  -- Verificar que no tenga aplicaciones activas
  IF EXISTS (
    SELECT 1 FROM credit_applications
    WHERE credit_id = p_credit_id AND is_reversed = FALSE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No se puede cancelar un crédito con aplicaciones activas. Primero reverse las aplicaciones.');
  END IF;

  UPDATE unit_credits
  SET status = 'cancelado',
      cancelled_at = NOW(),
      cancelled_by = p_cancelled_by,
      cancellation_reason = p_reason
  WHERE id = p_credit_id;

  RETURN json_build_object('success', true, 'message', 'Crédito cancelado correctamente');
END;
$$ LANGUAGE plpgsql;

-- 10. MODIFICAR apply_payment_to_charges PARA MANEJAR EXCEDENTES
-- =====================================================
-- NOTA: Esta es la versión actualizada que crea créditos automáticamente

CREATE OR REPLACE FUNCTION apply_payment_to_charges(
  in_condominium_id uuid,
  in_financial_account_id uuid,
  in_payment_date date,
  in_total_amount numeric,
  in_payment_method text,
  in_reference_number text,
  in_notes text,
  in_payer_profile_id uuid,
  in_unit_id uuid,
  in_expense_item_id uuid,
  in_allocations jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id uuid;
  v_alloc record;
  v_charge record;
  v_to_apply numeric;
  v_allocated numeric := 0;
  v_excess numeric;
  v_credit_id uuid;
BEGIN
  -- Crear el pago
  INSERT INTO payments (
    condominium_id,
    financial_account_id,
    payment_date,
    total_amount,
    payment_method,
    reference_number,
    notes,
    payer_profile_id,
    unit_id,
    expense_item_id,
    status
  ) VALUES (
    in_condominium_id,
    in_financial_account_id,
    in_payment_date,
    in_total_amount,
    in_payment_method,
    in_reference_number,
    in_notes,
    in_payer_profile_id,
    in_unit_id,
    in_expense_item_id,
    'disponible'
  )
  RETURNING id INTO v_payment_id;

  -- Procesar asignaciones a cargos
  FOR v_alloc IN SELECT * FROM jsonb_to_recordset(in_allocations)
    AS x(charge_id uuid, amount_allocated numeric)
  LOOP
    -- Bloquear el cargo
    SELECT * INTO v_charge
    FROM charges
    WHERE id = v_alloc.charge_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cargo no encontrado: %', v_alloc.charge_id;
    END IF;

    -- Calcular monto a aplicar (no exceder saldo del cargo)
    v_to_apply := LEAST(v_alloc.amount_allocated, v_charge.balance);

    IF v_to_apply <= 0 THEN
      RAISE EXCEPTION 'Monto inválido para cargo %', v_alloc.charge_id;
    END IF;

    -- Registrar la asignación
    INSERT INTO payment_allocations (payment_id, charge_id, amount_allocated)
    VALUES (v_payment_id, v_alloc.charge_id, v_to_apply);

    -- Actualizar el cargo
    UPDATE charges
    SET paid_amount = paid_amount + v_to_apply,
        balance = total_amount - (paid_amount + v_to_apply),
        status = CASE
          WHEN total_amount - (paid_amount + v_to_apply) <= 0 THEN 'pagado'
          ELSE 'pendiente'
        END
    WHERE id = v_alloc.charge_id;

    v_allocated := v_allocated + v_to_apply;
  END LOOP;

  -- Actualizar el pago con el monto asignado
  UPDATE payments
  SET allocated_amount = v_allocated
  WHERE id = v_payment_id;

  -- Actualizar saldo de la cuenta bancaria
  UPDATE financial_accounts
  SET current_balance = current_balance + in_total_amount
  WHERE id = in_financial_account_id;

  -- *** NUEVO: Manejar excedente como crédito/saldo a favor ***
  v_excess := in_total_amount - v_allocated;

  IF v_excess > 0 AND in_unit_id IS NOT NULL THEN
    -- Crear crédito por el excedente
    v_credit_id := create_credit_from_payment_excess(
      in_condominium_id,
      in_unit_id,
      v_excess,
      v_payment_id,
      in_payer_profile_id
    );
  END IF;

  RETURN v_payment_id;
END;
$$;

-- 11. VISTA: Resumen de créditos por unidad
-- =====================================================
CREATE OR REPLACE VIEW v_unit_credit_summary AS
SELECT
  u.id AS unit_id,
  u.identifier AS unit_identifier,
  u.full_identifier AS unit_full_identifier,
  u.condominium_id,
  COALESCE(SUM(uc.remaining_amount) FILTER (WHERE uc.status = 'activo'), 0) AS total_credit_available,
  COUNT(uc.id) FILTER (WHERE uc.status = 'activo' AND uc.remaining_amount > 0) AS active_credits_count,
  COALESCE(SUM(uc.original_amount), 0) AS total_credits_historically
FROM units u
LEFT JOIN unit_credits uc ON uc.unit_id = u.id
GROUP BY u.id, u.identifier, u.full_identifier, u.condominium_id;

-- 12. FUNCIÓN: Obtener unidades con crédito disponible (para alertas)
-- =====================================================
CREATE OR REPLACE FUNCTION get_units_with_available_credit(p_condominium_id UUID)
RETURNS TABLE (
  unit_id UUID,
  unit_identifier TEXT,
  total_credit NUMERIC,
  credits_count BIGINT
) AS $$
  SELECT
    v.unit_id,
    v.unit_full_identifier,
    v.total_credit_available,
    v.active_credits_count
  FROM v_unit_credit_summary v
  WHERE v.condominium_id = p_condominium_id
    AND v.total_credit_available > 0
  ORDER BY v.total_credit_available DESC;
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- =====================================================
-- 017: Crear función create_credit_from_payment_excess
-- =====================================================
-- La función apply_payment_to_charges llama a esta función
-- cuando el monto del pago excede la suma de los cargos asignados.
-- Adaptada al esquema ACTUAL de unit_credits (05-unit-credits.sql).
--
-- Esquema actual de unit_credits:
--   movement_type: 'credit_in' | 'credit_out' | 'adjustment' | 'reversal'
--   amount: NUMERIC (positivo = ingreso, negativo = egreso)
--   running_balance: calculado automáticamente por trigger trg_unit_credit_balance
--   payment_id: FK a payments
--   description: texto libre
--   created_by: FK a profiles
--
-- El trigger update_unit_credit_balance() se encarga de:
--   1. Calcular running_balance = prev_balance + NEW.amount
--   2. Actualizar units.credit_balance = NEW.running_balance
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
  v_folio TEXT;
BEGIN
  -- No crear crédito si el monto es 0 o negativo
  IF p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  -- Obtener folio del pago para la descripción
  SELECT COALESCE(folio_rec::TEXT, id::TEXT)
  INTO v_folio
  FROM payments
  WHERE id = p_source_payment_id;

  -- Insertar movimiento de crédito
  -- Llena columnas de AMBOS esquemas (05-unit-credits + create_unit_credits_system)
  -- El trigger trg_unit_credit_balance recalcula running_balance y actualiza units.credit_balance
  INSERT INTO unit_credits (
    condominium_id,
    unit_id,
    -- Columnas del esquema create_unit_credits_system.sql (NOT NULL)
    original_amount,
    remaining_amount,
    source_type,
    source_payment_id,
    -- Columnas del esquema 05-unit-credits.sql
    movement_type,
    amount,
    running_balance,
    payment_id,
    description,
    created_by
  ) VALUES (
    p_condominium_id,
    p_unit_id,
    p_amount,              -- original_amount
    p_amount,              -- remaining_amount (= original, aún no se ha aplicado)
    'excedente_pago',      -- source_type
    p_source_payment_id,   -- source_payment_id
    'credit_in',           -- movement_type
    p_amount,              -- amount
    0,                     -- running_balance (trigger BEFORE INSERT lo recalcula)
    p_source_payment_id,   -- payment_id
    'Saldo a favor por excedente de pago #' || v_folio,
    p_created_by
  )
  RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql;

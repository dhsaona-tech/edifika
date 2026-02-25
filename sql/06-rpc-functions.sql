-- ============================================================================
-- PASO 6: FUNCIONES RPC
-- ============================================================================

-- Función: Verificar elegibilidad de pronto pago
CREATE OR REPLACE FUNCTION check_early_payment_eligibility(
  p_unit_id UUID,
  p_charge_ids UUID[]
)
RETURNS TABLE (
  eligible BOOLEAN,
  reason TEXT,
  discount_amount NUMERIC(12,2)
) AS $$
DECLARE
  v_has_other_debt BOOLEAN;
  v_has_active_agreement BOOLEAN;
  v_total_discount NUMERIC(12,2) := 0;
  v_all_eligible BOOLEAN := true;
  v_reason TEXT := 'Elegible para pronto pago';
BEGIN
  -- 1. Verificar que la unidad no tenga deuda previa
  SELECT COALESCE(SUM(balance), 0) > 0.01
  INTO v_has_other_debt
  FROM public.charges
  WHERE unit_id = p_unit_id
    AND status = 'pendiente'
    AND id != ALL(p_charge_ids)
    AND balance > 0.01;

  IF v_has_other_debt THEN
    v_all_eligible := false;
    v_reason := 'La unidad tiene deuda pendiente previa';
  END IF;

  -- 2. Verificar que no tenga convenio de pago activo
  SELECT EXISTS(
    SELECT 1 FROM public.payment_agreements
    WHERE unit_id = p_unit_id AND status = 'activo'
  ) INTO v_has_active_agreement;

  IF v_has_active_agreement THEN
    v_all_eligible := false;
    v_reason := 'La unidad tiene un convenio de pago activo';
  END IF;

  -- 3. Verificar que todos los cargos sean elegibles
  IF v_all_eligible THEN
    SELECT
      bool_and(
        early_payment_eligible = true
        AND early_payment_deadline >= CURRENT_DATE
        AND balance = total_amount
      ),
      COALESCE(SUM(early_payment_amount), 0)
    INTO v_all_eligible, v_total_discount
    FROM public.charges
    WHERE id = ANY(p_charge_ids);

    IF NOT v_all_eligible THEN
      v_reason := 'Uno o mas cargos no son elegibles o estan fuera de plazo';
    END IF;
  END IF;

  RETURN QUERY SELECT v_all_eligible, v_reason, v_total_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Registrar crédito
CREATE OR REPLACE FUNCTION register_unit_credit(
  p_condominium_id UUID,
  p_unit_id UUID,
  p_amount NUMERIC(12,2),
  p_movement_type TEXT,
  p_payment_id UUID DEFAULT NULL,
  p_charge_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  INSERT INTO public.unit_credits (
    condominium_id,
    unit_id,
    movement_type,
    amount,
    running_balance,
    payment_id,
    charge_id,
    description,
    created_by
  ) VALUES (
    p_condominium_id,
    p_unit_id,
    p_movement_type,
    CASE WHEN p_movement_type IN ('credit_out', 'reversal') THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    0,
    p_payment_id,
    p_charge_id,
    p_description,
    p_created_by
  )
  RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si unidad tiene convenio activo
CREATE OR REPLACE FUNCTION unit_has_active_payment_agreement(
  p_unit_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.payment_agreements
    WHERE unit_id = p_unit_id AND status = 'activo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

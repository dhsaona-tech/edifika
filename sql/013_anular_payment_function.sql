-- =============================================
-- Función: anular_payment
-- Fecha: 2025-02-20
-- Descripción: Anula un pago (REC) y revierte todos los saldos de los cargos afectados
-- =============================================

-- Primero agregar columnas necesarias si no existen
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancelled_by_profile_id UUID REFERENCES profiles(id);

-- Función principal de anulación
CREATE OR REPLACE FUNCTION anular_payment(
  p_payment_id UUID,
  p_cancelled_by_profile_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_allocation RECORD;
  v_charge RECORD;
  v_new_paid_amount NUMERIC;
  v_new_balance NUMERIC;
  v_new_status TEXT;
  v_reversed_count INT := 0;
  v_total_reversed NUMERIC := 0;
BEGIN
  -- 1. Verificar que el pago existe y no está ya anulado
  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado');
  END IF;

  IF v_payment.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este pago ya está anulado');
  END IF;

  -- 2. Obtener todas las asignaciones de este pago a cargos
  FOR v_allocation IN
    SELECT pa.*, c.total_amount as charge_total, c.paid_amount as charge_paid
    FROM payment_allocations pa
    JOIN charges c ON c.id = pa.charge_id
    WHERE pa.payment_id = p_payment_id
  LOOP
    -- 3. Calcular nuevo paid_amount del cargo (restar lo que se había pagado)
    v_new_paid_amount := GREATEST(0, v_allocation.charge_paid - v_allocation.amount_applied);
    v_new_balance := v_allocation.charge_total - v_new_paid_amount;

    -- 4. Determinar nuevo estado del cargo
    IF v_new_paid_amount <= 0 THEN
      v_new_status := 'pendiente';
    ELSIF v_new_paid_amount >= v_allocation.charge_total THEN
      v_new_status := 'pagado';
    ELSE
      v_new_status := 'parcial';
    END IF;

    -- 5. Actualizar el cargo
    UPDATE charges
    SET
      paid_amount = v_new_paid_amount,
      balance = v_new_balance,
      status = v_new_status,
      updated_at = NOW()
    WHERE id = v_allocation.charge_id;

    v_reversed_count := v_reversed_count + 1;
    v_total_reversed := v_total_reversed + v_allocation.amount_applied;
  END LOOP;

  -- 6. NO eliminar las payment_allocations - las mantenemos para auditoría
  -- Solo las marcamos como anuladas (si existe la columna) o las dejamos para trazabilidad
  -- Las allocations quedan como registro histórico de qué se había pagado

  -- 7. Marcar el pago como cancelado
  UPDATE payments
  SET
    status = 'cancelado',
    cancellation_reason = p_cancellation_reason,
    cancelled_at = NOW(),
    cancelled_by_profile_id = p_cancelled_by_profile_id,
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 8. Registrar en audit_logs si la tabla existe
  BEGIN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      performed_by,
      performed_at
    ) VALUES (
      'payments',
      p_payment_id,
      'ANULACION',
      jsonb_build_object(
        'status', v_payment.status,
        'total_amount', v_payment.total_amount,
        'folio_rec', v_payment.folio_rec
      ),
      jsonb_build_object(
        'status', 'cancelado',
        'cancellation_reason', p_cancellation_reason,
        'charges_reversed', v_reversed_count,
        'total_reversed', v_total_reversed
      ),
      p_cancelled_by_profile_id,
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Si audit_logs no existe, ignorar
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'folio_rec', v_payment.folio_rec,
    'charges_reversed', v_reversed_count,
    'total_reversed', v_total_reversed,
    'message', format('Pago REC-%s anulado. Se revirtieron %s cargos por un total de $%s',
      LPAD(v_payment.folio_rec::TEXT, 4, '0'),
      v_reversed_count,
      v_total_reversed)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION anular_payment IS 'Anula un pago y revierte automáticamente los saldos de todos los cargos afectados';

-- =============================================
-- Función: anular_egress (mejorada)
-- Revierte las cuentas por pagar cuando se anula un egreso
-- =============================================

CREATE OR REPLACE FUNCTION anular_egress(
  p_egress_id UUID,
  p_cancelled_by_profile_id UUID,
  p_cancellation_reason TEXT,
  p_check_action TEXT DEFAULT 'none' -- 'void', 'release', 'none'
)
RETURNS JSONB AS $$
DECLARE
  v_egress RECORD;
  v_allocation RECORD;
  v_payable RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
  v_reversed_count INT := 0;
  v_total_reversed NUMERIC := 0;
  v_check RECORD;
BEGIN
  -- 1. Verificar que el egreso existe y no está ya anulado
  SELECT * INTO v_egress
  FROM egresses
  WHERE id = p_egress_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Egreso no encontrado');
  END IF;

  IF v_egress.status = 'anulado' OR v_egress.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este egreso ya está anulado');
  END IF;

  -- 2. Manejar cheque asociado si existe
  SELECT * INTO v_check
  FROM checks
  WHERE egress_id = p_egress_id;

  IF FOUND AND p_check_action != 'none' THEN
    IF p_check_action = 'void' THEN
      -- Anular el cheque físicamente
      UPDATE checks
      SET
        status = 'anulado',
        notes = COALESCE(notes, '') || ' | Anulado con egreso: ' || p_cancellation_reason,
        updated_at = NOW()
      WHERE id = v_check.id;
    ELSIF p_check_action = 'release' THEN
      -- Liberar el cheque para reutilizarlo
      UPDATE checks
      SET
        status = 'disponible',
        egress_id = NULL,
        issue_date = NULL,
        notes = COALESCE(notes, '') || ' | Liberado por anulación de egreso',
        updated_at = NOW()
      WHERE id = v_check.id;
    END IF;
  END IF;

  -- 3. Revertir asignaciones a cuentas por pagar (payable_orders)
  FOR v_allocation IN
    SELECT ea.*, po.total_amount as payable_total, po.paid_amount as payable_paid
    FROM egress_allocations ea
    JOIN payable_orders po ON po.id = ea.payable_order_id
    WHERE ea.egress_id = p_egress_id
  LOOP
    -- Calcular nuevo paid_amount de la cuenta por pagar
    v_new_paid_amount := GREATEST(0, v_allocation.payable_paid - v_allocation.amount_allocated);

    -- Determinar nuevo estado
    IF v_new_paid_amount <= 0 THEN
      v_new_status := 'pendiente';
    ELSIF v_new_paid_amount >= v_allocation.payable_total THEN
      v_new_status := 'pagado';
    ELSE
      v_new_status := 'parcialmente_pagado';
    END IF;

    -- Actualizar la cuenta por pagar
    UPDATE payable_orders
    SET
      paid_amount = v_new_paid_amount,
      status = v_new_status,
      updated_at = NOW()
    WHERE id = v_allocation.payable_order_id;

    v_reversed_count := v_reversed_count + 1;
    v_total_reversed := v_total_reversed + v_allocation.amount_allocated;
  END LOOP;

  -- 4. Eliminar las asignaciones (a diferencia de payments, aquí sí las eliminamos)
  DELETE FROM egress_allocations WHERE egress_id = p_egress_id;

  -- 5. Marcar el egreso como anulado
  UPDATE egresses
  SET
    status = 'anulado',
    cancellation_reason = p_cancellation_reason,
    cancelled_at = NOW(),
    total_allocated_amount = 0,
    updated_at = NOW()
  WHERE id = p_egress_id;

  -- 6. Registrar en audit_logs si existe
  BEGIN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      performed_by,
      performed_at
    ) VALUES (
      'egresses',
      p_egress_id,
      'ANULACION',
      jsonb_build_object(
        'status', v_egress.status,
        'total_amount', v_egress.total_amount,
        'folio_eg', v_egress.folio_eg
      ),
      jsonb_build_object(
        'status', 'anulado',
        'cancellation_reason', p_cancellation_reason,
        'payables_reversed', v_reversed_count,
        'total_reversed', v_total_reversed,
        'check_action', p_check_action
      ),
      p_cancelled_by_profile_id,
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'egress_id', p_egress_id,
    'folio_eg', v_egress.folio_eg,
    'payables_reversed', v_reversed_count,
    'total_reversed', v_total_reversed,
    'check_action', p_check_action,
    'message', format('Egreso EG-%s anulado. Se revirtieron %s cuentas por pagar por un total de $%s',
      LPAD(v_egress.folio_eg::TEXT, 4, '0'),
      v_reversed_count,
      v_total_reversed)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION anular_egress IS 'Anula un egreso y revierte automáticamente las cuentas por pagar afectadas';

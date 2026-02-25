-- ============================================================================
-- SISTEMA DE SALDOS AUTOMÁTICOS PARA CUENTAS FINANCIERAS
-- ============================================================================
-- Este script implementa:
-- 1. Tabla account_movements para auditoría completa
-- 2. Triggers para actualizar current_balance automáticamente
-- 3. Función de transferencia entre cuentas
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE MOVIMIENTOS DE CUENTA (LIBRO MAYOR / AUDITORÍA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cuenta afectada
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,

  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'ingreso',           -- Pago recibido (REC)
    'egreso',            -- Pago a proveedor (EG)
    'transferencia_in',  -- Entrada por traspaso
    'transferencia_out', -- Salida por traspaso
    'ajuste_manual',     -- Corrección manual
    'apertura',          -- Saldo inicial
    'anulacion_ingreso', -- Reversión de pago anulado
    'anulacion_egreso',  -- Reversión de egreso anulado
    'nota_debito'        -- Rebote bancario u otro débito
  )),

  -- Montos
  amount NUMERIC(15, 2) NOT NULL,  -- Positivo = entrada, Negativo = salida
  balance_before NUMERIC(15, 2) NOT NULL,  -- Saldo antes del movimiento
  balance_after NUMERIC(15, 2) NOT NULL,   -- Saldo después del movimiento

  -- Referencias al origen del movimiento
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  egress_id UUID REFERENCES public.egresses(id) ON DELETE SET NULL,
  transfer_id UUID,  -- Para vincular transferencias (mismo ID en origen y destino)

  -- Metadata
  description TEXT,
  reference_number TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_account_movements_account
  ON public.account_movements(financial_account_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_movements_condominium
  ON public.account_movements(condominium_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_movements_payment
  ON public.account_movements(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_movements_egress
  ON public.account_movements(egress_id) WHERE egress_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_movements_transfer
  ON public.account_movements(transfer_id) WHERE transfer_id IS NOT NULL;

-- ============================================================================
-- 2. RLS PARA ACCOUNT_MOVEMENTS
-- ============================================================================

ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_movements_select_policy" ON public.account_movements;
CREATE POLICY "account_movements_select_policy" ON public.account_movements
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "account_movements_insert_policy" ON public.account_movements;
CREATE POLICY "account_movements_insert_policy" ON public.account_movements
  FOR INSERT WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 3. FUNCIÓN AUXILIAR: Registrar movimiento y actualizar saldo
-- ============================================================================

CREATE OR REPLACE FUNCTION register_account_movement(
  p_financial_account_id UUID,
  p_movement_type TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_egress_id UUID DEFAULT NULL,
  p_transfer_id UUID DEFAULT NULL,
  p_movement_date DATE DEFAULT CURRENT_DATE,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_account public.financial_accounts%ROWTYPE;
  v_movement_id UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
BEGIN
  -- Bloquear la cuenta para evitar race conditions
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_financial_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta financiera no encontrada: %', p_financial_account_id;
  END IF;

  v_balance_before := COALESCE(v_account.current_balance, 0);
  v_balance_after := v_balance_before + p_amount;

  -- Insertar movimiento
  INSERT INTO public.account_movements (
    financial_account_id,
    condominium_id,
    movement_type,
    amount,
    balance_before,
    balance_after,
    payment_id,
    egress_id,
    transfer_id,
    description,
    reference_number,
    movement_date,
    created_by
  ) VALUES (
    p_financial_account_id,
    v_account.condominium_id,
    p_movement_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_payment_id,
    p_egress_id,
    p_transfer_id,
    p_description,
    p_reference_number,
    p_movement_date,
    p_created_by
  )
  RETURNING id INTO v_movement_id;

  -- Actualizar saldo de la cuenta
  UPDATE public.financial_accounts
  SET current_balance = v_balance_after
  WHERE id = p_financial_account_id;

  RETURN v_movement_id;
END;
$$;

-- ============================================================================
-- 4. TRIGGER: Actualizar saldo en PAGOS (payments)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_payment_update_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT: Nuevo pago → sumar al saldo
  IF TG_OP = 'INSERT' THEN
    IF NEW.financial_account_id IS NOT NULL AND NEW.status = 'disponible' THEN
      PERFORM register_account_movement(
        NEW.financial_account_id,
        'ingreso',
        NEW.total_amount,
        COALESCE(NEW.notes, 'Pago recibido'),
        NEW.reference_number,
        NEW.id,  -- payment_id
        NULL,    -- egress_id
        NULL,    -- transfer_id
        NEW.payment_date,
        NEW.payer_profile_id
      );
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: Verificar si se anuló
  IF TG_OP = 'UPDATE' THEN
    -- Si cambió a 'cancelado' (anulación)
    IF OLD.status = 'disponible' AND NEW.status = 'cancelado' THEN
      IF NEW.financial_account_id IS NOT NULL THEN
        PERFORM register_account_movement(
          NEW.financial_account_id,
          'anulacion_ingreso',
          -OLD.total_amount,  -- Negativo para restar
          'Anulación: ' || COALESCE(NEW.cancellation_reason, 'Sin motivo'),
          NEW.reference_number,
          NEW.id,
          NULL,
          NULL,
          CURRENT_DATE,
          NEW.cancelled_by_profile_id
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Eliminar trigger anterior si existe (el que estaba en apply_payment_to_charges)
DROP TRIGGER IF EXISTS trg_payment_balance ON public.payments;
CREATE TRIGGER trg_payment_balance
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_payment_update_balance();

-- ============================================================================
-- 5. TRIGGER: Actualizar saldo en EGRESOS
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_egress_update_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT: Nuevo egreso → restar del saldo
  IF TG_OP = 'INSERT' THEN
    IF NEW.financial_account_id IS NOT NULL AND NEW.status != 'anulado' THEN
      PERFORM register_account_movement(
        NEW.financial_account_id,
        'egreso',
        -NEW.total_amount,  -- Negativo porque es salida
        COALESCE(NEW.notes, 'Pago a proveedor'),
        NEW.reference_number,
        NULL,    -- payment_id
        NEW.id,  -- egress_id
        NULL,    -- transfer_id
        NEW.payment_date,
        NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: Verificar si se anuló
  IF TG_OP = 'UPDATE' THEN
    -- Si cambió a 'anulado'
    IF OLD.status != 'anulado' AND NEW.status = 'anulado' THEN
      IF NEW.financial_account_id IS NOT NULL THEN
        PERFORM register_account_movement(
          NEW.financial_account_id,
          'anulacion_egreso',
          OLD.total_amount,  -- Positivo para devolver al saldo
          'Anulación egreso: ' || COALESCE(NEW.cancellation_reason, 'Sin motivo'),
          NEW.reference_number,
          NULL,
          NEW.id,
          NULL,
          CURRENT_DATE,
          NULL
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_egress_balance ON public.egresses;
CREATE TRIGGER trg_egress_balance
  AFTER INSERT OR UPDATE ON public.egresses
  FOR EACH ROW
  EXECUTE FUNCTION trg_egress_update_balance();

-- ============================================================================
-- 6. FUNCIÓN: Transferencia entre cuentas
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Transferencia entre cuentas',
  p_reference_number TEXT DEFAULT NULL,
  p_transfer_date DATE DEFAULT CURRENT_DATE,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_account public.financial_accounts%ROWTYPE;
  v_to_account public.financial_accounts%ROWTYPE;
  v_transfer_id UUID;
  v_movement_out_id UUID;
  v_movement_in_id UUID;
BEGIN
  -- Validar monto
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'El monto debe ser mayor a 0');
  END IF;

  -- Validar que las cuentas sean diferentes
  IF p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Las cuentas origen y destino deben ser diferentes');
  END IF;

  -- Bloquear ambas cuentas (en orden para evitar deadlocks)
  IF p_from_account_id < p_to_account_id THEN
    SELECT * INTO v_from_account FROM public.financial_accounts WHERE id = p_from_account_id FOR UPDATE;
    SELECT * INTO v_to_account FROM public.financial_accounts WHERE id = p_to_account_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_account FROM public.financial_accounts WHERE id = p_to_account_id FOR UPDATE;
    SELECT * INTO v_from_account FROM public.financial_accounts WHERE id = p_from_account_id FOR UPDATE;
  END IF;

  IF v_from_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cuenta origen no encontrada');
  END IF;

  IF v_to_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cuenta destino no encontrada');
  END IF;

  -- Validar que sean del mismo condominio
  IF v_from_account.condominium_id != v_to_account.condominium_id THEN
    RETURN json_build_object('success', false, 'error', 'Las cuentas deben pertenecer al mismo condominio');
  END IF;

  -- Validar saldo suficiente
  IF COALESCE(v_from_account.current_balance, 0) < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente. Disponible: $' || COALESCE(v_from_account.current_balance, 0)::TEXT
    );
  END IF;

  -- Generar ID único para vincular ambos movimientos
  v_transfer_id := gen_random_uuid();

  -- Registrar salida en cuenta origen
  v_movement_out_id := register_account_movement(
    p_from_account_id,
    'transferencia_out',
    -p_amount,
    p_description || ' → ' || v_to_account.bank_name,
    p_reference_number,
    NULL, NULL,
    v_transfer_id,
    p_transfer_date,
    p_created_by
  );

  -- Registrar entrada en cuenta destino
  v_movement_in_id := register_account_movement(
    p_to_account_id,
    'transferencia_in',
    p_amount,
    p_description || ' ← ' || v_from_account.bank_name,
    p_reference_number,
    NULL, NULL,
    v_transfer_id,
    p_transfer_date,
    p_created_by
  );

  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'movement_out_id', v_movement_out_id,
    'movement_in_id', v_movement_in_id,
    'amount', p_amount,
    'from_account', v_from_account.bank_name,
    'to_account', v_to_account.bank_name,
    'from_new_balance', COALESCE(v_from_account.current_balance, 0) - p_amount,
    'to_new_balance', COALESCE(v_to_account.current_balance, 0) + p_amount
  );
END;
$$;

-- ============================================================================
-- 7. FUNCIÓN: Ajuste manual de saldo (con auditoría)
-- ============================================================================

CREATE OR REPLACE FUNCTION adjust_account_balance(
  p_financial_account_id UUID,
  p_adjustment_amount NUMERIC,  -- Positivo = aumentar, Negativo = disminuir
  p_reason TEXT,
  p_adjusted_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_movement_id UUID;
  v_account public.financial_accounts%ROWTYPE;
BEGIN
  IF p_adjustment_amount = 0 THEN
    RETURN json_build_object('success', false, 'error', 'El ajuste no puede ser 0');
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Debe especificar el motivo del ajuste');
  END IF;

  SELECT * INTO v_account FROM public.financial_accounts WHERE id = p_financial_account_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cuenta no encontrada');
  END IF;

  v_movement_id := register_account_movement(
    p_financial_account_id,
    'ajuste_manual',
    p_adjustment_amount,
    'AJUSTE: ' || p_reason,
    NULL,
    NULL, NULL, NULL,
    CURRENT_DATE,
    p_adjusted_by
  );

  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_balance', COALESCE(v_account.current_balance, 0),
    'new_balance', COALESCE(v_account.current_balance, 0) + p_adjustment_amount
  );
END;
$$;

-- ============================================================================
-- 8. VISTA: Resumen de movimientos por cuenta
-- ============================================================================

CREATE OR REPLACE VIEW v_account_balance_summary AS
SELECT
  fa.id AS account_id,
  fa.condominium_id,
  fa.bank_name,
  fa.account_number,
  fa.account_type,
  fa.initial_balance,
  fa.current_balance,
  fa.is_active,
  COALESCE(SUM(am.amount) FILTER (WHERE am.amount > 0), 0) AS total_ingresos,
  COALESCE(SUM(ABS(am.amount)) FILTER (WHERE am.amount < 0), 0) AS total_egresos,
  COUNT(am.id) AS total_movimientos,
  MAX(am.created_at) AS ultimo_movimiento
FROM public.financial_accounts fa
LEFT JOIN public.account_movements am ON am.financial_account_id = fa.id
GROUP BY fa.id, fa.condominium_id, fa.bank_name, fa.account_number,
         fa.account_type, fa.initial_balance, fa.current_balance, fa.is_active;

-- ============================================================================
-- 9. ELIMINAR LA LÓGICA DUPLICADA DE apply_payment_to_charges
-- ============================================================================
-- La función apply_payment_to_charges ya no debe actualizar current_balance
-- porque ahora lo hace el trigger trg_payment_balance

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
  -- Crear el pago (el trigger trg_payment_balance se encarga del saldo)
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
          WHEN total_amount - (paid_amount + v_to_apply) <= 0.01 THEN 'pagado'
          WHEN paid_amount + v_to_apply > 0.01 THEN 'parcialmente_pagado'
          ELSE 'pendiente'
        END
    WHERE id = v_alloc.charge_id;

    v_allocated := v_allocated + v_to_apply;
  END LOOP;

  -- Actualizar el pago con el monto asignado
  UPDATE payments
  SET allocated_amount = v_allocated
  WHERE id = v_payment_id;

  -- *** ELIMINADO: UPDATE financial_accounts (ahora lo hace el trigger) ***

  -- Manejar excedente como crédito/saldo a favor
  v_excess := in_total_amount - v_allocated;

  IF v_excess > 0.01 AND in_unit_id IS NOT NULL THEN
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

-- ============================================================================
-- 10. MIGRAR SALDOS EXISTENTES A MOVIMIENTOS (SOLO SI HAY DATOS)
-- ============================================================================
-- Crear movimientos de apertura para cuentas existentes que no tienen movimientos

INSERT INTO public.account_movements (
  financial_account_id,
  condominium_id,
  movement_type,
  amount,
  balance_before,
  balance_after,
  description,
  movement_date,
  created_at
)
SELECT
  fa.id,
  fa.condominium_id,
  'apertura',
  fa.initial_balance,
  0,
  fa.initial_balance,
  'Saldo inicial de apertura',
  COALESCE(fa.created_at::date, CURRENT_DATE),
  COALESCE(fa.created_at, NOW())
FROM public.financial_accounts fa
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_movements am
  WHERE am.financial_account_id = fa.id
)
AND fa.initial_balance IS NOT NULL
AND fa.initial_balance != 0;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

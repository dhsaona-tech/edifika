-- ============================================================================
-- MIGRACIÓN 011: Sistema de Períodos de Caja Chica
-- ============================================================================
-- Implementa el ciclo completo: APERTURA → VALES → CIERRE → NUEVA APERTURA
-- Con manejo de diferencias (sobrante/faltante)
-- ============================================================================

-- 1. Tabla de períodos de caja chica
CREATE TABLE IF NOT EXISTS public.petty_cash_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,

  -- Período
  period_number INT NOT NULL, -- Número secuencial del período
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'cerrado')),

  -- Apertura
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by UUID REFERENCES auth.users(id),
  opening_amount NUMERIC(12,2) NOT NULL, -- Monto de apertura (puede ser > fondo si hay faltante anterior)
  previous_period_id UUID REFERENCES public.petty_cash_periods(id), -- Enlace al período anterior

  -- Cierre (se llena cuando status = 'cerrado')
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  physical_cash NUMERIC(12,2), -- Efectivo físico contado en el arqueo
  total_vouchers_amount NUMERIC(12,2), -- Suma de vales del período
  vouchers_count INT, -- Cantidad de vales

  -- Diferencia
  -- Positivo = sobrante (quedó más efectivo del esperado)
  -- Negativo = faltante (el custodio puso de su bolsillo)
  difference_amount NUMERIC(12,2), -- physical_cash - (opening_amount - total_vouchers_amount)
  difference_type TEXT CHECK (difference_type IN ('exacto', 'sobrante', 'faltante')),
  difference_notes TEXT, -- Explicación de la diferencia

  -- Siguiente apertura sugerida
  suggested_next_opening NUMERIC(12,2), -- Fondo base +/- diferencia

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_open_period_per_account UNIQUE (financial_account_id, status)
    -- Solo puede haber un período abierto por cuenta (parcial, se maneja con trigger)
);

-- 2. Agregar campo de período a los vales
ALTER TABLE public.petty_cash_vouchers
ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES public.petty_cash_periods(id);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_petty_cash_periods_account ON public.petty_cash_periods(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_periods_status ON public.petty_cash_periods(financial_account_id, status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_vouchers_period ON public.petty_cash_vouchers(period_id);

-- 4. RLS
ALTER TABLE public.petty_cash_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Periods belong to condominium" ON public.petty_cash_periods;
CREATE POLICY "Periods belong to condominium" ON public.petty_cash_periods
  FOR ALL USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships WHERE profile_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCIONES
-- ============================================================================

-- Eliminar función existente que será reemplazada (tiene nueva firma con period_id)
DROP FUNCTION IF EXISTS public.create_petty_cash_voucher(uuid,uuid,numeric,text,uuid,text,date,text,uuid);

-- 5. Función para abrir un nuevo período de caja chica
CREATE OR REPLACE FUNCTION public.open_petty_cash_period(
  p_condominium_id UUID,
  p_account_id UUID,
  p_opening_amount NUMERIC,
  p_opened_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_current_period RECORD;
  v_previous_period RECORD;
  v_period_number INT;
  v_new_period_id UUID;
BEGIN
  -- Verificar que la cuenta existe y es caja chica
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_account_id
    AND condominium_id = p_condominium_id
    AND account_type = 'caja_chica';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cuenta de caja chica no encontrada');
  END IF;

  -- Verificar que no hay período abierto
  SELECT * INTO v_current_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_account_id
    AND status = 'abierto';

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe un período abierto. Debe cerrarlo primero.');
  END IF;

  -- Obtener último período cerrado (si existe)
  SELECT * INTO v_previous_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_account_id
    AND status = 'cerrado'
  ORDER BY period_number DESC
  LIMIT 1;

  -- Calcular número de período
  IF v_previous_period.id IS NOT NULL THEN
    v_period_number := v_previous_period.period_number + 1;
  ELSE
    v_period_number := 1;
  END IF;

  -- Crear el nuevo período
  INSERT INTO public.petty_cash_periods (
    condominium_id,
    financial_account_id,
    period_number,
    status,
    opened_by,
    opening_amount,
    previous_period_id
  ) VALUES (
    p_condominium_id,
    p_account_id,
    v_period_number,
    'abierto',
    p_opened_by,
    p_opening_amount,
    v_previous_period.id
  )
  RETURNING id INTO v_new_period_id;

  -- Actualizar el cash_on_hand de la cuenta
  UPDATE public.financial_accounts
  SET cash_on_hand = p_opening_amount
  WHERE id = p_account_id;

  -- Registrar movimiento de apertura (si es necesario ajustar el saldo)
  -- El saldo ya debería estar actualizado por la transferencia previa

  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_new_period_id,
    'period_number', v_period_number,
    'opening_amount', p_opening_amount
  );
END;
$$;

-- 6. Función para cerrar un período de caja chica
CREATE OR REPLACE FUNCTION public.close_petty_cash_period(
  p_condominium_id UUID,
  p_account_id UUID,
  p_physical_cash NUMERIC, -- Efectivo físico contado
  p_difference_notes TEXT DEFAULT NULL,
  p_closed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period RECORD;
  v_total_vouchers NUMERIC;
  v_vouchers_count INT;
  v_expected_cash NUMERIC;
  v_difference NUMERIC;
  v_difference_type TEXT;
  v_max_amount NUMERIC;
  v_suggested_next NUMERIC;
BEGIN
  -- Obtener período abierto
  SELECT * INTO v_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_account_id
    AND condominium_id = p_condominium_id
    AND status = 'abierto';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay período abierto para cerrar');
  END IF;

  -- Calcular total de vales del período (solo pendientes y repuestos, no anulados)
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_total_vouchers, v_vouchers_count
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_account_id
    AND period_id = v_period.id
    AND status != 'anulado';

  -- Calcular efectivo esperado
  v_expected_cash := v_period.opening_amount - v_total_vouchers;

  -- Calcular diferencia
  -- Positivo = sobrante (hay más efectivo del esperado)
  -- Negativo = faltante (el custodio adelantó dinero)
  v_difference := p_physical_cash - v_expected_cash;

  IF v_difference > 0 THEN
    v_difference_type := 'sobrante';
  ELSIF v_difference < 0 THEN
    v_difference_type := 'faltante';
  ELSE
    v_difference_type := 'exacto';
  END IF;

  -- Obtener fondo máximo de la cuenta
  SELECT max_amount INTO v_max_amount
  FROM public.financial_accounts
  WHERE id = p_account_id;

  -- Calcular sugerencia para próxima apertura
  -- Si hay sobrante: fondo - sobrante (el sobrante ya está en caja)
  -- Si hay faltante: fondo + |faltante| (para devolver al custodio)
  IF v_difference > 0 THEN
    -- Sobrante: el efectivo sobrante ya está, solo reponer lo gastado
    v_suggested_next := v_total_vouchers;
  ELSIF v_difference < 0 THEN
    -- Faltante: reponer lo gastado + devolver lo que adelantó el custodio
    v_suggested_next := v_max_amount + ABS(v_difference);
  ELSE
    -- Exacto: reponer el fondo completo
    v_suggested_next := v_max_amount;
  END IF;

  -- Actualizar el período
  UPDATE public.petty_cash_periods
  SET
    status = 'cerrado',
    closed_at = NOW(),
    closed_by = p_closed_by,
    physical_cash = p_physical_cash,
    total_vouchers_amount = v_total_vouchers,
    vouchers_count = v_vouchers_count,
    difference_amount = v_difference,
    difference_type = v_difference_type,
    difference_notes = p_difference_notes,
    suggested_next_opening = v_suggested_next
  WHERE id = v_period.id;

  -- Actualizar cash_on_hand de la cuenta
  UPDATE public.financial_accounts
  SET cash_on_hand = p_physical_cash
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period.id,
    'total_vouchers', v_total_vouchers,
    'vouchers_count', v_vouchers_count,
    'expected_cash', v_expected_cash,
    'physical_cash', p_physical_cash,
    'difference', v_difference,
    'difference_type', v_difference_type,
    'suggested_next_opening', v_suggested_next
  );
END;
$$;

-- 7. Actualizar la función de crear vale para asignarlo al período activo
CREATE OR REPLACE FUNCTION public.create_petty_cash_voucher(
  p_condominium_id UUID,
  p_financial_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_expense_item_id UUID DEFAULT NULL,
  p_beneficiary TEXT DEFAULT NULL,
  p_voucher_date DATE DEFAULT CURRENT_DATE,
  p_receipt_url TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_current_period RECORD;
  v_voucher_number INT;
  v_new_voucher_id UUID;
  v_cash_available NUMERIC;
BEGIN
  -- Verificar cuenta
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_financial_account_id
    AND condominium_id = p_condominium_id
    AND account_type = 'caja_chica'
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cuenta de caja chica no encontrada o inactiva');
  END IF;

  -- Verificar que hay un período abierto
  SELECT * INTO v_current_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_financial_account_id
    AND status = 'abierto';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay período abierto. Debe abrir un período primero.');
  END IF;

  -- Calcular efectivo disponible (considerando vales del período actual)
  SELECT v_current_period.opening_amount - COALESCE(SUM(amount), 0)
  INTO v_cash_available
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_financial_account_id
    AND period_id = v_current_period.id
    AND status = 'pendiente';

  -- Advertencia si excede el efectivo (pero permitir, porque el custodio puede adelantar)
  -- Solo registrar en log, no bloquear

  -- Obtener siguiente número de vale
  SELECT COALESCE(MAX(voucher_number), 0) + 1 INTO v_voucher_number
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_financial_account_id;

  -- Crear vale
  INSERT INTO public.petty_cash_vouchers (
    condominium_id,
    financial_account_id,
    period_id,
    expense_item_id,
    voucher_number,
    voucher_date,
    amount,
    description,
    beneficiary,
    receipt_url,
    status,
    created_by
  ) VALUES (
    p_condominium_id,
    p_financial_account_id,
    v_current_period.id,
    p_expense_item_id,
    v_voucher_number,
    p_voucher_date,
    p_amount,
    p_description,
    p_beneficiary,
    p_receipt_url,
    'pendiente',
    p_created_by
  )
  RETURNING id INTO v_new_voucher_id;

  -- Actualizar cash_on_hand
  UPDATE public.financial_accounts
  SET cash_on_hand = cash_on_hand - p_amount
  WHERE id = p_financial_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'voucher_id', v_new_voucher_id,
    'voucher_number', v_voucher_number,
    'period_id', v_current_period.id,
    'cash_available_after', v_cash_available - p_amount
  );
END;
$$;

-- 8. Función para obtener estado del período actual
CREATE OR REPLACE FUNCTION public.get_petty_cash_period_status(
  p_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_period RECORD;
  v_total_vouchers NUMERIC;
  v_vouchers_count INT;
  v_expected_cash NUMERIC;
  v_last_closed_period RECORD;
BEGIN
  -- Obtener cuenta
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_account_id
    AND account_type = 'caja_chica';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cuenta no encontrada');
  END IF;

  -- Buscar período abierto
  SELECT * INTO v_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_account_id
    AND status = 'abierto';

  IF NOT FOUND THEN
    -- No hay período abierto, buscar último cerrado
    SELECT * INTO v_last_closed_period
    FROM public.petty_cash_periods
    WHERE financial_account_id = p_account_id
      AND status = 'cerrado'
    ORDER BY period_number DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'has_open_period', false,
      'last_closed_period', CASE WHEN v_last_closed_period.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_last_closed_period.id,
          'period_number', v_last_closed_period.period_number,
          'closed_at', v_last_closed_period.closed_at,
          'difference_type', v_last_closed_period.difference_type,
          'difference_amount', v_last_closed_period.difference_amount,
          'suggested_next_opening', v_last_closed_period.suggested_next_opening
        )
      ELSE NULL END,
      'max_amount', v_account.max_amount,
      'suggested_opening', COALESCE(v_last_closed_period.suggested_next_opening, v_account.max_amount)
    );
  END IF;

  -- Calcular totales del período abierto
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_total_vouchers, v_vouchers_count
  FROM public.petty_cash_vouchers
  WHERE period_id = v_period.id
    AND status != 'anulado';

  v_expected_cash := v_period.opening_amount - v_total_vouchers;

  RETURN jsonb_build_object(
    'success', true,
    'has_open_period', true,
    'period', jsonb_build_object(
      'id', v_period.id,
      'period_number', v_period.period_number,
      'opened_at', v_period.opened_at,
      'opening_amount', v_period.opening_amount,
      'total_vouchers', v_total_vouchers,
      'vouchers_count', v_vouchers_count,
      'expected_cash', v_expected_cash,
      'cash_on_hand', v_account.cash_on_hand
    ),
    'max_amount', v_account.max_amount
  );
END;
$$;

-- 9. Vista resumen de períodos
CREATE OR REPLACE VIEW public.v_petty_cash_periods_summary AS
SELECT
  p.id,
  p.condominium_id,
  p.financial_account_id,
  fa.bank_name AS account_name,
  p.period_number,
  p.status,
  p.opened_at,
  p.opening_amount,
  p.closed_at,
  p.physical_cash,
  p.total_vouchers_amount,
  p.vouchers_count,
  p.difference_amount,
  p.difference_type,
  p.suggested_next_opening,
  -- Días del período
  CASE
    WHEN p.status = 'cerrado' THEN
      EXTRACT(DAY FROM (p.closed_at - p.opened_at))::INT
    ELSE
      EXTRACT(DAY FROM (NOW() - p.opened_at))::INT
  END AS days_duration
FROM public.petty_cash_periods p
JOIN public.financial_accounts fa ON fa.id = p.financial_account_id;

-- 10. Función helper para obtener monto sugerido de apertura
CREATE OR REPLACE FUNCTION public.get_suggested_opening_amount(
  p_account_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_last_period RECORD;
BEGIN
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Buscar último período cerrado
  SELECT * INTO v_last_period
  FROM public.petty_cash_periods
  WHERE financial_account_id = p_account_id
    AND status = 'cerrado'
  ORDER BY period_number DESC
  LIMIT 1;

  IF v_last_period.id IS NOT NULL THEN
    RETURN COALESCE(v_last_period.suggested_next_opening, v_account.max_amount);
  ELSE
    RETURN COALESCE(v_account.max_amount, v_account.initial_balance);
  END IF;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT ON public.petty_cash_periods TO authenticated;
GRANT INSERT, UPDATE ON public.petty_cash_periods TO authenticated;
GRANT SELECT ON public.v_petty_cash_periods_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_petty_cash_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_petty_cash_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_petty_cash_period_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggested_opening_amount TO authenticated;

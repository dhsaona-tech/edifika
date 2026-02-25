-- ============================================================================
-- SISTEMA DE CAJA CHICA (PETTY CASH)
-- ============================================================================
-- Implementa:
-- 1. Campos adicionales en financial_accounts para caja chica
-- 2. Tabla de vales de caja chica
-- 3. Proceso de reposición/liquidación
-- ============================================================================

-- ============================================================================
-- 1. CAMPOS ADICIONALES EN FINANCIAL_ACCOUNTS PARA CAJA CHICA
-- ============================================================================

-- Monto máximo del fondo de caja chica
ALTER TABLE public.financial_accounts
  ADD COLUMN IF NOT EXISTS max_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS custodian_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cash_on_hand NUMERIC(15, 2); -- Efectivo disponible físicamente

-- Comentario: cash_on_hand = max_amount - SUM(vales pendientes de reposición)

-- ============================================================================
-- 2. TABLA DE VALES DE CAJA CHICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.petty_cash_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  expense_item_id UUID REFERENCES public.expense_items(id),  -- Rubro del presupuesto

  -- Datos del vale
  voucher_number SERIAL,  -- Número correlativo
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  beneficiary TEXT,  -- A quién se le pagó

  -- Comprobante físico (foto del recibo)
  receipt_url TEXT,  -- URL en Supabase Storage

  -- Estado del vale
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',    -- Registrado, pendiente de reposición
    'repuesto',     -- Ya fue incluido en una reposición
    'anulado'       -- Anulado por error
  )),

  -- Reposición
  replenishment_id UUID,  -- ID de la reposición que incluyó este vale
  replenished_at TIMESTAMPTZ,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),

  -- Anulación
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_petty_cash_vouchers_account
  ON public.petty_cash_vouchers(financial_account_id, voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_vouchers_status
  ON public.petty_cash_vouchers(financial_account_id, status) WHERE status = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_petty_cash_vouchers_condominium
  ON public.petty_cash_vouchers(condominium_id);

-- ============================================================================
-- 3. TABLA DE REPOSICIONES DE CAJA CHICA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.petty_cash_replenishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,

  -- Cuenta origen (de donde sale el dinero para reponer)
  source_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),

  -- Montos
  total_amount NUMERIC(15, 2) NOT NULL,  -- Suma de todos los vales
  vouchers_count INTEGER NOT NULL,

  -- Estado
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',    -- Creada, esperando pago
    'pagada',       -- Ya se transfirió el dinero
    'anulada'
  )),

  -- Orden de pago generada (opcional)
  payable_order_id UUID REFERENCES public.payable_orders(id),
  egress_id UUID REFERENCES public.egresses(id),

  -- Fechas
  replenishment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_replenishments_account
  ON public.petty_cash_replenishments(financial_account_id, replenishment_date DESC);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.petty_cash_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_replenishments ENABLE ROW LEVEL SECURITY;

-- Políticas para vales
DROP POLICY IF EXISTS "petty_cash_vouchers_select" ON public.petty_cash_vouchers;
CREATE POLICY "petty_cash_vouchers_select" ON public.petty_cash_vouchers
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "petty_cash_vouchers_insert" ON public.petty_cash_vouchers;
CREATE POLICY "petty_cash_vouchers_insert" ON public.petty_cash_vouchers
  FOR INSERT WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "petty_cash_vouchers_update" ON public.petty_cash_vouchers;
CREATE POLICY "petty_cash_vouchers_update" ON public.petty_cash_vouchers
  FOR UPDATE USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Políticas para reposiciones
DROP POLICY IF EXISTS "petty_cash_replenishments_select" ON public.petty_cash_replenishments;
CREATE POLICY "petty_cash_replenishments_select" ON public.petty_cash_replenishments
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "petty_cash_replenishments_insert" ON public.petty_cash_replenishments;
CREATE POLICY "petty_cash_replenishments_insert" ON public.petty_cash_replenishments
  FOR INSERT WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "petty_cash_replenishments_update" ON public.petty_cash_replenishments;
CREATE POLICY "petty_cash_replenishments_update" ON public.petty_cash_replenishments
  FOR UPDATE USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 5. FUNCIÓN: Calcular efectivo disponible en caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION get_petty_cash_status(p_account_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_account public.financial_accounts%ROWTYPE;
  v_pending_vouchers NUMERIC;
  v_pending_count INTEGER;
  v_cash_available NUMERIC;
BEGIN
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_account_id;

  IF NOT FOUND OR v_account.account_type != 'caja_chica' THEN
    RETURN json_build_object('error', 'Cuenta no es caja chica');
  END IF;

  -- Sumar vales pendientes de reposición
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_pending_vouchers, v_pending_count
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_account_id
    AND status = 'pendiente';

  -- Efectivo disponible = Monto máximo - Vales pendientes
  v_cash_available := COALESCE(v_account.max_amount, 0) - v_pending_vouchers;

  RETURN json_build_object(
    'account_id', v_account.id,
    'bank_name', v_account.bank_name,
    'max_amount', COALESCE(v_account.max_amount, 0),
    'pending_vouchers_amount', v_pending_vouchers,
    'pending_vouchers_count', v_pending_count,
    'cash_available', v_cash_available,
    'custodian_id', v_account.custodian_id,
    'needs_replenishment', v_cash_available < (COALESCE(v_account.max_amount, 0) * 0.2)
  );
END;
$$;

-- ============================================================================
-- 6. FUNCIÓN: Registrar vale de caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION create_petty_cash_voucher(
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
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_account public.financial_accounts%ROWTYPE;
  v_cash_available NUMERIC;
  v_pending_amount NUMERIC;
  v_voucher_id UUID;
BEGIN
  -- Verificar que es caja chica
  SELECT * INTO v_account
  FROM public.financial_accounts
  WHERE id = p_financial_account_id
    AND condominium_id = p_condominium_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cuenta no encontrada');
  END IF;

  IF v_account.account_type != 'caja_chica' THEN
    RETURN json_build_object('success', false, 'error', 'Esta función es solo para caja chica');
  END IF;

  -- Calcular efectivo disponible
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_financial_account_id
    AND status = 'pendiente';

  v_cash_available := COALESCE(v_account.max_amount, 0) - v_pending_amount;

  -- Verificar que hay efectivo suficiente
  IF p_amount > v_cash_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Efectivo insuficiente. Disponible: $' || v_cash_available::TEXT
    );
  END IF;

  -- Crear el vale
  INSERT INTO public.petty_cash_vouchers (
    condominium_id,
    financial_account_id,
    expense_item_id,
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
    p_expense_item_id,
    p_voucher_date,
    p_amount,
    p_description,
    p_beneficiary,
    p_receipt_url,
    'pendiente',
    p_created_by
  )
  RETURNING id INTO v_voucher_id;

  -- Actualizar cash_on_hand
  UPDATE public.financial_accounts
  SET cash_on_hand = COALESCE(max_amount, 0) - v_pending_amount - p_amount
  WHERE id = p_financial_account_id;

  RETURN json_build_object(
    'success', true,
    'voucher_id', v_voucher_id,
    'new_cash_available', v_cash_available - p_amount
  );
END;
$$;

-- ============================================================================
-- 7. FUNCIÓN: Anular vale de caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_petty_cash_voucher(
  p_voucher_id UUID,
  p_reason TEXT,
  p_cancelled_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_voucher public.petty_cash_vouchers%ROWTYPE;
BEGIN
  SELECT * INTO v_voucher
  FROM public.petty_cash_vouchers
  WHERE id = p_voucher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Vale no encontrado');
  END IF;

  IF v_voucher.status = 'anulado' THEN
    RETURN json_build_object('success', false, 'error', 'El vale ya está anulado');
  END IF;

  IF v_voucher.status = 'repuesto' THEN
    RETURN json_build_object('success', false, 'error', 'No se puede anular un vale ya repuesto');
  END IF;

  -- Anular el vale
  UPDATE public.petty_cash_vouchers
  SET status = 'anulado',
      cancelled_at = NOW(),
      cancelled_by = p_cancelled_by,
      cancellation_reason = p_reason
  WHERE id = p_voucher_id;

  -- Actualizar cash_on_hand (devolver el monto)
  UPDATE public.financial_accounts fa
  SET cash_on_hand = cash_on_hand + v_voucher.amount
  WHERE id = v_voucher.financial_account_id;

  RETURN json_build_object('success', true, 'message', 'Vale anulado correctamente');
END;
$$;

-- ============================================================================
-- 8. FUNCIÓN: Crear reposición de caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION create_petty_cash_replenishment(
  p_condominium_id UUID,
  p_petty_cash_account_id UUID,
  p_source_account_id UUID,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_petty_cash public.financial_accounts%ROWTYPE;
  v_source public.financial_accounts%ROWTYPE;
  v_total_amount NUMERIC;
  v_vouchers_count INTEGER;
  v_replenishment_id UUID;
  v_voucher_ids UUID[];
BEGIN
  -- Verificar caja chica
  SELECT * INTO v_petty_cash
  FROM public.financial_accounts
  WHERE id = p_petty_cash_account_id
    AND condominium_id = p_condominium_id
    AND account_type = 'caja_chica';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Caja chica no encontrada');
  END IF;

  -- Verificar cuenta origen
  SELECT * INTO v_source
  FROM public.financial_accounts
  WHERE id = p_source_account_id
    AND condominium_id = p_condominium_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cuenta origen no encontrada');
  END IF;

  -- Obtener vales pendientes
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*),
    ARRAY_AGG(id)
  INTO v_total_amount, v_vouchers_count, v_voucher_ids
  FROM public.petty_cash_vouchers
  WHERE financial_account_id = p_petty_cash_account_id
    AND status = 'pendiente';

  IF v_vouchers_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No hay vales pendientes de reposición');
  END IF;

  -- Verificar saldo suficiente en cuenta origen
  IF COALESCE(v_source.current_balance, 0) < v_total_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente en cuenta origen. Disponible: $' || COALESCE(v_source.current_balance, 0)::TEXT
    );
  END IF;

  -- Crear la reposición
  INSERT INTO public.petty_cash_replenishments (
    condominium_id,
    financial_account_id,
    source_account_id,
    total_amount,
    vouchers_count,
    status,
    created_by,
    notes
  ) VALUES (
    p_condominium_id,
    p_petty_cash_account_id,
    p_source_account_id,
    v_total_amount,
    v_vouchers_count,
    'pendiente',
    p_created_by,
    p_notes
  )
  RETURNING id INTO v_replenishment_id;

  -- Marcar vales como "en proceso de reposición"
  UPDATE public.petty_cash_vouchers
  SET replenishment_id = v_replenishment_id
  WHERE id = ANY(v_voucher_ids);

  RETURN json_build_object(
    'success', true,
    'replenishment_id', v_replenishment_id,
    'total_amount', v_total_amount,
    'vouchers_count', v_vouchers_count,
    'source_account', v_source.bank_name
  );
END;
$$;

-- ============================================================================
-- 9. FUNCIÓN: Ejecutar/Pagar reposición de caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_petty_cash_replenishment(
  p_replenishment_id UUID,
  p_executed_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_replenishment public.petty_cash_replenishments%ROWTYPE;
  v_transfer_result JSON;
BEGIN
  SELECT * INTO v_replenishment
  FROM public.petty_cash_replenishments
  WHERE id = p_replenishment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reposición no encontrada');
  END IF;

  IF v_replenishment.status != 'pendiente' THEN
    RETURN json_build_object('success', false, 'error', 'La reposición ya fue procesada');
  END IF;

  -- Ejecutar transferencia de cuenta origen a caja chica
  v_transfer_result := transfer_between_accounts(
    v_replenishment.source_account_id,
    v_replenishment.financial_account_id,
    v_replenishment.total_amount,
    'Reposición de caja chica',
    NULL,
    CURRENT_DATE,
    p_executed_by
  );

  IF NOT (v_transfer_result->>'success')::boolean THEN
    RETURN v_transfer_result;
  END IF;

  -- Actualizar estado de la reposición
  UPDATE public.petty_cash_replenishments
  SET status = 'pagada',
      paid_at = NOW()
  WHERE id = p_replenishment_id;

  -- Marcar vales como repuestos
  UPDATE public.petty_cash_vouchers
  SET status = 'repuesto',
      replenished_at = NOW()
  WHERE replenishment_id = p_replenishment_id
    AND status = 'pendiente';

  -- Actualizar cash_on_hand de la caja chica al máximo
  UPDATE public.financial_accounts
  SET cash_on_hand = max_amount
  WHERE id = v_replenishment.financial_account_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reposición ejecutada correctamente',
    'transfer_id', v_transfer_result->>'transfer_id'
  );
END;
$$;

-- ============================================================================
-- 10. TRIGGER: Inicializar cash_on_hand al crear caja chica
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_init_petty_cash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.account_type = 'caja_chica' AND NEW.max_amount IS NOT NULL THEN
    NEW.cash_on_hand := NEW.max_amount;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_petty_cash ON public.financial_accounts;
CREATE TRIGGER trg_init_petty_cash
  BEFORE INSERT OR UPDATE ON public.financial_accounts
  FOR EACH ROW
  WHEN (NEW.account_type = 'caja_chica')
  EXECUTE FUNCTION trg_init_petty_cash();

-- ============================================================================
-- 11. VISTA: Resumen de caja chica
-- ============================================================================

CREATE OR REPLACE VIEW v_petty_cash_summary AS
SELECT
  fa.id AS account_id,
  fa.condominium_id,
  fa.bank_name,
  fa.account_number,
  fa.max_amount,
  fa.cash_on_hand,
  fa.custodian_id,
  p.full_name AS custodian_name,
  COALESCE(pending.amount, 0) AS pending_vouchers_amount,
  COALESCE(pending.count, 0) AS pending_vouchers_count,
  COALESCE(fa.max_amount, 0) - COALESCE(pending.amount, 0) AS cash_available,
  CASE
    WHEN COALESCE(fa.max_amount, 0) > 0
    THEN ROUND((COALESCE(pending.amount, 0) / fa.max_amount) * 100, 1)
    ELSE 0
  END AS usage_percentage
FROM public.financial_accounts fa
LEFT JOIN public.profiles p ON p.id = fa.custodian_id
LEFT JOIN (
  SELECT
    financial_account_id,
    SUM(amount) AS amount,
    COUNT(*) AS count
  FROM public.petty_cash_vouchers
  WHERE status = 'pendiente'
  GROUP BY financial_account_id
) pending ON pending.financial_account_id = fa.id
WHERE fa.account_type = 'caja_chica';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

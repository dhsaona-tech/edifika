-- ============================================================================
-- MOTOR DE FACTURACIÓN EDIFIKA - SQL COMPLETO
-- ============================================================================
-- Este archivo contiene todas las migraciones necesarias para implementar:
-- 1. Configuración de facturación por condominio (pronto pago, mora)
-- 2. Extensiones a charges (cuotas diferidas, intereses)
-- 3. Planes extraordinarios (cuotas diferidas masivas)
-- 4. Convenios de pago (arreglos de pago de deuda)
-- 5. Sistema de créditos/saldos a favor (ledger)
-- 6. Auditoría completa
-- ============================================================================

-- ============================================================================
-- 1. TABLA: condominium_billing_settings
-- Configuración de facturación por condominio
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.condominium_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL UNIQUE REFERENCES public.condominiums(id) ON DELETE CASCADE,

  -- Configuración de Pronto Pago
  early_payment_enabled BOOLEAN DEFAULT false,
  early_payment_type TEXT CHECK (early_payment_type IN ('porcentaje', 'monto_fijo')),
  early_payment_value NUMERIC(12,2) DEFAULT 0, -- % o monto fijo según type
  early_payment_cutoff_day INTEGER CHECK (early_payment_cutoff_day BETWEEN 1 AND 28), -- Día límite del mes

  -- Configuración de Mora/Interés
  late_fee_enabled BOOLEAN DEFAULT false,
  late_fee_type TEXT CHECK (late_fee_type IN ('porcentaje', 'monto_fijo')),
  late_fee_value NUMERIC(12,2) DEFAULT 0, -- % mensual o monto fijo
  late_fee_grace_days INTEGER DEFAULT 0, -- Días de gracia después de vencimiento
  late_fee_apply_on TEXT DEFAULT 'balance' CHECK (late_fee_apply_on IN ('balance', 'total')),
  late_fee_max_rate NUMERIC(5,2) DEFAULT NULL, -- Tope máximo de mora (opcional)
  late_fee_compound BOOLEAN DEFAULT false, -- ¿Interés compuesto?

  -- Configuración general de facturación
  default_due_day INTEGER DEFAULT 15 CHECK (default_due_day BETWEEN 1 AND 28),
  auto_generate_charges BOOLEAN DEFAULT false, -- Auto-generar cargos mensuales

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_billing_settings_condo
  ON public.condominium_billing_settings(condominium_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_billing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_settings_updated ON public.condominium_billing_settings;
CREATE TRIGGER trg_billing_settings_updated
  BEFORE UPDATE ON public.condominium_billing_settings
  FOR EACH ROW EXECUTE FUNCTION update_billing_settings_timestamp();

-- RLS
ALTER TABLE public.condominium_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_settings_select" ON public.condominium_billing_settings;
CREATE POLICY "billing_settings_select" ON public.condominium_billing_settings
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "billing_settings_manage" ON public.condominium_billing_settings;
CREATE POLICY "billing_settings_manage" ON public.condominium_billing_settings
  FOR ALL USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

COMMENT ON TABLE public.condominium_billing_settings IS 'Configuración de facturación por condominio: pronto pago, mora, vencimientos';

-- ============================================================================
-- 2. MODIFICACIONES A TABLA charges
-- Agregar columnas para pronto pago, mora, y cuotas diferidas
-- ============================================================================

-- Nuevos tipos de cargo
DO $$
BEGIN
  -- Agregar 'interest' y 'extraordinary_installment' si no existen en el enum o check
  -- Como charges usa TEXT con check implícito, solo documentamos los nuevos valores:
  -- 'interest' = cargo de mora/interés
  -- 'extraordinary_installment' = cuota de plan extraordinario
  NULL; -- Placeholder, los valores se agregan mediante inserts
END $$;

-- Columnas para pronto pago
ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS early_payment_eligible BOOLEAN DEFAULT false;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS early_payment_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS early_payment_deadline DATE;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS early_payment_applied BOOLEAN DEFAULT false;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS early_payment_applied_at TIMESTAMPTZ;

-- Columnas para mora
ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS late_fee_eligible BOOLEAN DEFAULT true;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS late_fee_exemption_reason TEXT;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS parent_charge_id UUID REFERENCES public.charges(id);

-- Columnas para cuotas diferidas (extraordinarias)
ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS extraordinary_plan_id UUID;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS installment_number INTEGER;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS total_installments INTEGER;

-- Índices para nuevas columnas
CREATE INDEX IF NOT EXISTS idx_charges_parent
  ON public.charges(parent_charge_id) WHERE parent_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_charges_extraordinary_plan
  ON public.charges(extraordinary_plan_id) WHERE extraordinary_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_charges_early_payment
  ON public.charges(early_payment_eligible, early_payment_deadline)
  WHERE early_payment_eligible = true;

-- Actualizar comentario de la tabla
COMMENT ON COLUMN public.charges.early_payment_eligible IS 'Si el cargo califica para pronto pago';
COMMENT ON COLUMN public.charges.early_payment_amount IS 'Monto de descuento por pronto pago';
COMMENT ON COLUMN public.charges.early_payment_deadline IS 'Fecha límite para aplicar pronto pago';
COMMENT ON COLUMN public.charges.early_payment_applied IS 'Si ya se aplicó el descuento';
COMMENT ON COLUMN public.charges.late_fee_eligible IS 'Si el cargo puede generar mora';
COMMENT ON COLUMN public.charges.late_fee_exemption_reason IS 'Razón de exención de mora (si aplica)';
COMMENT ON COLUMN public.charges.parent_charge_id IS 'Para cargos de interés: referencia al cargo original';
COMMENT ON COLUMN public.charges.extraordinary_plan_id IS 'Plan extraordinario al que pertenece esta cuota';
COMMENT ON COLUMN public.charges.installment_number IS 'Número de cuota (1, 2, 3...)';
COMMENT ON COLUMN public.charges.total_installments IS 'Total de cuotas del plan';

-- ============================================================================
-- 3. TABLA: extraordinary_plans
-- Planes de cuotas extraordinarias diferidas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.extraordinary_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,

  -- Información del plan
  name TEXT NOT NULL,
  description TEXT,
  expense_item_id UUID NOT NULL REFERENCES public.expense_items(id),

  -- Distribución
  distribution_method TEXT NOT NULL CHECK (distribution_method IN ('por_aliquota', 'igualitario', 'manual')),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),

  -- Diferimiento
  total_installments INTEGER NOT NULL CHECK (total_installments BETWEEN 1 AND 60),
  start_period DATE NOT NULL, -- Primer mes de cobro

  -- Estado
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'activo', 'completado', 'cancelado')),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT
);

-- Tabla de distribución por unidad para planes manuales
CREATE TABLE IF NOT EXISTS public.extraordinary_plan_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraordinary_plan_id UUID NOT NULL REFERENCES public.extraordinary_plans(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  installment_amount NUMERIC(12,2) NOT NULL CHECK (installment_amount >= 0),

  UNIQUE(extraordinary_plan_id, unit_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extraordinary_plans_condo
  ON public.extraordinary_plans(condominium_id);

CREATE INDEX IF NOT EXISTS idx_extraordinary_plans_status
  ON public.extraordinary_plans(status);

CREATE INDEX IF NOT EXISTS idx_extraordinary_plan_units_plan
  ON public.extraordinary_plan_units(extraordinary_plan_id);

-- Agregar foreign key a charges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_charges_extraordinary_plan'
  ) THEN
    ALTER TABLE public.charges
      ADD CONSTRAINT fk_charges_extraordinary_plan
      FOREIGN KEY (extraordinary_plan_id)
      REFERENCES public.extraordinary_plans(id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.extraordinary_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraordinary_plan_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extraordinary_plans_select" ON public.extraordinary_plans;
CREATE POLICY "extraordinary_plans_select" ON public.extraordinary_plans
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "extraordinary_plans_manage" ON public.extraordinary_plans;
CREATE POLICY "extraordinary_plans_manage" ON public.extraordinary_plans
  FOR ALL USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "extraordinary_plan_units_access" ON public.extraordinary_plan_units;
CREATE POLICY "extraordinary_plan_units_access" ON public.extraordinary_plan_units
  FOR ALL USING (
    extraordinary_plan_id IN (
      SELECT id FROM public.extraordinary_plans
      WHERE condominium_id IN (
        SELECT condominium_id FROM public.memberships
        WHERE profile_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.extraordinary_plans IS 'Planes de cuotas extraordinarias con diferimiento';
COMMENT ON TABLE public.extraordinary_plan_units IS 'Distribución por unidad para planes extraordinarios manuales';

-- ============================================================================
-- 4. TABLA: payment_agreements
-- Convenios de pago para deuda existente
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

  -- Términos del convenio
  original_debt_amount NUMERIC(12,2) NOT NULL, -- Deuda total al momento de crear
  total_amount NUMERIC(12,2) NOT NULL, -- Puede incluir intereses o descuentos
  down_payment NUMERIC(12,2) DEFAULT 0, -- Pago inicial
  remaining_amount NUMERIC(12,2) NOT NULL, -- Saldo a diferir
  installments INTEGER NOT NULL CHECK (installments BETWEEN 1 AND 60),
  installment_amount NUMERIC(12,2) NOT NULL,

  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Estado
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'completado', 'incumplido', 'cancelado')),

  -- Configuración especial
  freeze_late_fees BOOLEAN DEFAULT true, -- No generar mora mientras esté activo

  -- Auditoría
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT
);

-- Tabla de cargos incluidos en el convenio
CREATE TABLE IF NOT EXISTS public.payment_agreement_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_agreement_id UUID NOT NULL REFERENCES public.payment_agreements(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES public.charges(id),
  original_balance NUMERIC(12,2) NOT NULL, -- Saldo al momento de incluir

  UNIQUE(payment_agreement_id, charge_id)
);

-- Tabla de cuotas generadas por el convenio
CREATE TABLE IF NOT EXISTS public.payment_agreement_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_agreement_id UUID NOT NULL REFERENCES public.payment_agreements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  charge_id UUID REFERENCES public.charges(id), -- Cargo generado para esta cuota
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado', 'vencido')),

  UNIQUE(payment_agreement_id, installment_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_agreements_condo
  ON public.payment_agreements(condominium_id);

CREATE INDEX IF NOT EXISTS idx_payment_agreements_unit
  ON public.payment_agreements(unit_id);

CREATE INDEX IF NOT EXISTS idx_payment_agreements_status
  ON public.payment_agreements(status);

CREATE INDEX IF NOT EXISTS idx_payment_agreement_charges_agreement
  ON public.payment_agreement_charges(payment_agreement_id);

CREATE INDEX IF NOT EXISTS idx_payment_agreement_installments_agreement
  ON public.payment_agreement_installments(payment_agreement_id);

-- RLS
ALTER TABLE public.payment_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_agreement_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_agreement_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_agreements_select" ON public.payment_agreements;
CREATE POLICY "payment_agreements_select" ON public.payment_agreements
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payment_agreements_manage" ON public.payment_agreements;
CREATE POLICY "payment_agreements_manage" ON public.payment_agreements
  FOR ALL USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "payment_agreement_charges_access" ON public.payment_agreement_charges;
CREATE POLICY "payment_agreement_charges_access" ON public.payment_agreement_charges
  FOR ALL USING (
    payment_agreement_id IN (
      SELECT id FROM public.payment_agreements
      WHERE condominium_id IN (
        SELECT condominium_id FROM public.memberships
        WHERE profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "payment_agreement_installments_access" ON public.payment_agreement_installments;
CREATE POLICY "payment_agreement_installments_access" ON public.payment_agreement_installments
  FOR ALL USING (
    payment_agreement_id IN (
      SELECT id FROM public.payment_agreements
      WHERE condominium_id IN (
        SELECT condominium_id FROM public.memberships
        WHERE profile_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.payment_agreements IS 'Convenios de pago para refinanciar deuda existente';
COMMENT ON TABLE public.payment_agreement_charges IS 'Cargos originales incluidos en un convenio de pago';
COMMENT ON TABLE public.payment_agreement_installments IS 'Cuotas programadas de un convenio de pago';

-- ============================================================================
-- 5. TABLA: unit_credits (Sistema de saldos a favor - Ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.unit_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'credit_in',      -- Ingreso de crédito (pago excedente, ajuste positivo)
    'credit_out',     -- Uso de crédito (aplicado a cargo)
    'adjustment',     -- Ajuste manual
    'reversal'        -- Reversión
  )),

  -- Montos
  amount NUMERIC(12,2) NOT NULL, -- Positivo para credit_in, negativo para credit_out
  running_balance NUMERIC(12,2) NOT NULL, -- Saldo después del movimiento

  -- Referencias
  payment_id UUID REFERENCES public.payments(id),
  charge_id UUID REFERENCES public.charges(id),
  payment_allocation_id UUID, -- Referencia a la allocación específica

  -- Descripción y auditoría
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Columna de saldo cache en units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_unit_credits_condo
  ON public.unit_credits(condominium_id);

CREATE INDEX IF NOT EXISTS idx_unit_credits_unit
  ON public.unit_credits(unit_id);

CREATE INDEX IF NOT EXISTS idx_unit_credits_type
  ON public.unit_credits(movement_type);

CREATE INDEX IF NOT EXISTS idx_unit_credits_payment
  ON public.unit_credits(payment_id) WHERE payment_id IS NOT NULL;

-- RLS
ALTER TABLE public.unit_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unit_credits_select" ON public.unit_credits;
CREATE POLICY "unit_credits_select" ON public.unit_credits
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "unit_credits_manage" ON public.unit_credits;
CREATE POLICY "unit_credits_manage" ON public.unit_credits
  FOR ALL USING (
    condominium_id IN (
      SELECT condominium_id FROM public.memberships
      WHERE profile_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Trigger para mantener el running_balance y actualizar units.credit_balance
CREATE OR REPLACE FUNCTION update_unit_credit_balance()
RETURNS TRIGGER AS $$
DECLARE
  prev_balance NUMERIC(12,2);
BEGIN
  -- Obtener el último saldo de esta unidad
  SELECT COALESCE(
    (SELECT running_balance
     FROM public.unit_credits
     WHERE unit_id = NEW.unit_id
     ORDER BY created_at DESC, id DESC
     LIMIT 1),
    0
  ) INTO prev_balance;

  -- Calcular nuevo running_balance
  NEW.running_balance := prev_balance + NEW.amount;

  -- Actualizar cache en units
  UPDATE public.units
  SET credit_balance = NEW.running_balance
  WHERE id = NEW.unit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unit_credit_balance ON public.unit_credits;
CREATE TRIGGER trg_unit_credit_balance
  BEFORE INSERT ON public.unit_credits
  FOR EACH ROW EXECUTE FUNCTION update_unit_credit_balance();

COMMENT ON TABLE public.unit_credits IS 'Ledger de saldos a favor por unidad';
COMMENT ON COLUMN public.unit_credits.running_balance IS 'Saldo acumulado después del movimiento';
COMMENT ON COLUMN public.units.credit_balance IS 'Cache del saldo a favor actual (calculado por trigger)';

-- ============================================================================
-- 6. MEJORAS A AUDITORÍA
-- Asegurar que audit_logs tenga las columnas necesarias
-- ============================================================================
DO $$
BEGIN
  -- Agregar columnas faltantes a audit_logs si existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.profiles(id);

    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS ip_address TEXT;

    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS user_agent TEXT;
  END IF;
END $$;

-- ============================================================================
-- 7. FUNCIONES RPC PARA EL MOTOR DE FACTURACIÓN
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
  v_unit_balance NUMERIC(12,2);
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

  -- 3. Verificar que todos los cargos sean elegibles y estén dentro del plazo
  IF v_all_eligible THEN
    SELECT
      bool_and(
        early_payment_eligible = true
        AND early_payment_deadline >= CURRENT_DATE
        AND balance = total_amount -- Debe pagar 100%
      ),
      COALESCE(SUM(early_payment_amount), 0)
    INTO v_all_eligible, v_total_discount
    FROM public.charges
    WHERE id = ANY(p_charge_ids);

    IF NOT v_all_eligible THEN
      v_reason := 'Uno o más cargos no son elegibles o están fuera de plazo';
    END IF;
  END IF;

  RETURN QUERY SELECT v_all_eligible, v_reason, v_total_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Aplicar pronto pago a un pago
CREATE OR REPLACE FUNCTION apply_early_payment_discount(
  p_payment_id UUID,
  p_charge_ids UUID[]
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  total_discount NUMERIC(12,2)
) AS $$
DECLARE
  v_discount NUMERIC(12,2) := 0;
  v_charge RECORD;
BEGIN
  -- Verificar elegibilidad
  IF NOT (SELECT eligible FROM check_early_payment_eligibility(
    (SELECT unit_id FROM public.payments WHERE id = p_payment_id),
    p_charge_ids
  )) THEN
    RETURN QUERY SELECT false, 'No elegible para pronto pago', 0::NUMERIC(12,2);
    RETURN;
  END IF;

  -- Aplicar descuento a cada cargo
  FOR v_charge IN
    SELECT id, early_payment_amount
    FROM public.charges
    WHERE id = ANY(p_charge_ids)
  LOOP
    UPDATE public.charges
    SET
      early_payment_applied = true,
      early_payment_applied_at = now(),
      balance = balance - early_payment_amount,
      paid_amount = paid_amount + early_payment_amount
    WHERE id = v_charge.id;

    v_discount := v_discount + v_charge.early_payment_amount;
  END LOOP;

  RETURN QUERY SELECT true, 'Descuento aplicado correctamente', v_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Generar cargos de mora
CREATE OR REPLACE FUNCTION generate_late_fee_charges(
  p_condominium_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  charges_created INTEGER,
  total_late_fees NUMERIC(12,2)
) AS $$
DECLARE
  v_settings RECORD;
  v_charge RECORD;
  v_late_fee NUMERIC(12,2);
  v_count INTEGER := 0;
  v_total NUMERIC(12,2) := 0;
  v_expense_item_id UUID;
BEGIN
  -- Obtener configuración
  SELECT * INTO v_settings
  FROM public.condominium_billing_settings
  WHERE condominium_id = p_condominium_id;

  -- Si no hay configuración o mora no está habilitada, salir
  IF v_settings IS NULL OR NOT v_settings.late_fee_enabled THEN
    RETURN QUERY SELECT 0, 0::NUMERIC(12,2);
    RETURN;
  END IF;

  -- Buscar o crear rubro de intereses
  SELECT id INTO v_expense_item_id
  FROM public.expense_items
  WHERE condominium_id = p_condominium_id
    AND name ILIKE '%inter%'
    AND is_active = true
  LIMIT 1;

  IF v_expense_item_id IS NULL THEN
    INSERT INTO public.expense_items (condominium_id, name, category, classification, allocation_method, is_active)
    VALUES (p_condominium_id, 'Intereses por Mora', 'ingreso', 'extraordinario', 'por_unidad', true)
    RETURNING id INTO v_expense_item_id;
  END IF;

  -- Procesar cargos vencidos
  FOR v_charge IN
    SELECT c.*
    FROM public.charges c
    WHERE c.condominium_id = p_condominium_id
      AND c.status = 'pendiente'
      AND c.balance > 0.01
      AND c.late_fee_eligible = true
      AND c.due_date + v_settings.late_fee_grace_days < p_as_of_date
      AND c.charge_type != 'interest' -- No cobrar mora sobre mora
      -- Verificar que no tenga convenio activo que congele mora
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_agreement_charges pac
        JOIN public.payment_agreements pa ON pa.id = pac.payment_agreement_id
        WHERE pac.charge_id = c.id AND pa.status = 'activo' AND pa.freeze_late_fees = true
      )
      -- Verificar que no se haya generado mora este mes para este cargo
      AND NOT EXISTS (
        SELECT 1 FROM public.charges ic
        WHERE ic.parent_charge_id = c.id
          AND ic.charge_type = 'interest'
          AND date_trunc('month', ic.created_at) = date_trunc('month', p_as_of_date)
      )
  LOOP
    -- Calcular mora
    IF v_settings.late_fee_type = 'porcentaje' THEN
      IF v_settings.late_fee_apply_on = 'balance' THEN
        v_late_fee := v_charge.balance * (v_settings.late_fee_value / 100);
      ELSE
        v_late_fee := v_charge.total_amount * (v_settings.late_fee_value / 100);
      END IF;
    ELSE
      v_late_fee := v_settings.late_fee_value;
    END IF;

    -- Aplicar tope si existe
    IF v_settings.late_fee_max_rate IS NOT NULL THEN
      v_late_fee := LEAST(v_late_fee, v_charge.total_amount * (v_settings.late_fee_max_rate / 100));
    END IF;

    -- Crear cargo de interés
    INSERT INTO public.charges (
      condominium_id,
      unit_id,
      expense_item_id,
      charge_type,
      posted_date,
      due_date,
      total_amount,
      balance,
      status,
      description,
      parent_charge_id,
      late_fee_eligible
    ) VALUES (
      p_condominium_id,
      v_charge.unit_id,
      v_expense_item_id,
      'interest',
      p_as_of_date,
      p_as_of_date + 15, -- Vence en 15 días
      v_late_fee,
      v_late_fee,
      'pendiente',
      'Interés por mora - ' || v_charge.description,
      v_charge.id,
      false -- Los intereses no generan más intereses
    );

    v_count := v_count + 1;
    v_total := v_total + v_late_fee;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
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

-- Función: Registrar crédito/saldo a favor
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
    running_balance, -- Se calcula en el trigger
    payment_id,
    charge_id,
    description,
    created_by
  ) VALUES (
    p_condominium_id,
    p_unit_id,
    p_movement_type,
    CASE WHEN p_movement_type IN ('credit_out', 'reversal') THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    0, -- Placeholder, se actualiza en trigger
    p_payment_id,
    p_charge_id,
    p_description,
    p_created_by
  )
  RETURNING id INTO v_credit_id;

  RETURN v_credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. VISTAS ÚTILES
-- ============================================================================

-- Vista: Estado de cuenta por unidad con detalles de mora y pronto pago
CREATE OR REPLACE VIEW public.v_unit_account_summary AS
SELECT
  u.id AS unit_id,
  u.condominium_id,
  u.identifier,
  u.full_identifier,
  u.credit_balance,
  COALESCE(SUM(c.balance) FILTER (WHERE c.status = 'pendiente'), 0) AS total_pending,
  COALESCE(SUM(c.balance) FILTER (WHERE c.status = 'pendiente' AND c.charge_type = 'interest'), 0) AS total_interest,
  COALESCE(SUM(c.balance) FILTER (WHERE c.status = 'pendiente' AND c.due_date < CURRENT_DATE), 0) AS total_overdue,
  COALESCE(SUM(c.early_payment_amount) FILTER (WHERE c.early_payment_eligible AND c.early_payment_deadline >= CURRENT_DATE), 0) AS potential_early_discount,
  (u.credit_balance - COALESCE(SUM(c.balance) FILTER (WHERE c.status = 'pendiente'), 0)) AS net_balance,
  EXISTS (
    SELECT 1 FROM public.payment_agreements pa
    WHERE pa.unit_id = u.id AND pa.status = 'activo'
  ) AS has_active_agreement
FROM public.units u
LEFT JOIN public.charges c ON c.unit_id = u.id AND c.status = 'pendiente'
GROUP BY u.id, u.condominium_id, u.identifier, u.full_identifier, u.credit_balance;

COMMENT ON VIEW public.v_unit_account_summary IS 'Resumen de cuenta por unidad incluyendo mora, pronto pago y convenios';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- ============================================================================
-- PASO 5: SISTEMA DE CRÉDITOS (SALDOS A FAVOR)
-- ============================================================================

-- Primero agregar columna credit_balance a units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) DEFAULT 0;

-- Crear tabla de movimientos de crédito
CREATE TABLE IF NOT EXISTS public.unit_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'credit_in',
    'credit_out',
    'adjustment',
    'reversal'
  )),

  amount NUMERIC(12,2) NOT NULL,
  running_balance NUMERIC(12,2) NOT NULL,

  payment_id UUID REFERENCES public.payments(id),
  charge_id UUID REFERENCES public.charges(id),
  payment_allocation_id UUID,

  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

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

-- Trigger para calcular running_balance y actualizar units.credit_balance
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

-- ============================================================================
-- PASO 2: COLUMNAS ADICIONALES EN CHARGES
-- ============================================================================

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

-- Columnas para cuotas diferidas
ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS extraordinary_plan_id UUID;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS installment_number INTEGER;

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS total_installments INTEGER;

-- Índices
CREATE INDEX IF NOT EXISTS idx_charges_parent
  ON public.charges(parent_charge_id) WHERE parent_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_charges_extraordinary_plan
  ON public.charges(extraordinary_plan_id) WHERE extraordinary_plan_id IS NOT NULL;

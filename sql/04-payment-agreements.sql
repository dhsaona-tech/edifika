-- ============================================================================
-- PASO 4: CONVENIOS DE PAGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

  original_debt_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  down_payment NUMERIC(12,2) DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL,
  installments INTEGER NOT NULL CHECK (installments BETWEEN 1 AND 60),
  installment_amount NUMERIC(12,2) NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'completado', 'incumplido', 'cancelado')),

  freeze_late_fees BOOLEAN DEFAULT true,

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

CREATE TABLE IF NOT EXISTS public.payment_agreement_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_agreement_id UUID NOT NULL REFERENCES public.payment_agreements(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES public.charges(id),
  original_balance NUMERIC(12,2) NOT NULL,

  UNIQUE(payment_agreement_id, charge_id)
);

CREATE TABLE IF NOT EXISTS public.payment_agreement_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_agreement_id UUID NOT NULL REFERENCES public.payment_agreements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  charge_id UUID REFERENCES public.charges(id),
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

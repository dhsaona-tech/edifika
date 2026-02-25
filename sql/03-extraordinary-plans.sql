-- ============================================================================
-- PASO 3: PLANES EXTRAORDINARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.extraordinary_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  expense_item_id UUID NOT NULL REFERENCES public.expense_items(id),

  distribution_method TEXT NOT NULL CHECK (distribution_method IN ('por_aliquota', 'igualitario', 'manual')),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),

  total_installments INTEGER NOT NULL CHECK (total_installments BETWEEN 1 AND 60),
  start_period DATE NOT NULL,

  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'activo', 'completado', 'cancelado')),

  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT
);

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

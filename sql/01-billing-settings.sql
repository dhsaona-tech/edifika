-- ============================================================================
-- PASO 1: CONFIGURACIÓN DE FACTURACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.condominium_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL UNIQUE REFERENCES public.condominiums(id) ON DELETE CASCADE,

  -- Configuración de Pronto Pago
  early_payment_enabled BOOLEAN DEFAULT false,
  early_payment_type TEXT CHECK (early_payment_type IN ('porcentaje', 'monto_fijo')),
  early_payment_value NUMERIC(12,2) DEFAULT 0,
  early_payment_cutoff_day INTEGER CHECK (early_payment_cutoff_day BETWEEN 1 AND 28),

  -- Configuración de Mora/Interés
  late_fee_enabled BOOLEAN DEFAULT false,
  late_fee_type TEXT CHECK (late_fee_type IN ('porcentaje', 'monto_fijo')),
  late_fee_value NUMERIC(12,2) DEFAULT 0,
  late_fee_grace_days INTEGER DEFAULT 0,
  late_fee_apply_on TEXT DEFAULT 'balance' CHECK (late_fee_apply_on IN ('balance', 'total')),
  late_fee_max_rate NUMERIC(5,2) DEFAULT NULL,
  late_fee_compound BOOLEAN DEFAULT false,

  -- Configuración general
  default_due_day INTEGER DEFAULT 15 CHECK (default_due_day BETWEEN 1 AND 28),
  auto_generate_charges BOOLEAN DEFAULT false,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_billing_settings_condo
  ON public.condominium_billing_settings(condominium_id);

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

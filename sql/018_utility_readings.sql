-- ============================================================
-- TABLA: utility_bills
-- ============================================================
CREATE TABLE public.utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  expense_item_id UUID NOT NULL REFERENCES public.expense_items(id),
  mode TEXT NOT NULL CHECK (mode IN ('meter_based', 'allocation')),
  unit_of_measure TEXT,
  total_matrix_consumption NUMERIC(14,4),
  average_unit_cost NUMERIC(14,6),
  communal_consumption NUMERIC(14,4),
  allocation_method TEXT CHECK (allocation_method IN ('por_aliquota', 'igualitario')),
  period TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'closed', 'billed')),
  invoice_number TEXT,
  invoice_date DATE,
  line_items JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- ============================================================
-- TABLA: utility_readings
-- ============================================================
CREATE TABLE public.utility_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_bill_id UUID NOT NULL REFERENCES public.utility_bills(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id),
  previous_reading NUMERIC(14,4) NOT NULL DEFAULT 0,
  current_reading NUMERIC(14,4) NOT NULL DEFAULT 0,
  consumption NUMERIC(14,4) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  calculated_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  charge_id UUID REFERENCES public.charges(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(utility_bill_id, unit_id)
);

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX idx_utility_bills_condo_period ON public.utility_bills(condominium_id, period);
CREATE INDEX idx_utility_bills_condo_rubro_status ON public.utility_bills(condominium_id, expense_item_id, status);
CREATE INDEX idx_utility_readings_bill ON public.utility_readings(utility_bill_id);
CREATE INDEX idx_utility_readings_unit ON public.utility_readings(unit_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_utility_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utility_bills_updated_at
  BEFORE UPDATE ON public.utility_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_utility_bills_updated_at();

CREATE OR REPLACE FUNCTION public.update_utility_readings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utility_readings_updated_at
  BEFORE UPDATE ON public.utility_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_utility_readings_updated_at();

-- ============================================================
-- RLS (patron memberships, igual que fase-0-limpiar-seguridad)
-- ============================================================
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utility_bills_select" ON public.utility_bills
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m WHERE m.profile_id = auth.uid() AND m.condominium_id = utility_bills.condominium_id AND m.status = 'activo')
  );

CREATE POLICY "utility_bills_insert" ON public.utility_bills
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m WHERE m.profile_id = auth.uid() AND m.condominium_id = condominium_id AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

CREATE POLICY "utility_bills_update" ON public.utility_bills
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m WHERE m.profile_id = auth.uid() AND m.condominium_id = utility_bills.condominium_id AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

CREATE POLICY "utility_bills_delete" ON public.utility_bills
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM memberships m WHERE m.profile_id = auth.uid() AND m.condominium_id = utility_bills.condominium_id AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

ALTER TABLE public.utility_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utility_readings_select" ON public.utility_readings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.utility_bills ub JOIN memberships m ON m.condominium_id = ub.condominium_id WHERE ub.id = utility_readings.utility_bill_id AND m.profile_id = auth.uid() AND m.status = 'activo')
  );

CREATE POLICY "utility_readings_insert" ON public.utility_readings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.utility_bills ub JOIN memberships m ON m.condominium_id = ub.condominium_id WHERE ub.id = utility_readings.utility_bill_id AND m.profile_id = auth.uid() AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

CREATE POLICY "utility_readings_update" ON public.utility_readings
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.utility_bills ub JOIN memberships m ON m.condominium_id = ub.condominium_id WHERE ub.id = utility_readings.utility_bill_id AND m.profile_id = auth.uid() AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

CREATE POLICY "utility_readings_delete" ON public.utility_readings
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.utility_bills ub JOIN memberships m ON m.condominium_id = ub.condominium_id WHERE ub.id = utility_readings.utility_bill_id AND m.profile_id = auth.uid() AND m.role IN ('ADMIN', 'SUPER_ADMIN') AND m.status = 'activo')
  );

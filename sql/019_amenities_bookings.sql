-- =====================================================
-- 019: Amenities & Bookings (Áreas Comunales y Reservas)
-- =====================================================
-- Motor de configuración de áreas comunales con reglas
-- de aprobación, financieras y de bloqueo por morosidad.
-- Las reservas generan cargos (charges) y las garantías
-- se resuelven contra unit_credits o egresses.
-- =====================================================

-- ==========================================
-- 1. TABLA: amenities
-- ==========================================
CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  max_capacity INTEGER NOT NULL DEFAULT 1,

  -- Reglas de aprobación y cancelación
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  cancelation_cutoff_hours INTEGER NOT NULL DEFAULT 24,

  -- Reglas financieras
  is_rentable BOOLEAN NOT NULL DEFAULT false,
  rental_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  requires_guarantee BOOLEAN NOT NULL DEFAULT false,
  guarantee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_item_id UUID REFERENCES expense_items(id) ON DELETE SET NULL,

  -- Reglas de cartera (bloqueos)
  allow_debtors BOOLEAN NOT NULL DEFAULT true,
  debt_grace_day INTEGER NOT NULL DEFAULT 10,

  -- Meta
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_amenities_condominium
  ON amenities(condominium_id);
CREATE INDEX IF NOT EXISTS idx_amenities_condominium_active
  ON amenities(condominium_id, is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_amenities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_amenities_updated_at
  BEFORE UPDATE ON amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_amenities_updated_at();

-- ==========================================
-- 2. TABLA: bookings
-- ==========================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'confirmed', 'canceled', 'completed')),

  -- Vínculos financieros
  rental_charge_id UUID REFERENCES charges(id) ON DELETE SET NULL,
  guarantee_charge_id UUID REFERENCES charges(id) ON DELETE SET NULL,
  guarantee_status TEXT CHECK (
    guarantee_status IS NULL
    OR guarantee_status IN ('held', 'applied_to_balance', 'refunded_externally')
  ),

  -- Trazabilidad
  notes TEXT,
  canceled_at TIMESTAMPTZ,
  canceled_by UUID,
  cancellation_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,

  -- Validaciones
  CONSTRAINT chk_booking_time_range CHECK (end_time > start_time)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bookings_condominium_amenity_time
  ON bookings(condominium_id, amenity_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_unit
  ON bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(condominium_id, status);

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- amenities: SELECT para miembros del condominio
CREATE POLICY amenities_select ON amenities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = amenities.condominium_id
        AND m.profile_id = auth.uid()
        AND m.status = 'activo'
    )
  );

-- amenities: INSERT/UPDATE/DELETE para admins
CREATE POLICY amenities_insert ON amenities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = amenities.condominium_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('SUPER_ADMIN', 'ADMIN')
        AND m.status = 'activo'
    )
  );

CREATE POLICY amenities_update ON amenities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = amenities.condominium_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('SUPER_ADMIN', 'ADMIN')
        AND m.status = 'activo'
    )
  );

CREATE POLICY amenities_delete ON amenities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = amenities.condominium_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('SUPER_ADMIN', 'ADMIN')
        AND m.status = 'activo'
    )
  );

-- bookings: SELECT para miembros del condominio
CREATE POLICY bookings_select ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = bookings.condominium_id
        AND m.profile_id = auth.uid()
        AND m.status = 'activo'
    )
  );

-- bookings: INSERT para miembros del condominio
CREATE POLICY bookings_insert ON bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = bookings.condominium_id
        AND m.profile_id = auth.uid()
        AND m.status = 'activo'
    )
  );

-- bookings: UPDATE para admins
CREATE POLICY bookings_update ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.condominium_id = bookings.condominium_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('SUPER_ADMIN', 'ADMIN')
        AND m.status = 'activo'
    )
  );

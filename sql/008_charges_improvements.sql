-- ============================================================================
-- MEJORAS AL MÓDULO DE CARGOS (CHARGES)
-- ============================================================================

-- 1. Agregar columnas a charge_batches para mejor gestión de lotes
ALTER TABLE public.charge_batches
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS charges_count INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- Índice para filtrar lotes activos
CREATE INDEX IF NOT EXISTS idx_charge_batches_status
  ON public.charge_batches(condominium_id, status);

-- 2. Comentario sobre el estado 'parcialmente_pagado'
-- El estado se maneja en la columna 'status' de charges
-- Los valores válidos son: 'pendiente', 'parcialmente_pagado', 'pagado', 'cancelado', 'eliminado'
-- No se requiere ALTER porque ya es TEXT

-- 3. Trigger para actualizar totales del batch al crear/eliminar cargos
CREATE OR REPLACE FUNCTION update_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.charge_batches
    SET
      total_amount = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM public.charges
        WHERE batch_id = NEW.batch_id AND status NOT IN ('eliminado', 'cancelado')
      ),
      charges_count = (
        SELECT COUNT(*)
        FROM public.charges
        WHERE batch_id = NEW.batch_id AND status NOT IN ('eliminado', 'cancelado')
      )
    WHERE id = NEW.batch_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.charge_batches
    SET
      total_amount = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM public.charges
        WHERE batch_id = OLD.batch_id AND status NOT IN ('eliminado', 'cancelado')
      ),
      charges_count = (
        SELECT COUNT(*)
        FROM public.charges
        WHERE batch_id = OLD.batch_id AND status NOT IN ('eliminado', 'cancelado')
      )
    WHERE id = OLD.batch_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT y UPDATE (usa NEW)
DROP TRIGGER IF EXISTS trg_update_batch_totals_insert_update ON public.charges;
CREATE TRIGGER trg_update_batch_totals_insert_update
  AFTER INSERT OR UPDATE ON public.charges
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_totals();

-- Trigger para DELETE (usa OLD)
DROP TRIGGER IF EXISTS trg_update_batch_totals_delete ON public.charges;
CREATE TRIGGER trg_update_batch_totals_delete
  AFTER DELETE ON public.charges
  FOR EACH ROW
  WHEN (OLD.batch_id IS NOT NULL)
  EXECUTE FUNCTION update_batch_totals();

-- Limpiar trigger viejo si existe
DROP TRIGGER IF EXISTS trg_update_batch_totals ON public.charges;

-- 4. Trigger para actualizar estado de cargo según pagos
CREATE OR REPLACE FUNCTION update_charge_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_paid NUMERIC;
BEGIN
  -- Obtener totales actuales del cargo
  SELECT total_amount, paid_amount INTO v_total, v_paid
  FROM public.charges
  WHERE id = COALESCE(NEW.charge_id, OLD.charge_id);

  -- Actualizar estado según el balance
  IF v_paid IS NOT NULL AND v_total IS NOT NULL THEN
    UPDATE public.charges
    SET status = CASE
      WHEN v_paid >= v_total - 0.01 THEN 'pagado'
      WHEN v_paid > 0.01 THEN 'parcialmente_pagado'
      ELSE 'pendiente'
    END
    WHERE id = COALESCE(NEW.charge_id, OLD.charge_id)
      AND status NOT IN ('cancelado', 'eliminado');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Nota: Este trigger se ejecuta desde payment_allocations
-- Si ya existe un trigger similar, este lo complementa

-- 5. RLS para charge_batches (si no existe)
DROP POLICY IF EXISTS "charge_batches_select_policy" ON public.charge_batches;
CREATE POLICY "charge_batches_select_policy" ON public.charge_batches
  FOR SELECT USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "charge_batches_insert_policy" ON public.charge_batches;
CREATE POLICY "charge_batches_insert_policy" ON public.charge_batches
  FOR INSERT WITH CHECK (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "charge_batches_update_policy" ON public.charge_batches;
CREATE POLICY "charge_batches_update_policy" ON public.charge_batches
  FOR UPDATE USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "charge_batches_delete_policy" ON public.charge_batches;
CREATE POLICY "charge_batches_delete_policy" ON public.charge_batches
  FOR DELETE USING (
    condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Habilitar RLS si no está habilitado
ALTER TABLE public.charge_batches ENABLE ROW LEVEL SECURITY;

-- 6. Actualizar totales de batches existentes
UPDATE public.charge_batches cb
SET
  total_amount = sub.total,
  charges_count = sub.cnt,
  status = COALESCE(cb.status, 'activo')
FROM (
  SELECT
    batch_id,
    COALESCE(SUM(total_amount), 0) as total,
    COUNT(*) as cnt
  FROM public.charges
  WHERE batch_id IS NOT NULL AND status NOT IN ('eliminado', 'cancelado')
  GROUP BY batch_id
) sub
WHERE cb.id = sub.batch_id;

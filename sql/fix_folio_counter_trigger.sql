-- =====================================================
-- FIX: Trigger para asignar folio_rec Y actualizar folio_counters
-- =====================================================

-- Este trigger se ejecuta ANTES de INSERT en payments
-- 1. Obtiene el siguiente folio de folio_counters
-- 2. Asigna el folio al nuevo payment
-- 3. Actualiza folio_counters para el próximo

CREATE OR REPLACE FUNCTION assign_folio_rec()
RETURNS TRIGGER AS $$
DECLARE
  next_folio INTEGER;
BEGIN
  -- Si ya tiene folio, no hacer nada
  IF NEW.folio_rec IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener o crear el contador para este condominio
  INSERT INTO folio_counters (condominium_id, current_folio_rec, current_folio_egr, current_folio_op)
  VALUES (NEW.condominium_id, 0, 0, 0)
  ON CONFLICT (condominium_id) DO NOTHING;

  -- Incrementar y obtener el siguiente folio atómicamente
  UPDATE folio_counters
  SET current_folio_rec = current_folio_rec + 1
  WHERE condominium_id = NEW.condominium_id
  RETURNING current_folio_rec INTO next_folio;

  -- Asignar el folio al nuevo payment
  NEW.folio_rec := next_folio;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurarse que el trigger existe
DROP TRIGGER IF EXISTS trg_assign_folio_rec ON payments;
CREATE TRIGGER trg_assign_folio_rec
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION assign_folio_rec();

-- =====================================================
-- SINCRONIZAR CONTADORES EXISTENTES
-- (Ejecutar solo una vez después de crear el trigger)
-- =====================================================

-- Sincronizar current_folio_rec con el máximo existente en payments
UPDATE folio_counters fc
SET current_folio_rec = COALESCE(
  (SELECT MAX(folio_rec) FROM payments WHERE condominium_id = fc.condominium_id AND status != 'cancelado'),
  0
);

-- Para condominios que tienen pagos pero no tienen registro en folio_counters
INSERT INTO folio_counters (condominium_id, current_folio_rec, current_folio_egr, current_folio_op)
SELECT
  p.condominium_id,
  MAX(p.folio_rec),
  0,
  0
FROM payments p
WHERE NOT EXISTS (SELECT 1 FROM folio_counters fc WHERE fc.condominium_id = p.condominium_id)
GROUP BY p.condominium_id
ON CONFLICT (condominium_id) DO UPDATE
SET current_folio_rec = EXCLUDED.current_folio_rec;

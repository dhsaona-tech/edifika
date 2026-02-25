-- =============================================
-- Migración: Agregar document_type a payable_orders
-- Fecha: 2025-02-20
-- Descripción: Agrega el campo document_type para especificar
--              el tipo de documento (factura, nota de venta, recibo, etc.)
-- =============================================

-- Agregar columna document_type
ALTER TABLE payable_orders
ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'factura';

-- Actualizar registros existentes que tengan NULL
UPDATE payable_orders
SET document_type = 'factura'
WHERE document_type IS NULL;

-- Agregar constraint para validar los valores permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payable_orders_document_type_check'
    ) THEN
        ALTER TABLE payable_orders
        ADD CONSTRAINT payable_orders_document_type_check
        CHECK (document_type IN ('factura', 'nota_de_venta', 'recibo', 'liquidacion', 'otro'));
    END IF;
END $$;

-- Comentario en la columna
COMMENT ON COLUMN payable_orders.document_type IS 'Tipo de documento: factura, nota_de_venta, recibo, liquidacion, otro';

-- =============================================
-- Nota: Esta migración también ajusta el flujo de estados.
-- Antes: pendiente_aprobacion -> aprobada -> pagado
-- Ahora: pendiente -> pagado (simplificado)
--
-- Los registros con status 'pendiente_aprobacion' o 'aprobada'
-- se actualizan a 'pendiente' para unificar el flujo.
-- =============================================

UPDATE payable_orders
SET status = 'pendiente'
WHERE status IN ('pendiente_aprobacion', 'aprobada');

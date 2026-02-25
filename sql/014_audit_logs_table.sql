-- =============================================
-- Tabla: audit_logs (Registros de Auditoría Unificados)
-- Fecha: 2025-02-20
-- Descripción: Almacena todas las acciones importantes del sistema para auditoría
-- =============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,  -- payments, egresses, charges, payable_orders, etc.
  record_id UUID NOT NULL,   -- ID del registro afectado

  -- Acción
  action TEXT NOT NULL,      -- CREATE, UPDATE, DELETE, ANULACION, CONCILIACION, etc.

  -- Datos del cambio
  old_values JSONB,          -- Valores anteriores (para UPDATE/DELETE)
  new_values JSONB,          -- Valores nuevos (para CREATE/UPDATE)

  -- Quién y cuándo
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadatos adicionales
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_condominium ON audit_logs(condominium_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios del condominio pueden ver sus logs
CREATE POLICY IF NOT EXISTS "Users can view their condominium audit logs"
  ON audit_logs FOR SELECT
  USING (
    condominium_id IN (
      SELECT condominium_id FROM memberships WHERE profile_id = auth.uid()
    )
  );

-- Solo el sistema puede insertar (SECURITY DEFINER en funciones)
CREATE POLICY IF NOT EXISTS "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro de auditoría unificado para todas las acciones del sistema';
COMMENT ON COLUMN audit_logs.table_name IS 'Nombre de la tabla afectada (payments, egresses, charges, etc.)';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: CREATE, UPDATE, DELETE, ANULACION, CONCILIACION, APROBACION, etc.';
COMMENT ON COLUMN audit_logs.old_values IS 'Valores antes del cambio en formato JSON';
COMMENT ON COLUMN audit_logs.new_values IS 'Valores después del cambio en formato JSON';

-- =============================================
-- Vista: audit_logs_with_details
-- Para mostrar logs con información enriquecida
-- =============================================

CREATE OR REPLACE VIEW audit_logs_with_details AS
SELECT
  al.*,
  p.full_name as performed_by_name,
  c.name as condominium_name,
  CASE
    WHEN al.action = 'ANULACION' THEN 'Anulación'
    WHEN al.action = 'CREATE' THEN 'Creación'
    WHEN al.action = 'UPDATE' THEN 'Modificación'
    WHEN al.action = 'DELETE' THEN 'Eliminación'
    WHEN al.action = 'CONCILIACION' THEN 'Conciliación'
    WHEN al.action = 'APROBACION' THEN 'Aprobación'
    ELSE al.action
  END as action_label,
  CASE
    WHEN al.table_name = 'payments' THEN 'Ingreso (REC)'
    WHEN al.table_name = 'egresses' THEN 'Egreso (EG)'
    WHEN al.table_name = 'charges' THEN 'Cargo'
    WHEN al.table_name = 'payable_orders' THEN 'Cuenta por Pagar'
    WHEN al.table_name = 'reconciliations' THEN 'Conciliación'
    WHEN al.table_name = 'payment_agreements' THEN 'Convenio de Pago'
    ELSE al.table_name
  END as table_label
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.performed_by
LEFT JOIN condominiums c ON c.id = al.condominium_id;

COMMENT ON VIEW audit_logs_with_details IS 'Vista de auditoría con nombres de usuarios y labels legibles';

-- =============================================
-- Función helper para registrar logs fácilmente
-- =============================================

CREATE OR REPLACE FUNCTION log_audit(
  p_condominium_id UUID,
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    condominium_id,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    performed_by,
    performed_at,
    notes
  ) VALUES (
    p_condominium_id,
    p_table_name,
    p_record_id,
    p_action,
    p_old_values,
    p_new_values,
    COALESCE(p_performed_by, auth.uid()),
    NOW(),
    p_notes
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit IS 'Función helper para registrar eventos en el log de auditoría';

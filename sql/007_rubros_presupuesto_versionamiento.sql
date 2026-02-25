-- ============================================================================
-- MIGRACIÓN: Rubros y Presupuesto - Versionamiento y Sincronización
-- ============================================================================
-- Esta migración añade los campos necesarios para:
-- 1. Control de origen de rubros (presupuesto, manual, proyecto)
-- 2. Archivado de rubros de presupuestos anteriores
-- 3. Versionamiento de presupuestos
-- ============================================================================

-- PARTE 1: Nuevos campos en expense_items
-- ============================================================================

-- Campo source: indica de dónde viene el rubro
ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Campo source_budget_id: referencia al presupuesto que creó el rubro
ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS source_budget_id uuid;

-- Campo source_project_id: referencia al proyecto que creó el rubro
ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS source_project_id uuid;

-- Campo is_archived: para rubros de presupuestos anteriores
ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Campo archived_at: fecha de archivado
ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_expense_items_source ON public.expense_items(source);
CREATE INDEX IF NOT EXISTS idx_expense_items_source_budget ON public.expense_items(source_budget_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_source_project ON public.expense_items(source_project_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_archived ON public.expense_items(is_archived);


-- PARTE 2: Nuevos campos en budgets_master para versionamiento
-- ============================================================================

-- Número de versión del presupuesto
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Fecha desde la que aplica el presupuesto
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS effective_from date;

-- Fecha hasta la que aplicó el presupuesto (null si es el activo)
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS effective_to date;

-- Motivo del cambio (obligatorio si es modificación)
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS change_reason text;

-- Referencia a la versión anterior
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS previous_version_id uuid;

-- Usuario que hizo el cambio
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS modified_by uuid;

-- Fecha del cambio
ALTER TABLE public.budgets_master
ADD COLUMN IF NOT EXISTS modified_at timestamptz;

-- Índices para optimizar consultas de versionamiento
CREATE INDEX IF NOT EXISTS idx_budgets_master_version ON public.budgets_master(version);
CREATE INDEX IF NOT EXISTS idx_budgets_master_effective_dates ON public.budgets_master(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_budgets_master_previous ON public.budgets_master(previous_version_id);


-- PARTE 3: Tabla de historial de versiones (para auditoría completa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_master_id uuid NOT NULL,
  version integer NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  change_reason text,
  total_annual_amount numeric(15,2) NOT NULL,
  modified_by uuid,
  modified_at timestamptz NOT NULL DEFAULT now(),
  snapshot_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para el historial
CREATE INDEX IF NOT EXISTS idx_budget_version_history_master ON public.budget_version_history(budget_master_id);
CREATE INDEX IF NOT EXISTS idx_budget_version_history_version ON public.budget_version_history(budget_master_id, version);

-- RLS para budget_version_history
ALTER TABLE public.budget_version_history ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe y recrearla
DROP POLICY IF EXISTS "Users can view budget history of their condominiums" ON public.budget_version_history;

CREATE POLICY "Users can view budget history of their condominiums"
ON public.budget_version_history
FOR SELECT
USING (
  budget_master_id IN (
    SELECT bm.id FROM public.budgets_master bm
    WHERE bm.condominium_id IN (
      SELECT condominium_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);


-- PARTE 4: Actualizar datos existentes
-- ============================================================================

-- Marcar rubros existentes como 'manual' si no tienen source
UPDATE public.expense_items
SET source = 'manual'
WHERE source IS NULL;

-- Establecer effective_from para presupuestos existentes sin fecha
UPDATE public.budgets_master
SET effective_from = (year || '-01-01')::date
WHERE effective_from IS NULL;


-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

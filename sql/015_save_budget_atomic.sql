-- ============================================================================
-- RPC: save_budget_atomic
-- Guarda un presupuesto (master + líneas) de forma atómica en una transacción.
-- Si cualquier paso falla, se revierte todo automáticamente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_budget_atomic(
  p_condominium_id UUID,
  p_budget_id UUID DEFAULT NULL,             -- NULL = crear nuevo
  p_name TEXT DEFAULT 'Presupuesto',
  p_year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  p_budget_type TEXT DEFAULT 'global',        -- 'global' | 'detallado'
  p_distribution_method TEXT DEFAULT 'por_aliquota',
  p_status TEXT DEFAULT 'borrador',
  p_total_annual_amount NUMERIC DEFAULT 0,
  p_effective_from DATE DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL,
  p_rubros JSONB DEFAULT '[]'::JSONB         -- [{ "expense_item_id": uuid, "annual_amount": numeric }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_id UUID;
  v_rubro JSONB;
  v_monthly NUMERIC;
  v_mes INT;
BEGIN
  -- ========================================================================
  -- 1. UPSERT budgets_master
  -- ========================================================================
  IF p_budget_id IS NOT NULL THEN
    UPDATE public.budgets_master
    SET
      name = p_name,
      year = p_year,
      budget_type = p_budget_type,
      total_annual_amount = p_total_annual_amount,
      status = p_status,
      distribution_method = p_distribution_method,
      effective_from = COALESCE(p_effective_from, effective_from),
      change_reason = COALESCE(p_change_reason, change_reason),
      modified_at = NOW()
    WHERE id = p_budget_id
      AND condominium_id = p_condominium_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Presupuesto no encontrado o no pertenece al condominio'
        USING ERRCODE = 'P0002';
    END IF;

    v_budget_id := p_budget_id;
  ELSE
    INSERT INTO public.budgets_master (
      condominium_id, name, year, budget_type, total_annual_amount,
      status, distribution_method, effective_from, change_reason
    )
    VALUES (
      p_condominium_id, p_name, p_year, p_budget_type, p_total_annual_amount,
      p_status, p_distribution_method, p_effective_from, p_change_reason
    )
    RETURNING id INTO v_budget_id;
  END IF;

  -- ========================================================================
  -- 2. DELETE + INSERT líneas (solo para detallado)
  -- ========================================================================
  IF p_budget_type = 'detallado' THEN
    -- Borrar líneas anteriores de ESTE presupuesto solamente
    DELETE FROM public.budgets
    WHERE budgets_master_id = v_budget_id
      AND condominium_id = p_condominium_id;

    -- Insertar nuevas líneas: 12 meses por cada rubro
    FOR v_rubro IN SELECT * FROM jsonb_array_elements(p_rubros)
    LOOP
      v_monthly := (v_rubro->>'annual_amount')::NUMERIC / 12.0;

      FOR v_mes IN 1..12
      LOOP
        INSERT INTO public.budgets (
          condominium_id,
          expense_item_id,
          period,
          amount,
          budgets_master_id
        )
        VALUES (
          p_condominium_id,
          (v_rubro->>'expense_item_id')::UUID,
          (p_year || '-' || LPAD(v_mes::TEXT, 2, '0') || '-01')::DATE,
          v_monthly,
          v_budget_id
        );
      END LOOP;
    END LOOP;
  END IF;

  -- Si cambió a global, limpiar residuos de líneas detalladas
  IF p_budget_type = 'global' THEN
    DELETE FROM public.budgets
    WHERE budgets_master_id = v_budget_id
      AND condominium_id = p_condominium_id;
  END IF;

  -- ========================================================================
  -- 3. Retornar resultado
  -- ========================================================================
  RETURN jsonb_build_object(
    'success', TRUE,
    'budget_id', v_budget_id
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Ya existe otro presupuesto con líneas para el mismo año y rubros. Desactiva el anterior primero.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- Permisos: solo authenticated puede ejecutar
GRANT EXECUTE ON FUNCTION public.save_budget_atomic TO authenticated;

-- Comentario descriptivo
COMMENT ON FUNCTION public.save_budget_atomic IS
  'Guarda un presupuesto (master + líneas mensuales) de forma atómica. '
  'Si cualquier paso falla, se revierte todo. Pasar p_rubros como JSONB array.';

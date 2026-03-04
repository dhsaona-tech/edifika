-- ============================================================================
-- EDIFIKA — CORRECCIÓN CRÍTICA DE POLÍTICAS RLS
-- ============================================================================
-- FECHA: 2026-03-02
-- PROBLEMA: 26 políticas RLS tienen "m.condominium_id = m.condominium_id"
--           (siempre TRUE) en vez de comparar con la columna real de la tabla.
--           Esto rompe el aislamiento multi-tenant en INSERT/UPDATE/DELETE.
--
-- INSTRUCCIONES:
--   1. Hacer BACKUP antes de ejecutar (Settings > Database > Backups)
--   2. Ejecutar en Supabase SQL Editor en una sola transacción
--   3. Verificar con la query de validación al final
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: TABLAS CON condominium_id DIRECTO — Políticas INSERT
-- ============================================================================
-- Estas tablas tienen columna condominium_id propia.
-- El bug: WITH CHECK compara m.condominium_id = m.condominium_id (siempre true)
-- El fix:  WITH CHECK compara m.condominium_id = <tabla>.condominium_id

-- 1. units
DROP POLICY IF EXISTS "Members can insert units in their condominiums" ON units;
CREATE POLICY "Members can insert units in their condominiums" ON units
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = units.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 2. charges
DROP POLICY IF EXISTS "Admins can insert charges in their condominiums" ON charges;
CREATE POLICY "Admins can insert charges in their condominiums" ON charges
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = charges.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 3. payments
DROP POLICY IF EXISTS "Admins can insert payments in their condominiums" ON payments;
CREATE POLICY "Admins can insert payments in their condominiums" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = payments.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 4. egresses
DROP POLICY IF EXISTS "Admins can insert egresses in their condominiums" ON egresses;
CREATE POLICY "Admins can insert egresses in their condominiums" ON egresses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = egresses.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 5. payable_orders
DROP POLICY IF EXISTS "Admins can insert payable_orders in their condominiums" ON payable_orders;
CREATE POLICY "Admins can insert payable_orders in their condominiums" ON payable_orders
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = payable_orders.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 6. suppliers
DROP POLICY IF EXISTS "Admins can insert suppliers in their condominiums" ON suppliers;
CREATE POLICY "Admins can insert suppliers in their condominiums" ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = suppliers.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 7. expense_items
DROP POLICY IF EXISTS "Admins can insert expense_items in their condominiums" ON expense_items;
CREATE POLICY "Admins can insert expense_items in their condominiums" ON expense_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = expense_items.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 8. financial_accounts
DROP POLICY IF EXISTS "Admins can insert financial_accounts in their condominiums" ON financial_accounts;
CREATE POLICY "Admins can insert financial_accounts in their condominiums" ON financial_accounts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = financial_accounts.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 9. budgets_master
DROP POLICY IF EXISTS "Admins can insert budgets_master in their condominiums" ON budgets_master;
CREATE POLICY "Admins can insert budgets_master in their condominiums" ON budgets_master
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = budgets_master.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 10. bank_reconciliations
DROP POLICY IF EXISTS "Admins can insert bank_reconciliations" ON bank_reconciliations;
CREATE POLICY "Admins can insert bank_reconciliations" ON bank_reconciliations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = bank_reconciliations.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 11. folio_counters
DROP POLICY IF EXISTS "Admins can insert folio_counters" ON folio_counters;
CREATE POLICY "Admins can insert folio_counters" ON folio_counters
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = folio_counters.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 12. credit_debit_notes
DROP POLICY IF EXISTS "Admins can insert credit_debit_notes" ON credit_debit_notes;
CREATE POLICY "Admins can insert credit_debit_notes" ON credit_debit_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = credit_debit_notes.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 13. incentive_config
DROP POLICY IF EXISTS "Admins can insert incentive_config" ON incentive_config;
CREATE POLICY "Admins can insert incentive_config" ON incentive_config
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = incentive_config.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 14. utility_bills
DROP POLICY IF EXISTS "utility_bills_insert" ON utility_bills;
CREATE POLICY "utility_bills_insert" ON utility_bills
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = utility_bills.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 15. documents
DROP POLICY IF EXISTS "Admins can insert documents" ON documents;
CREATE POLICY "Admins can insert documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_superadmin = true
    ))
    OR
    (EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = documents.condominium_id
        AND m.role IN ('ADMIN','SUPER_ADMIN')
        AND m.status = 'activo'
    ))
  );


-- ============================================================================
-- PARTE 2: TABLAS CON condominium_id DIRECTO — Políticas FOR ALL
-- ============================================================================
-- Estas tienen USING correcto pero WITH CHECK con el bug.
-- Debemos DROP + recrear con ambos correctos.

-- 16. document_folders (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage folders" ON document_folders;
CREATE POLICY "Admins can manage folders" ON document_folders
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = document_folders.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = document_folders.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 17. communication_logs (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage communication_logs" ON communication_logs;
CREATE POLICY "Admins can manage communication_logs" ON communication_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = communication_logs.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = communication_logs.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 18. communication_templates (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage communication_templates" ON communication_templates;
CREATE POLICY "Admins can manage communication_templates" ON communication_templates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = communication_templates.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = communication_templates.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 19. reconciliations (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage reconciliations" ON reconciliations;
CREATE POLICY "Admins can manage reconciliations" ON reconciliations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = reconciliations.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = reconciliations.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 20. utility_services (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage utility_services" ON utility_services;
CREATE POLICY "Admins can manage utility_services" ON utility_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = utility_services.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = utility_services.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 21. projects (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = projects.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = projects.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 22. unidentified_deposits (FOR ALL — solo WITH CHECK tiene bug)
DROP POLICY IF EXISTS "Admins can manage unidentified_deposits" ON unidentified_deposits;
CREATE POLICY "Admins can manage unidentified_deposits" ON unidentified_deposits
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = unidentified_deposits.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = unidentified_deposits.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));


-- ============================================================================
-- PARTE 3: TABLAS CON BUGS EN USING Y WITH CHECK (ambos rotos)
-- ============================================================================

-- 23. charge_batches (FOR ALL — AMBOS tienen bug)
DROP POLICY IF EXISTS "Admins can manage charge_batches" ON charge_batches;
CREATE POLICY "Admins can manage charge_batches" ON charge_batches
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = charge_batches.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = charge_batches.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 24. budgets — INSERT (WITH CHECK bug)
DROP POLICY IF EXISTS "Admins can insert budgets in their condominiums" ON budgets;
CREATE POLICY "Admins can insert budgets in their condominiums" ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = budgets.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 25. budgets — UPDATE (QUAL bug)
DROP POLICY IF EXISTS "Admins can update budgets in their condominiums" ON budgets;
CREATE POLICY "Admins can update budgets in their condominiums" ON budgets
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = budgets.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- 26. budgets — DELETE (QUAL bug)
DROP POLICY IF EXISTS "Admins can delete budgets in their condominiums" ON budgets;
CREATE POLICY "Admins can delete budgets in their condominiums" ON budgets
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = budgets.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));


-- ============================================================================
-- PARTE 4: LIMPIAR extraordinary_plans (duplicados + roles incorrectos)
-- ============================================================================

-- Eliminar las 4 políticas problemáticas
DROP POLICY IF EXISTS "Users can manage extraordinary plans for their condominiums" ON extraordinary_plans;
DROP POLICY IF EXISTS "Users can manage extraordinary_plans for their condominiums" ON extraordinary_plans;
DROP POLICY IF EXISTS "extraordinary_plans_manage" ON extraordinary_plans;
DROP POLICY IF EXISTS "extraordinary_plans_select" ON extraordinary_plans;

-- Recrear correctamente: Admin puede gestionar
CREATE POLICY "extraordinary_plans_admin_manage" ON extraordinary_plans
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = extraordinary_plans.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.condominium_id = extraordinary_plans.condominium_id
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

-- Miembros pueden ver planes activos/cerrados de su condominio
CREATE POLICY "extraordinary_plans_member_select" ON extraordinary_plans
  FOR SELECT TO authenticated
  USING (
    extraordinary_plans.status IN ('active','closed')
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = extraordinary_plans.condominium_id
        AND m.status = 'activo'
    )
  );


-- ============================================================================
-- PARTE 5: TABLAS SIN RLS — Habilitar y proteger
-- ============================================================================

-- late_fee_history (existe en DB pero sin RLS)
ALTER TABLE late_fee_history ENABLE ROW LEVEL SECURITY;

-- Si late_fee_history tiene condominium_id directo:
-- (Si no lo tiene, usa un JOIN a charges)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'late_fee_history' AND column_name = 'condominium_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "late_fee_history_admin_manage" ON late_fee_history
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.profile_id = auth.uid()
            AND m.condominium_id = late_fee_history.condominium_id
            AND m.role IN (''ADMIN'',''SUPER_ADMIN'')
            AND m.status = ''activo''
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.profile_id = auth.uid()
            AND m.condominium_id = late_fee_history.condominium_id
            AND m.role IN (''ADMIN'',''SUPER_ADMIN'')
            AND m.status = ''activo''
        ));
    ';
  ELSE
    -- Si se vincula a charges via charge_id
    EXECUTE '
      CREATE POLICY "late_fee_history_admin_manage" ON late_fee_history
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM charges c
          JOIN memberships m ON m.condominium_id = c.condominium_id
          WHERE c.id = late_fee_history.charge_id
            AND m.profile_id = auth.uid()
            AND m.role IN (''ADMIN'',''SUPER_ADMIN'')
            AND m.status = ''activo''
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM charges c
          JOIN memberships m ON m.condominium_id = c.condominium_id
          WHERE c.id = late_fee_history.charge_id
            AND m.profile_id = auth.uid()
            AND m.role IN (''ADMIN'',''SUPER_ADMIN'')
            AND m.status = ''activo''
        ));
    ';
  END IF;
END $$;

-- project_quotations (sin RLS — vinculado a extraordinary_plans)
ALTER TABLE project_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_quotations_admin_manage" ON project_quotations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM extraordinary_plans ep
    JOIN memberships m ON m.condominium_id = ep.condominium_id
    WHERE ep.id = project_quotations.extraordinary_plan_id
      AND m.profile_id = auth.uid()
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM extraordinary_plans ep
    JOIN memberships m ON m.condominium_id = ep.condominium_id
    WHERE ep.id = project_quotations.extraordinary_plan_id
      AND m.profile_id = auth.uid()
      AND m.role IN ('ADMIN','SUPER_ADMIN')
      AND m.status = 'activo'
  ));

CREATE POLICY "project_quotations_member_select" ON project_quotations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM extraordinary_plans ep
    JOIN memberships m ON m.condominium_id = ep.condominium_id
    WHERE ep.id = project_quotations.extraordinary_plan_id
      AND m.profile_id = auth.uid()
      AND m.status = 'activo'
  ));


-- ============================================================================
-- PARTE 6: TRIGGERS ANTI-DELETE EN TABLAS FINANCIERAS
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_financial_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir si la operación viene del service_role (admin backend)
  -- En Supabase, current_setting('request.jwt.claim.role') = 'service_role'
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'No se permite eliminar registros financieros. Use anulación (status = cancelado/anulado).';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas financieras críticas
DROP TRIGGER IF EXISTS no_hard_delete_payments ON payments;
CREATE TRIGGER no_hard_delete_payments
  BEFORE DELETE ON payments FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();

DROP TRIGGER IF EXISTS no_hard_delete_egresses ON egresses;
CREATE TRIGGER no_hard_delete_egresses
  BEFORE DELETE ON egresses FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();

DROP TRIGGER IF EXISTS no_hard_delete_charges ON charges;
CREATE TRIGGER no_hard_delete_charges
  BEFORE DELETE ON charges FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();

DROP TRIGGER IF EXISTS no_hard_delete_payable_orders ON payable_orders;
CREATE TRIGGER no_hard_delete_payable_orders
  BEFORE DELETE ON payable_orders FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();

DROP TRIGGER IF EXISTS no_hard_delete_payment_allocations ON payment_allocations;
CREATE TRIGGER no_hard_delete_payment_allocations
  BEFORE DELETE ON payment_allocations FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();

DROP TRIGGER IF EXISTS no_hard_delete_egress_allocations ON egress_allocations;
CREATE TRIGGER no_hard_delete_egress_allocations
  BEFORE DELETE ON egress_allocations FOR EACH ROW
  EXECUTE FUNCTION prevent_financial_hard_delete();


COMMIT;


-- ============================================================================
-- PARTE 7: QUERY DE VALIDACIÓN (ejecutar después del fix)
-- ============================================================================
-- Esta query debe devolver 0 filas si todo se corrigió correctamente.

SELECT tablename, policyname, cmd,
  CASE
    WHEN qual LIKE '%m.condominium_id = m.condominium_id%' THEN 'USING (QUAL) TIENE BUG'
    ELSE 'USING OK'
  END as using_status,
  CASE
    WHEN with_check LIKE '%m.condominium_id = m.condominium_id%' THEN 'WITH_CHECK TIENE BUG'
    ELSE 'WITH_CHECK OK'
  END as with_check_status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%m.condominium_id = m.condominium_id%'
    OR with_check LIKE '%m.condominium_id = m.condominium_id%'
  )
ORDER BY tablename, policyname;

-- Si devuelve filas, hay políticas adicionales que necesitan corrección.
-- Contactar soporte técnico inmediatamente.


-- ============================================================================
-- PARTE 8: VERIFICAR TABLAS SIN RLS
-- ============================================================================
-- Debe devolver 0 filas (todas las tablas deben tener RLS habilitado).

SELECT c.relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND NOT c.relrowsecurity
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE 'sql_%'
ORDER BY c.relname;

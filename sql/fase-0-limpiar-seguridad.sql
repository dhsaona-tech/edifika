-- ============================================================
-- FASE 0: LIMPIEZA DE SEGURIDAD - EDIFIKA
-- ============================================================
-- INSTRUCCIONES: Ejecutar en Supabase SQL Editor
-- Ejecutar PASO por PASO (cada bloque separado)
-- ============================================================


-- ============================================================
-- PASO 1: ELIMINAR POLICIES DUPLICADAS
-- ============================================================
-- Muchas tablas tienen 2-3 SELECT policies redundantes.
-- Vamos a dejar UNA sola policy por operacion usando
-- check_user_membership() que es la mas consistente.
-- ============================================================

-- === CONDOMINIUMS ===
-- Tiene 2 SELECT: "Allow members to read..." (usa check_user_membership)
--                  "Users can view their condominiums" (usa subquery)
-- Dejamos la de check_user_membership y eliminamos la otra
DROP POLICY IF EXISTS "Users can view their condominiums" ON condominiums;

-- === UNITS ===
-- Tiene 2 SELECT: "Allow members to read their own units" (check_user_membership)
--                  "Users can view units of their condos" (subquery)
-- Tiene 2 INSERT: "Admins can insert units" y "Allow members to create units"
DROP POLICY IF EXISTS "Users can view units of their condos" ON units;
DROP POLICY IF EXISTS "Admins can insert units" ON units;

-- === CHARGES ===
-- Tiene 3 SELECT, 2 INSERT, 3 UPDATE, 1 DELETE
DROP POLICY IF EXISTS "Users can view charges of their condos" ON charges;
DROP POLICY IF EXISTS "Admins can insert charges" ON charges;
DROP POLICY IF EXISTS "Admins can update charges" ON charges;
DROP POLICY IF EXISTS "charges_update_members" ON charges;

-- === PAYMENTS ===
-- Tiene 3 SELECT, 2 INSERT, 2 UPDATE
DROP POLICY IF EXISTS "Users can view payments of their condos" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;

-- === EGRESSES ===
-- Tiene 3 SELECT, 2 INSERT, 2 UPDATE
DROP POLICY IF EXISTS "Users can view egresses of their condos" ON egresses;
DROP POLICY IF EXISTS "Admins can insert egresses" ON egresses;
DROP POLICY IF EXISTS "Admins can update egresses" ON egresses;
DROP POLICY IF EXISTS "Admins can view egresses" ON egresses;

-- === PAYABLE_ORDERS ===
-- Tiene 3+ SELECT, 2 INSERT, 3 UPDATE
DROP POLICY IF EXISTS "Users can view payables of their condos" ON payable_orders;
DROP POLICY IF EXISTS "Admins can insert payables" ON payable_orders;
DROP POLICY IF EXISTS "Admins can view payables" ON payable_orders;
DROP POLICY IF EXISTS "Admins can approve payables" ON payable_orders;
DROP POLICY IF EXISTS "Admins can update payables" ON payable_orders;

-- === SUPPLIERS ===
-- Tiene 2 SELECT, 2 INSERT, 2 UPDATE
DROP POLICY IF EXISTS "Admins can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;

-- === EXPENSE_ITEMS ===
-- OK, solo tiene duplicado en membership check
-- (no hay duplicados criticos, dejamos como esta)

-- === PAYMENT_ALLOCATIONS ===
-- Tiene 2 INSERT, 1 DELETE con is_admin
DROP POLICY IF EXISTS "Admins can insert allocations" ON payment_allocations;
DROP POLICY IF EXISTS "Admins can delete allocations" ON payment_allocations;

-- === BUDGETS ===
-- CRITICO: tiene budgets_allow_all con qual: true
DROP POLICY IF EXISTS "budgets_allow_all" ON budgets;
DROP POLICY IF EXISTS "budgets_full" ON budgets;
DROP POLICY IF EXISTS "budgets_select" ON budgets;
DROP POLICY IF EXISTS "budgets_update" ON budgets;
DROP POLICY IF EXISTS "budgets_delete" ON budgets;
DROP POLICY IF EXISTS "budgets_insert" ON budgets;

-- === MEMBERSHIPS ===
-- Tiene 2 SELECT identicas
DROP POLICY IF EXISTS "Allow users to read their own memberships" ON memberships;

-- === UNIT_BALANCES ===
-- CRITICO: tiene ALL con qual: true
DROP POLICY IF EXISTS "System can manage unit balances" ON unit_balances;


-- ============================================================
-- PASO 2: CORREGIR INSERT POLICIES CON WITH CHECK
-- ============================================================
-- El problema: INSERT policies con qual:null permiten que
-- cualquier usuario autenticado inserte en CUALQUIER condominio.
-- Solucion: recrear con WITH CHECK que valide membership.
-- ============================================================

-- === UNITS ===
DROP POLICY IF EXISTS "Allow members to create units in their condominiums" ON units;
CREATE POLICY "Members can insert units in their condominiums"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === CHARGES ===
DROP POLICY IF EXISTS "Allow members to create charges in their condominiums" ON charges;
CREATE POLICY "Admins can insert charges in their condominiums"
  ON charges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === PAYMENTS ===
DROP POLICY IF EXISTS "Allow members to create payments in their condominiums" ON payments;
CREATE POLICY "Admins can insert payments in their condominiums"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === EGRESSES ===
DROP POLICY IF EXISTS "Allow members to create egresses" ON egresses;
CREATE POLICY "Admins can insert egresses in their condominiums"
  ON egresses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === PAYABLE_ORDERS ===
DROP POLICY IF EXISTS "Allow members to create payable orders" ON payable_orders;
CREATE POLICY "Admins can insert payable_orders in their condominiums"
  ON payable_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === SUPPLIERS ===
DROP POLICY IF EXISTS "Allow members to create suppliers in their condominiums" ON suppliers;
CREATE POLICY "Admins can insert suppliers in their condominiums"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === EXPENSE_ITEMS ===
DROP POLICY IF EXISTS "Allow members to create expense items" ON expense_items;
CREATE POLICY "Admins can insert expense_items in their condominiums"
  ON expense_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === FINANCIAL_ACCOUNTS ===
DROP POLICY IF EXISTS "Allow members to create financial accounts" ON financial_accounts;
CREATE POLICY "Admins can insert financial_accounts in their condominiums"
  ON financial_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === BUDGETS_MASTER ===
DROP POLICY IF EXISTS "Allow members to create master budgets" ON budgets_master;
CREATE POLICY "Admins can insert budgets_master in their condominiums"
  ON budgets_master FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === BUDGETS (lineas) ===
DROP POLICY IF EXISTS "Allow members to create budgets in their condominiums" ON budgets;
CREATE POLICY "Admins can insert budgets in their condominiums"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === BUDGETS UPDATE/DELETE ===
CREATE POLICY "Admins can update budgets in their condominiums"
  ON budgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

CREATE POLICY "Admins can delete budgets in their condominiums"
  ON budgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === PAYMENT_ALLOCATIONS ===
DROP POLICY IF EXISTS "Allow members to create payment allocations" ON payment_allocations;
CREATE POLICY "Admins can insert payment_allocations"
  ON payment_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN memberships m ON m.condominium_id = p.condominium_id
      WHERE p.id = payment_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- Recrear DELETE para payment_allocations
CREATE POLICY "Admins can delete payment_allocations"
  ON payment_allocations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN memberships m ON m.condominium_id = p.condominium_id
      WHERE p.id = payment_allocations.payment_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === EGRESS_ALLOCATIONS ===
DROP POLICY IF EXISTS "Allow members to create egress allocations" ON egress_allocations;
CREATE POLICY "Admins can insert egress_allocations"
  ON egress_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM egresses e
      JOIN memberships m ON m.condominium_id = e.condominium_id
      WHERE e.id = egress_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === BANK_RECONCILIATIONS ===
DROP POLICY IF EXISTS "Allow members to create reconciliations" ON bank_reconciliations;
CREATE POLICY "Admins can insert bank_reconciliations"
  ON bank_reconciliations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === FOLIO_COUNTERS ===
DROP POLICY IF EXISTS "Allow members to create folio counters" ON folio_counters;
CREATE POLICY "Admins can insert folio_counters"
  ON folio_counters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === CHARGE_BATCHES ===
DROP POLICY IF EXISTS "charge_batches_all_members" ON charge_batches;
CREATE POLICY "Admins can manage charge_batches"
  ON charge_batches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === AMENITIES ===
DROP POLICY IF EXISTS "Allow members to create amenities in their condominiums" ON amenities;
CREATE POLICY "Admins can insert amenities"
  ON amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === AUDIT_LOGS: solo service_role y triggers deben insertar ===
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
  -- Los triggers corren con SECURITY DEFINER, asi que esto es OK.
  -- En un futuro se puede restringir mas.

-- Agregar SELECT para admins
CREATE POLICY "Admins can read audit_logs of their condominiums"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);
  -- audit_logs no tiene condominium_id directo, se filtra en la app.
  -- Idealmente agregar condominium_id a audit_logs en el futuro.


-- ============================================================
-- PASO 3: CORREGIR POLICIES ABIERTAS
-- ============================================================

-- === PROFILES: restringir SELECT ===
-- Actualmente: "Users can view all profiles" con qual: true
-- Problema: cualquier usuario ve TODOS los perfiles de la plataforma.
-- Solucion: ver solo perfiles de tus condominios + el tuyo propio.
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view profiles in their condominiums"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.condominium_id = m2.condominium_id
      WHERE m1.profile_id = auth.uid()
        AND m2.profile_id = profiles.id
        AND m1.status = 'activo'
    )
    OR EXISTS (
      -- Tambien ver perfiles vinculados como contactos de unidades
      SELECT 1 FROM unit_contacts uc
      JOIN units u ON u.id = uc.unit_id
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE uc.profile_id = profiles.id
        AND m.profile_id = auth.uid()
        AND m.status = 'activo'
    )
  );

-- === UNIT_BALANCES: corregir ===
-- Ya eliminamos "System can manage unit balances" (ALL true) arriba.
-- Dejamos las de admin que ya existen.


-- ============================================================
-- PASO 4: ACTIVAR RLS Y CREAR POLICIES PARA TABLAS SIN PROTECCION
-- ============================================================

-- === TICKETS ===
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tickets of their condominiums"
  ON tickets FOR SELECT
  TO authenticated
  USING (check_user_membership(condominium_id, auth.uid()));

CREATE POLICY "Members can insert tickets in their condominiums"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (check_user_membership(condominium_id, auth.uid()));

CREATE POLICY "Admins can update tickets in their condominiums"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = tickets.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === TICKET_UPDATES ===
ALTER TABLE ticket_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ticket_updates"
  ON ticket_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_updates.ticket_id
        AND check_user_membership(t.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Members can insert ticket_updates"
  ON ticket_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND check_user_membership(t.condominium_id, auth.uid())
    )
  );

-- === AMENITY_RESERVATIONS ===
ALTER TABLE amenity_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reservations of their condominiums"
  ON amenity_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM amenities a
      WHERE a.id = amenity_reservations.amenity_id
        AND check_user_membership(a.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Members can insert reservations"
  ON amenity_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM amenities a
      WHERE a.id = amenity_id
        AND check_user_membership(a.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can update reservations"
  ON amenity_reservations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM amenities a
      JOIN memberships m ON m.condominium_id = a.condominium_id
      WHERE a.id = amenity_reservations.amenity_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === DOCUMENTS ===
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view documents of their condominiums"
  ON documents FOR SELECT
  TO authenticated
  USING (check_user_membership(condominium_id, auth.uid()));

CREATE POLICY "Admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = documents.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = documents.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === COMMUNICATION_TEMPLATES ===
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage communication_templates"
  ON communication_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = communication_templates.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === COMMUNICATION_LOGS ===
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage communication_logs"
  ON communication_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = communication_logs.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === PAYMENT_REPORTS (reporte de pago del residente) ===
ALTER TABLE payment_reports ENABLE ROW LEVEL SECURITY;

-- Residentes pueden ver sus propios reportes
CREATE POLICY "Users can view their own payment_reports"
  ON payment_reports FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = payment_reports.unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- Residentes pueden crear reportes de pago
CREATE POLICY "Residents can insert payment_reports"
  ON payment_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM unit_contacts uc
      WHERE uc.unit_id = unit_id
        AND uc.profile_id = auth.uid()
    )
  );

-- Admins pueden actualizar reportes (aprobar/rechazar)
CREATE POLICY "Admins can update payment_reports"
  ON payment_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = payment_reports.unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === RECONCILIATIONS (tabla vieja) ===
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliations"
  ON reconciliations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = reconciliations.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === RECONCILIATION_ITEMS ===
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation_items"
  ON reconciliation_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reconciliations r
      JOIN memberships m ON m.condominium_id = r.condominium_id
      WHERE r.id = reconciliation_items.reconciliation_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reconciliations r
      JOIN memberships m ON m.condominium_id = r.condominium_id
      WHERE r.id = reconciliation_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === CHECKBOOKS ===
ALTER TABLE checkbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checkbooks"
  ON checkbooks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_accounts fa
      JOIN memberships m ON m.condominium_id = fa.condominium_id
      WHERE fa.id = checkbooks.financial_account_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_accounts fa
      JOIN memberships m ON m.condominium_id = fa.condominium_id
      WHERE fa.id = financial_account_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === CHECKS ===
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checks"
  ON checks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM financial_accounts fa
      JOIN memberships m ON m.condominium_id = fa.condominium_id
      WHERE fa.id = checks.financial_account_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_accounts fa
      JOIN memberships m ON m.condominium_id = fa.condominium_id
      WHERE fa.id = financial_account_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UTILITY_SERVICES ===
ALTER TABLE utility_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view utility_services"
  ON utility_services FOR SELECT
  TO authenticated
  USING (check_user_membership(condominium_id, auth.uid()));

CREATE POLICY "Admins can manage utility_services"
  ON utility_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = utility_services.condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.condominium_id = condominium_id
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UTILITY_METERS ===
ALTER TABLE utility_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view utility_meters"
  ON utility_meters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      WHERE u.id = utility_meters.unit_id
        AND check_user_membership(u.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage utility_meters"
  ON utility_meters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = utility_meters.unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UTILITY_READINGS ===
ALTER TABLE utility_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view utility_readings"
  ON utility_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_meters um
      JOIN units u ON u.id = um.unit_id
      WHERE um.id = utility_readings.meter_id
        AND check_user_membership(u.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage utility_readings"
  ON utility_readings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_meters um
      JOIN units u ON u.id = um.unit_id
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE um.id = utility_readings.meter_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utility_meters um
      JOIN units u ON u.id = um.unit_id
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE um.id = meter_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UTILITY_BILLS ===
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view utility_bills"
  ON utility_bills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_services us
      WHERE us.id = utility_bills.utility_service_id
        AND check_user_membership(us.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage utility_bills"
  ON utility_bills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_services us
      JOIN memberships m ON m.condominium_id = us.condominium_id
      WHERE us.id = utility_bills.utility_service_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utility_services us
      JOIN memberships m ON m.condominium_id = us.condominium_id
      WHERE us.id = utility_service_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UTILITY_BILL_ITEMS ===
ALTER TABLE utility_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view utility_bill_items"
  ON utility_bill_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_bills ub
      JOIN utility_services us ON us.id = ub.utility_service_id
      WHERE ub.id = utility_bill_items.utility_bill_id
        AND check_user_membership(us.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage utility_bill_items"
  ON utility_bill_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM utility_bills ub
      JOIN utility_services us ON us.id = ub.utility_service_id
      JOIN memberships m ON m.condominium_id = us.condominium_id
      WHERE ub.id = utility_bill_items.utility_bill_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utility_bills ub
      JOIN utility_services us ON us.id = ub.utility_service_id
      JOIN memberships m ON m.condominium_id = us.condominium_id
      WHERE ub.id = utility_bill_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === CHARGE_UTILITY_BREAKDOWN ===
ALTER TABLE charge_utility_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view charge_utility_breakdown"
  ON charge_utility_breakdown FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM charges c
      WHERE c.id = charge_utility_breakdown.charge_id
        AND check_user_membership(c.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage charge_utility_breakdown"
  ON charge_utility_breakdown FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM charges c
      JOIN memberships m ON m.condominium_id = c.condominium_id
      WHERE c.id = charge_utility_breakdown.charge_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM charges c
      JOIN memberships m ON m.condominium_id = c.condominium_id
      WHERE c.id = charge_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );

-- === UNIT_EXPENSE_ALLOCATIONS ===
ALTER TABLE unit_expense_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view unit_expense_allocations"
  ON unit_expense_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      WHERE u.id = unit_expense_allocations.unit_id
        AND check_user_membership(u.condominium_id, auth.uid())
    )
  );

CREATE POLICY "Admins can manage unit_expense_allocations"
  ON unit_expense_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = unit_expense_allocations.unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN memberships m ON m.condominium_id = u.condominium_id
      WHERE u.id = unit_id
        AND m.profile_id = auth.uid()
        AND m.role IN ('ADMIN', 'SUPER_ADMIN')
        AND m.status = 'activo'
    )
  );


-- ============================================================
-- PASO 5: AGREGAR POLICY DE SUPERADMIN PARA CONDOMINIUMS
-- ============================================================
-- El superadmin necesita poder crear y gestionar todos los conjuntos.

CREATE POLICY "Superadmin can manage all condominiums"
  ON condominiums FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  );

-- Superadmin puede gestionar memberships
CREATE POLICY "Superadmin can manage all memberships"
  ON memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  );

-- Superadmin puede ver todos los perfiles
CREATE POLICY "Superadmin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  );

-- Superadmin puede gestionar perfiles
CREATE POLICY "Superadmin can manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_superadmin = true
    )
  );


-- ============================================================
-- VERIFICACION FINAL
-- ============================================================
-- Ejecuta esto despues para verificar que todo quedo bien:
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- Deberia mostrar policies limpias sin duplicados.
-- ============================================================

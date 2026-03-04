-- ============================================================================
-- 016: BILLING SNAPSHOTS — Inmutabilidad de Documentos Financieros
-- ============================================================================
-- Problema: Los recibos, estados de cuenta y PDFs de egresos se generan
-- haciendo JOINs dinámicos a unit_contacts/profiles/suppliers al momento
-- de LEER. Si el contacto principal cambia (venta de departamento, nuevo
-- inquilino), los documentos históricos mutan retroactivamente.
--
-- Solución: Patrón "Point-in-Time Snapshot". Al momento de CREAR cada
-- transacción financiera, se copia (desnormaliza) la información del
-- tercero como campos TEXT inmutables. Los PDFs y vistas leen de estos
-- campos y NUNCA del JOIN dinámico.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PAYMENTS — Snapshot del contacto de facturación (pagador/titular)
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS billing_name        TEXT,
  ADD COLUMN IF NOT EXISTS billing_national_id  TEXT,
  ADD COLUMN IF NOT EXISTS billing_email        TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone        TEXT,
  ADD COLUMN IF NOT EXISTS billing_address      TEXT,
  ADD COLUMN IF NOT EXISTS billing_contact_type TEXT;  -- OWNER, TENANT, DEVELOPER

COMMENT ON COLUMN public.payments.billing_name IS 'Snapshot inmutable: nombre del pagador/titular al momento del pago';
COMMENT ON COLUMN public.payments.billing_national_id IS 'Snapshot inmutable: cédula/RUC del pagador al momento del pago';
COMMENT ON COLUMN public.payments.billing_email IS 'Snapshot inmutable: email del pagador al momento del pago';
COMMENT ON COLUMN public.payments.billing_phone IS 'Snapshot inmutable: teléfono del pagador al momento del pago';
COMMENT ON COLUMN public.payments.billing_address IS 'Snapshot inmutable: dirección del pagador al momento del pago';
COMMENT ON COLUMN public.payments.billing_contact_type IS 'Snapshot inmutable: tipo de relación (OWNER/TENANT/DEVELOPER) al momento del pago';

-- ============================================================================
-- 2. CHARGES — Snapshot del destinatario del cargo
-- ============================================================================

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS billing_name        TEXT,
  ADD COLUMN IF NOT EXISTS billing_national_id  TEXT;

COMMENT ON COLUMN public.charges.billing_name IS 'Snapshot inmutable: nombre del titular al momento de emitir el cargo';
COMMENT ON COLUMN public.charges.billing_national_id IS 'Snapshot inmutable: cédula/RUC del titular al momento de emitir el cargo';

-- ============================================================================
-- 3. EGRESSES — Snapshot del proveedor
-- ============================================================================

ALTER TABLE public.egresses
  ADD COLUMN IF NOT EXISTS supplier_snapshot_name      TEXT,
  ADD COLUMN IF NOT EXISTS supplier_snapshot_fiscal_id  TEXT,
  ADD COLUMN IF NOT EXISTS supplier_snapshot_email      TEXT,
  ADD COLUMN IF NOT EXISTS supplier_snapshot_phone      TEXT,
  ADD COLUMN IF NOT EXISTS supplier_snapshot_address    TEXT;

COMMENT ON COLUMN public.egresses.supplier_snapshot_name IS 'Snapshot inmutable: nombre del proveedor al momento del egreso';
COMMENT ON COLUMN public.egresses.supplier_snapshot_fiscal_id IS 'Snapshot inmutable: RUC del proveedor al momento del egreso';
COMMENT ON COLUMN public.egresses.supplier_snapshot_email IS 'Snapshot inmutable: email del proveedor al momento del egreso';
COMMENT ON COLUMN public.egresses.supplier_snapshot_phone IS 'Snapshot inmutable: teléfono del proveedor al momento del egreso';
COMMENT ON COLUMN public.egresses.supplier_snapshot_address IS 'Snapshot inmutable: dirección del proveedor al momento del egreso';

-- ============================================================================
-- 4. PAYABLE_ORDERS — Snapshot del proveedor
-- ============================================================================

ALTER TABLE public.payable_orders
  ADD COLUMN IF NOT EXISTS supplier_snapshot_name      TEXT,
  ADD COLUMN IF NOT EXISTS supplier_snapshot_fiscal_id  TEXT;

COMMENT ON COLUMN public.payable_orders.supplier_snapshot_name IS 'Snapshot inmutable: nombre del proveedor al emitir la OP';
COMMENT ON COLUMN public.payable_orders.supplier_snapshot_fiscal_id IS 'Snapshot inmutable: RUC del proveedor al emitir la OP';


-- ============================================================================
-- 5. BACKFILL — Llenar snapshots de registros históricos existentes
-- ============================================================================
-- Estrategia: Para cada tabla, hacemos UPDATE...FROM con JOIN a la fuente
-- de datos actual. Es la mejor aproximación posible para datos históricos.
-- Solo llenamos donde el snapshot está NULL (no sobre-escribir si se llenó).

-- 5a. PAYMENTS: Llenar billing_name desde payer_profile_id → profiles
UPDATE public.payments p
SET
  billing_name       = pr.full_name,
  billing_national_id = pr.national_id,
  billing_email      = pr.email,
  billing_phone      = pr.phone,
  billing_address    = pr.address
FROM public.profiles pr
WHERE p.payer_profile_id = pr.id
  AND p.billing_name IS NULL;

-- 5b. PAYMENTS: Para pagos SIN payer_profile_id, usar el contacto principal
--     actual de la unidad (mejor aproximación posible)
UPDATE public.payments p
SET
  billing_name        = pr.full_name,
  billing_national_id = pr.national_id,
  billing_email       = pr.email,
  billing_phone       = pr.phone,
  billing_address     = pr.address,
  billing_contact_type = uc.relationship_type
FROM public.unit_contacts uc
JOIN public.profiles pr ON pr.id = uc.profile_id
WHERE p.unit_id = uc.unit_id
  AND uc.is_primary_contact = true
  AND uc.end_date IS NULL
  AND p.billing_name IS NULL
  AND p.payer_profile_id IS NULL;

-- 5c. PAYMENTS: Para pagos CON payer_profile_id, también llenar contact_type
--     buscando si ese profile tiene una relación en unit_contacts
UPDATE public.payments p
SET billing_contact_type = uc.relationship_type
FROM public.unit_contacts uc
WHERE p.unit_id = uc.unit_id
  AND p.payer_profile_id = uc.profile_id
  AND uc.end_date IS NULL
  AND p.billing_contact_type IS NULL
  AND p.payer_profile_id IS NOT NULL;

-- 5d. CHARGES: Llenar billing_name desde el contacto principal de la unidad
UPDATE public.charges c
SET
  billing_name        = pr.full_name,
  billing_national_id = pr.national_id
FROM public.unit_contacts uc
JOIN public.profiles pr ON pr.id = uc.profile_id
WHERE c.unit_id = uc.unit_id
  AND uc.is_primary_contact = true
  AND uc.end_date IS NULL
  AND c.billing_name IS NULL;

-- 5e. EGRESSES: Llenar snapshot del proveedor
UPDATE public.egresses e
SET
  supplier_snapshot_name      = s.name,
  supplier_snapshot_fiscal_id = s.fiscal_id,
  supplier_snapshot_email     = s.email,
  supplier_snapshot_phone     = s.phone,
  supplier_snapshot_address   = s.address
FROM public.suppliers s
WHERE e.supplier_id = s.id
  AND e.supplier_snapshot_name IS NULL;

-- 5f. PAYABLE_ORDERS: Llenar snapshot del proveedor
UPDATE public.payable_orders po
SET
  supplier_snapshot_name      = s.name,
  supplier_snapshot_fiscal_id = s.fiscal_id
FROM public.suppliers s
WHERE po.supplier_id = s.id
  AND po.supplier_snapshot_name IS NULL;


-- ============================================================================
-- 6. ACTUALIZAR FUNCIÓN RPC apply_payment_to_charges
-- ============================================================================
-- Agrega 6 nuevos parámetros para recibir el snapshot del billing contact.
-- El INSERT a payments ahora guarda estos campos directamente.

CREATE OR REPLACE FUNCTION apply_payment_to_charges(
  in_condominium_id     uuid,
  in_financial_account_id uuid,
  in_payment_date       date,
  in_total_amount       numeric,
  in_payment_method     text,
  in_reference_number   text,
  in_notes              text,
  in_payer_profile_id   uuid,
  in_unit_id            uuid,
  in_expense_item_id    uuid,
  in_allocations        jsonb,
  -- ▼ NUEVOS: Snapshot del contacto de facturación
  in_billing_name        text DEFAULT NULL,
  in_billing_national_id text DEFAULT NULL,
  in_billing_email       text DEFAULT NULL,
  in_billing_phone       text DEFAULT NULL,
  in_billing_address     text DEFAULT NULL,
  in_billing_contact_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id uuid;
  v_alloc record;
  v_charge record;
  v_to_apply numeric;
  v_allocated numeric := 0;
  v_excess numeric;
  v_credit_id uuid;
BEGIN
  -- Crear el pago CON snapshot de billing contact
  INSERT INTO payments (
    condominium_id,
    financial_account_id,
    payment_date,
    total_amount,
    payment_method,
    reference_number,
    notes,
    payer_profile_id,
    unit_id,
    expense_item_id,
    status,
    -- Snapshot inmutable
    billing_name,
    billing_national_id,
    billing_email,
    billing_phone,
    billing_address,
    billing_contact_type
  ) VALUES (
    in_condominium_id,
    in_financial_account_id,
    in_payment_date,
    in_total_amount,
    in_payment_method,
    in_reference_number,
    in_notes,
    in_payer_profile_id,
    in_unit_id,
    in_expense_item_id,
    'disponible',
    -- Snapshot inmutable
    in_billing_name,
    in_billing_national_id,
    in_billing_email,
    in_billing_phone,
    in_billing_address,
    in_billing_contact_type
  )
  RETURNING id INTO v_payment_id;

  -- Procesar asignaciones a cargos
  FOR v_alloc IN SELECT * FROM jsonb_to_recordset(in_allocations)
    AS x(charge_id uuid, amount_allocated numeric)
  LOOP
    -- Bloquear el cargo
    SELECT * INTO v_charge
    FROM charges
    WHERE id = v_alloc.charge_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cargo no encontrado: %', v_alloc.charge_id;
    END IF;

    -- Calcular monto a aplicar (no exceder saldo del cargo)
    v_to_apply := LEAST(v_alloc.amount_allocated, v_charge.balance);

    IF v_to_apply <= 0 THEN
      RAISE EXCEPTION 'Monto inválido para cargo %', v_alloc.charge_id;
    END IF;

    -- Registrar la asignación
    INSERT INTO payment_allocations (payment_id, charge_id, amount_allocated)
    VALUES (v_payment_id, v_alloc.charge_id, v_to_apply);

    -- Actualizar el cargo
    UPDATE charges
    SET paid_amount = paid_amount + v_to_apply,
        balance = total_amount - (paid_amount + v_to_apply),
        status = CASE
          WHEN total_amount - (paid_amount + v_to_apply) <= 0.01 THEN 'pagado'
          WHEN paid_amount + v_to_apply > 0.01 THEN 'parcialmente_pagado'
          ELSE 'pendiente'
        END
    WHERE id = v_alloc.charge_id;

    v_allocated := v_allocated + v_to_apply;
  END LOOP;

  -- Actualizar el pago con el monto asignado
  UPDATE payments
  SET allocated_amount = v_allocated
  WHERE id = v_payment_id;

  -- Manejar excedente como crédito/saldo a favor
  v_excess := in_total_amount - v_allocated;

  IF v_excess > 0.01 AND in_unit_id IS NOT NULL THEN
    v_credit_id := create_credit_from_payment_excess(
      in_condominium_id,
      in_unit_id,
      v_excess,
      v_payment_id,
      in_payer_profile_id
    );
  END IF;

  RETURN v_payment_id;
END;
$$;

COMMIT;

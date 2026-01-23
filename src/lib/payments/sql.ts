export const reserveFolioRecSql = `
create or replace function reserve_folio_rec(in_condominium_id uuid)
returns integer
language plpgsql
security definer
as $$
declare next_folio integer;
begin
  lock table folio_counters in row exclusive mode;
  update folio_counters
    set current_folio_rec = current_folio_rec + 1
    where condominium_id = in_condominium_id
    returning current_folio_rec into next_folio;
  if next_folio is null then
    raise exception 'Folio counter missing for condominium %', in_condominium_id;
  end if;
  return next_folio;
end;
$$;
`;

export const applyPaymentSql = `
create or replace function apply_payment_to_charges(
  in_condominium_id uuid,
  in_financial_account_id uuid,
  in_payment_date date,
  in_total_amount numeric,
  in_payment_method text,
  in_reference_number text,
  in_notes text,
  in_payer_profile_id uuid,
  in_unit_id uuid,
  in_expense_item_id uuid,
  in_allocations jsonb,
  in_folio_rec integer
) returns uuid
language plpgsql
security definer
as $$
declare
  v_payment_id uuid;
  v_alloc record;
  v_charge record;
  v_allocated numeric := 0;
  v_to_apply numeric := 0;
begin
  insert into payments (
    condominium_id, financial_account_id, payment_date, total_amount,
    allocated_amount, payment_method, reference_number,
    notes, status, unit_id, payer_profile_id, expense_item_id, folio_rec
  ) values (
    in_condominium_id, in_financial_account_id, in_payment_date, in_total_amount,
    0, in_payment_method, nullif(in_reference_number, ''),
    nullif(in_notes, ''), 'disponible', in_unit_id, in_payer_profile_id, in_expense_item_id, in_folio_rec
  )
  returning id into v_payment_id;

  for v_alloc in select * from jsonb_to_recordset(in_allocations)
    as x(charge_id uuid, amount_allocated numeric)
  loop
    select total_amount, paid_amount, balance, status
      into v_charge
      from charges
      where id = v_alloc.charge_id and condominium_id = in_condominium_id
      for update;

    if not found then
      raise exception 'Cargo no encontrado %', v_alloc.charge_id;
    end if;
    if v_alloc.amount_allocated <= 0 then
      raise exception 'Monto invalido para cargo %', v_alloc.charge_id;
    end if;

    v_to_apply := least(v_alloc.amount_allocated, v_charge.balance);
    if v_to_apply <= 0 then
      raise exception 'Monto invalido para cargo %', v_alloc.charge_id;
    end if;

    insert into payment_allocations (payment_id, charge_id, amount_allocated)
    values (v_payment_id, v_alloc.charge_id, v_to_apply);

    update charges
      set paid_amount = paid_amount + v_to_apply,
          status = case when total_amount - (paid_amount + v_to_apply) = 0 then 'pagado' else 'pendiente' end
      where id = v_alloc.charge_id;

    v_allocated := v_allocated + v_to_apply;
  end loop;

  update payments
    set allocated_amount = v_allocated
    where id = v_payment_id;

  update financial_accounts
    set current_balance = current_balance + in_total_amount
    where id = in_financial_account_id;

  return v_payment_id;
end;
$$;
`;

export const reserveFolioEgSql = `
create or replace function reserve_folio_eg(in_condominium_id uuid)
returns integer
language plpgsql
security definer
as $$
declare next_folio integer;
begin
  lock table folio_counters in row exclusive mode;
  update folio_counters
    set current_folio_eg = current_folio_eg + 1
    where condominium_id = in_condominium_id
    returning current_folio_eg into next_folio;
  if next_folio is null then
    raise exception 'Folio counter missing for condominium %', in_condominium_id;
  end if;
  return next_folio;
end;
$$;
`;

export const cancelPaymentSql = `
create or replace function cancel_payment(
  in_payment_id uuid,
  in_reason text,
  in_profile_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_payment record;
  v_alloc record;
  v_is_reconciled boolean;
begin
  select * into v_payment from payments where id = in_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if v_payment.status = 'cancelado' then return; end if;

  -- Verificar si el pago está conciliado
  select is_payment_reconciled(in_payment_id) into v_is_reconciled;
  if v_is_reconciled then
    raise exception 'No se puede anular un ingreso que está conciliado. Debes borrar la conciliación primero.';
  end if;

  for v_alloc in select * from payment_allocations where payment_id = in_payment_id for update
  loop
    update charges
      set paid_amount = paid_amount - v_alloc.amount_allocated,
          status = case when total_amount - (paid_amount - v_alloc.amount_allocated) = 0 then 'pagado' else 'pendiente' end
      where id = v_alloc.charge_id;
  end loop;

  update financial_accounts
    set current_balance = current_balance - v_payment.total_amount
    where id = v_payment.financial_account_id;

  update payments
    set status = 'cancelado',
        cancellation_reason = nullif(in_reason, ''),
        cancelled_at = now(),
        cancelled_by_profile_id = in_profile_id
    where id = in_payment_id;
end;
$$;
`;

[
  {
    "tablename": "unit_contacts",
    "policyname": "Admins can manage unit_contacts in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = unit_contacts.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "unit_contacts",
    "policyname": "Users can view unit_contacts in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = unit_contacts.unit_id) AND (m.profile_id = auth.uid()) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "memberships",
    "policyname": "memberships_manage_by_superadmin",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.is_superadmin = true)))",
    "with_check": "(auth.uid() IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.is_superadmin = true)))"
  },
  {
    "tablename": "memberships",
    "policyname": "memberships_select_own",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(profile_id = auth.uid())",
    "with_check": null
  },
  {
    "tablename": "projects",
    "policyname": "Admins can manage projects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = projects.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "projects",
    "policyname": "Members can view active projects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((status = ANY (ARRAY['active'::text, 'closed'::text])) AND (EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = projects.condominium_id) AND (m.status = 'activo'::text)))))",
    "with_check": null
  },
  {
    "tablename": "project_installments",
    "policyname": "Admins can manage project_installments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (projects p\n     JOIN memberships m ON ((m.condominium_id = p.condominium_id)))\n  WHERE ((p.id = project_installments.project_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (projects p\n     JOIN memberships m ON ((m.condominium_id = p.condominium_id)))\n  WHERE ((p.id = project_installments.project_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_select_authenticated",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_update_own",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "tablename": "unidentified_deposits",
    "policyname": "Admins can manage unidentified_deposits",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = unidentified_deposits.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "unidentified_deposit_payments",
    "policyname": "Admins can manage unidentified_deposit_payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (unidentified_deposits ud\n     JOIN memberships m ON ((m.condominium_id = ud.condominium_id)))\n  WHERE ((ud.id = unidentified_deposit_payments.deposit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (unidentified_deposits ud\n     JOIN memberships m ON ((m.condominium_id = ud.condominium_id)))\n  WHERE ((ud.id = unidentified_deposit_payments.deposit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "unidentified_payments",
    "policyname": "Users can insert unidentified payments to their condos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))"
  },
  {
    "tablename": "unidentified_payments",
    "policyname": "Users can update unidentified payments of their condos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "unidentified_payments",
    "policyname": "Users can view unidentified payments of their condos",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "credit_debit_notes",
    "policyname": "Admins can insert credit_debit_notes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "credit_debit_notes",
    "policyname": "Admins can update credit_debit_notes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = credit_debit_notes.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "credit_debit_notes",
    "policyname": "Members can view credit_debit_notes of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = credit_debit_notes.condominium_id) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "payment_allocations",
    "policyname": "Admins can delete payment_allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (payments p\n     JOIN memberships m ON ((m.condominium_id = p.condominium_id)))\n  WHERE ((p.id = payment_allocations.payment_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "payment_allocations",
    "policyname": "Admins can insert payment_allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (payments p\n     JOIN memberships m ON ((m.condominium_id = p.condominium_id)))\n  WHERE ((p.id = payment_allocations.payment_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "payment_allocations",
    "policyname": "Allow members to read payment allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM payments p\n  WHERE ((p.id = payment_allocations.payment_id) AND check_user_membership(p.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "utility_services",
    "policyname": "Admins can manage utility_services",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = utility_services.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "utility_services",
    "policyname": "Members can view utility_services",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "utility_meters",
    "policyname": "Admins can manage utility_meters",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = utility_meters.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = utility_meters.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "utility_meters",
    "policyname": "Members can view utility_meters",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM units u\n  WHERE ((u.id = utility_meters.unit_id) AND check_user_membership(u.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "incentive_config",
    "policyname": "Admins can insert incentive_config",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "incentive_config",
    "policyname": "Admins can update incentive_config",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = incentive_config.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "incentive_config",
    "policyname": "Members can view incentive_config of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = incentive_config.condominium_id) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "utility_bills",
    "policyname": "utility_bills_delete",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = utility_bills.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "utility_bills",
    "policyname": "utility_bills_insert",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "utility_bills",
    "policyname": "utility_bills_select",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = utility_bills.condominium_id) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "utility_bills",
    "policyname": "utility_bills_update",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = utility_bills.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "reconciliation_items",
    "policyname": "Admins can manage reconciliation_items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (reconciliations r\n     JOIN memberships m ON ((m.condominium_id = r.condominium_id)))\n  WHERE ((r.id = reconciliation_items.reconciliation_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (reconciliations r\n     JOIN memberships m ON ((m.condominium_id = r.condominium_id)))\n  WHERE ((r.id = reconciliation_items.reconciliation_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "checkbooks",
    "policyname": "Admins can manage checkbooks",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (financial_accounts fa\n     JOIN memberships m ON ((m.condominium_id = fa.condominium_id)))\n  WHERE ((fa.id = checkbooks.financial_account_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (financial_accounts fa\n     JOIN memberships m ON ((m.condominium_id = fa.condominium_id)))\n  WHERE ((fa.id = checkbooks.financial_account_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "condominiums",
    "policyname": "Allow members to read their own condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "condominiums",
    "policyname": "Allow members to update their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(id, auth.uid())",
    "with_check": "check_user_membership(id, auth.uid())"
  },
  {
    "tablename": "condominiums",
    "policyname": "Superadmin can manage all condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.id = auth.uid()) AND (p.is_superadmin = true))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.id = auth.uid()) AND (p.is_superadmin = true))))"
  },
  {
    "tablename": "amenities",
    "policyname": "Admins can insert amenities",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "amenities",
    "policyname": "Allow members to read their own amenities",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "extraordinary_plans",
    "policyname": "Users can manage extraordinary plans for their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "extraordinary_plans",
    "policyname": "Users can manage extraordinary_plans for their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "extraordinary_plans",
    "policyname": "extraordinary_plans_manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))",
    "with_check": null
  },
  {
    "tablename": "extraordinary_plans",
    "policyname": "extraordinary_plans_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "checks",
    "policyname": "Admins can manage checks",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (financial_accounts fa\n     JOIN memberships m ON ((m.condominium_id = fa.condominium_id)))\n  WHERE ((fa.id = checks.financial_account_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (financial_accounts fa\n     JOIN memberships m ON ((m.condominium_id = fa.condominium_id)))\n  WHERE ((fa.id = checks.financial_account_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "communication_templates",
    "policyname": "Admins can manage communication_templates",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = communication_templates.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "folio_counters",
    "policyname": "Admins can insert folio_counters",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "folio_counters",
    "policyname": "Allow members to read their own folio counters",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "folio_counters",
    "policyname": "Allow members to update their own folio counters",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "suppliers",
    "policyname": "Admins can insert suppliers in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "suppliers",
    "policyname": "Allow members to read their own suppliers",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "suppliers",
    "policyname": "Allow members to update suppliers",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = suppliers.condominium_id) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = suppliers.condominium_id) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "budgets",
    "policyname": "Admins can delete budgets in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "budgets",
    "policyname": "Admins can insert budgets in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "budgets",
    "policyname": "Admins can update budgets in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "budgets",
    "policyname": "Allow members to read their own budgets",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "reconciliations",
    "policyname": "Admins can manage reconciliations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = reconciliations.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "financial_accounts",
    "policyname": "Admins can insert financial_accounts in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "financial_accounts",
    "policyname": "Admins can update accounts",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_admin_of_condo(condominium_id)",
    "with_check": null
  },
  {
    "tablename": "financial_accounts",
    "policyname": "Allow members to delete financial accounts",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "financial_accounts",
    "policyname": "Allow members to read their own financial accounts",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "financial_accounts",
    "policyname": "Allow members to update financial accounts",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "egresses",
    "policyname": "Admins can insert egresses in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "egresses",
    "policyname": "Allow members to read their own egresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "egresses",
    "policyname": "Allow members to update egresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "documents",
    "policyname": "Admins can delete documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = documents.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "documents",
    "policyname": "Admins can insert documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM profiles p\n  WHERE ((p.id = auth.uid()) AND (p.is_superadmin = true)))) OR (EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text)))))"
  },
  {
    "tablename": "documents",
    "policyname": "Admins can update documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = documents.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "documents",
    "policyname": "Members can view documents of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "payments",
    "policyname": "Admins can delete draft payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(is_admin_of_condo(condominium_id) AND (status = 'borrador'::text))",
    "with_check": null
  },
  {
    "tablename": "payments",
    "policyname": "Admins can insert payments in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "payments",
    "policyname": "Allow members to read their own payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "payments",
    "policyname": "Allow members to update their own payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "credit_applications",
    "policyname": "Admins can manage credit apps",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(credit_id IN ( SELECT unit_credits.id\n   FROM unit_credits\n  WHERE (unit_credits.condominium_id IN ( SELECT memberships.condominium_id\n           FROM memberships\n          WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])))))))",
    "with_check": null
  },
  {
    "tablename": "credit_applications",
    "policyname": "Users can view credit apps",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(credit_id IN ( SELECT unit_credits.id\n   FROM unit_credits\n  WHERE (unit_credits.condominium_id IN ( SELECT memberships.condominium_id\n           FROM memberships\n          WHERE (memberships.profile_id = auth.uid())))))",
    "with_check": null
  },
  {
    "tablename": "payable_orders",
    "policyname": "Admins can insert payable_orders in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "payable_orders",
    "policyname": "Allow members to delete payable orders",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "payable_orders",
    "policyname": "Allow members to read their own payable orders",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "payable_orders",
    "policyname": "Allow members to update their own payable orders",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "egress_allocations",
    "policyname": "Admins can insert egress_allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (egresses e\n     JOIN memberships m ON ((m.condominium_id = e.condominium_id)))\n  WHERE ((e.id = egress_allocations.egress_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "egress_allocations",
    "policyname": "Allow members to read their own egress allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM egresses e\n  WHERE ((e.id = egress_allocations.egress_id) AND check_user_membership(e.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "bank_reconciliations",
    "policyname": "Admins can insert bank_reconciliations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "bank_reconciliations",
    "policyname": "Allow members to delete reconciliations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "bank_reconciliations",
    "policyname": "Allow members to read reconciliations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "bank_reconciliations",
    "policyname": "Allow members to update reconciliations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "unit_balances",
    "policyname": "Admins can insert unit balances",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "is_admin_of_condo(condominium_id)"
  },
  {
    "tablename": "unit_balances",
    "policyname": "Admins can update unit balances",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_admin_of_condo(condominium_id)",
    "with_check": null
  },
  {
    "tablename": "unit_balances",
    "policyname": "Admins can view unit balances",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin_of_condo(condominium_id)",
    "with_check": null
  },
  {
    "tablename": "tickets",
    "policyname": "Admins can update tickets in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = tickets.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "tickets",
    "policyname": "Members can insert tickets in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "tickets",
    "policyname": "Members can view tickets of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "ticket_updates",
    "policyname": "Members can insert ticket_updates",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM tickets t\n  WHERE ((t.id = ticket_updates.ticket_id) AND check_user_membership(t.condominium_id, auth.uid()))))"
  },
  {
    "tablename": "ticket_updates",
    "policyname": "Members can view ticket_updates",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM tickets t\n  WHERE ((t.id = ticket_updates.ticket_id) AND check_user_membership(t.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "amenity_reservations",
    "policyname": "Admins can update reservations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (amenities a\n     JOIN memberships m ON ((m.condominium_id = a.condominium_id)))\n  WHERE ((a.id = amenity_reservations.amenity_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "amenity_reservations",
    "policyname": "Members can insert reservations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM amenities a\n  WHERE ((a.id = amenity_reservations.amenity_id) AND check_user_membership(a.condominium_id, auth.uid()))))"
  },
  {
    "tablename": "amenity_reservations",
    "policyname": "Members can view reservations of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM amenities a\n  WHERE ((a.id = amenity_reservations.amenity_id) AND check_user_membership(a.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "communication_logs",
    "policyname": "Admins can manage communication_logs",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = communication_logs.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "payment_reports",
    "policyname": "Admins can update payment_reports",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = payment_reports.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "payment_reports",
    "policyname": "Residents can insert payment_reports",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((profile_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM unit_contacts uc\n  WHERE ((uc.unit_id = uc.unit_id) AND (uc.profile_id = auth.uid())))))"
  },
  {
    "tablename": "payment_reports",
    "policyname": "Users can view their own payment_reports",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "((profile_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = payment_reports.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text)))))",
    "with_check": null
  },
  {
    "tablename": "charges",
    "policyname": "Admins can insert charges in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "charges",
    "policyname": "Allow members to read their own charges",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "charges",
    "policyname": "Allow members to update their own charges",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": "check_user_membership(condominium_id, auth.uid())"
  },
  {
    "tablename": "charges",
    "policyname": "charges_delete_members",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(condominium_id IN ( SELECT m.condominium_id\n   FROM memberships m\n  WHERE (m.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "condominium_billing_settings",
    "policyname": "Users can manage billing settings for their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "condominium_billing_settings",
    "policyname": "billing_settings_manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))",
    "with_check": null
  },
  {
    "tablename": "condominium_billing_settings",
    "policyname": "billing_settings_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "budgets_master",
    "policyname": "Admins can insert budgets_master in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "budgets_master",
    "policyname": "Allow members to delete their own master budgets",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "budgets_master",
    "policyname": "Allow members to read their own master budgets",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "budgets_master",
    "policyname": "budgets_master_full",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "((auth.role() = 'service_role'::text) OR (condominium_id = (NULLIF(((current_setting('request.jwt.claims'::text, true))::json ->> 'condominium_id'::text), ''::text))::uuid))",
    "with_check": "((auth.role() = 'service_role'::text) OR (condominium_id = (NULLIF(((current_setting('request.jwt.claims'::text, true))::json ->> 'condominium_id'::text), ''::text))::uuid))"
  },
  {
    "tablename": "charge_utility_breakdown",
    "policyname": "Admins can manage charge_utility_breakdown",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (charges c\n     JOIN memberships m ON ((m.condominium_id = c.condominium_id)))\n  WHERE ((c.id = charge_utility_breakdown.charge_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (charges c\n     JOIN memberships m ON ((m.condominium_id = c.condominium_id)))\n  WHERE ((c.id = charge_utility_breakdown.charge_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "charge_utility_breakdown",
    "policyname": "Members can view charge_utility_breakdown",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM charges c\n  WHERE ((c.id = charge_utility_breakdown.charge_id) AND check_user_membership(c.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "unit_expense_allocations",
    "policyname": "Admins can manage unit_expense_allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = unit_expense_allocations.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN memberships m ON ((m.condominium_id = u.condominium_id)))\n  WHERE ((u.id = unit_expense_allocations.unit_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "unit_expense_allocations",
    "policyname": "Members can view unit_expense_allocations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM units u\n  WHERE ((u.id = unit_expense_allocations.unit_id) AND check_user_membership(u.condominium_id, auth.uid()))))",
    "with_check": null
  },
  {
    "tablename": "document_folders",
    "policyname": "Admins can manage folders",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = document_folders.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "document_folders",
    "policyname": "Members can view folders",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "units",
    "policyname": "Admins can update units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_admin_of_condo(condominium_id)",
    "with_check": null
  },
  {
    "tablename": "units",
    "policyname": "Allow members to read their own units",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "units",
    "policyname": "Members can insert units in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "payment_agreements",
    "policyname": "Users can manage payment agreements for their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "payment_agreements",
    "policyname": "payment_agreements_manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))",
    "with_check": null
  },
  {
    "tablename": "payment_agreements",
    "policyname": "payment_agreements_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "audit_logs",
    "policyname": "Authenticated can insert audit_logs",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "tablename": "audit_logs",
    "policyname": "Authenticated can read audit_logs",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "tablename": "audit_logs",
    "policyname": "Users can read audit logs for their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "utility_readings",
    "policyname": "utility_readings_delete",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (utility_bills ub\n     JOIN memberships m ON ((m.condominium_id = ub.condominium_id)))\n  WHERE ((ub.id = utility_readings.utility_bill_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "utility_readings",
    "policyname": "utility_readings_insert",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM (utility_bills ub\n     JOIN memberships m ON ((m.condominium_id = ub.condominium_id)))\n  WHERE ((ub.id = utility_readings.utility_bill_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "utility_readings",
    "policyname": "utility_readings_select",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (utility_bills ub\n     JOIN memberships m ON ((m.condominium_id = ub.condominium_id)))\n  WHERE ((ub.id = utility_readings.utility_bill_id) AND (m.profile_id = auth.uid()) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "utility_readings",
    "policyname": "utility_readings_update",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM (utility_bills ub\n     JOIN memberships m ON ((m.condominium_id = ub.condominium_id)))\n  WHERE ((ub.id = utility_readings.utility_bill_id) AND (m.profile_id = auth.uid()) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": null
  },
  {
    "tablename": "extraordinary_plan_units",
    "policyname": "extraordinary_plan_units_access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(extraordinary_plan_id IN ( SELECT extraordinary_plans.id\n   FROM extraordinary_plans\n  WHERE (extraordinary_plans.condominium_id IN ( SELECT memberships.condominium_id\n           FROM memberships\n          WHERE (memberships.profile_id = auth.uid())))))",
    "with_check": null
  },
  {
    "tablename": "payment_agreement_charges",
    "policyname": "payment_agreement_charges_access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(payment_agreement_id IN ( SELECT payment_agreements.id\n   FROM payment_agreements\n  WHERE (payment_agreements.condominium_id IN ( SELECT memberships.condominium_id\n           FROM memberships\n          WHERE (memberships.profile_id = auth.uid())))))",
    "with_check": null
  },
  {
    "tablename": "payment_agreement_installments",
    "policyname": "payment_agreement_installments_access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(payment_agreement_id IN ( SELECT payment_agreements.id\n   FROM payment_agreements\n  WHERE (payment_agreements.condominium_id IN ( SELECT memberships.condominium_id\n           FROM memberships\n          WHERE (memberships.profile_id = auth.uid())))))",
    "with_check": null
  },
  {
    "tablename": "unit_credits",
    "policyname": "Admins can manage credits",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])))))",
    "with_check": null
  },
  {
    "tablename": "unit_credits",
    "policyname": "Users can view credits",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "unit_credits",
    "policyname": "unit_credits_manage",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE ((memberships.profile_id = auth.uid()) AND (memberships.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))",
    "with_check": null
  },
  {
    "tablename": "unit_credits",
    "policyname": "unit_credits_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "expense_items",
    "policyname": "Admins can insert expense_items in their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "expense_items",
    "policyname": "Allow members to delete expense items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(condominium_id IN ( SELECT m.condominium_id\n   FROM memberships m\n  WHERE (m.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "expense_items",
    "policyname": "Allow members to read their own expense items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "check_user_membership(condominium_id, auth.uid())",
    "with_check": null
  },
  {
    "tablename": "expense_items",
    "policyname": "Allow members to update expense items",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(condominium_id IN ( SELECT m.condominium_id\n   FROM memberships m\n  WHERE (m.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "budget_version_history",
    "policyname": "Users can view budget history of their condominiums",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(budget_master_id IN ( SELECT bm.id\n   FROM budgets_master bm\n  WHERE (bm.condominium_id IN ( SELECT bm.condominium_id\n           FROM profiles\n          WHERE (profiles.id = auth.uid())))))",
    "with_check": null
  },
  {
    "tablename": "charge_batches",
    "policyname": "Admins can manage charge_batches",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.profile_id = auth.uid()) AND (m.condominium_id = m.condominium_id) AND (m.role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])) AND (m.status = 'activo'::text))))"
  },
  {
    "tablename": "charge_batches",
    "policyname": "charge_batches_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(condominium_id IN ( SELECT charge_batches.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "charge_batches",
    "policyname": "charge_batches_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(condominium_id IN ( SELECT charge_batches.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))"
  },
  {
    "tablename": "charge_batches",
    "policyname": "charge_batches_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT charge_batches.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "charge_batches",
    "policyname": "charge_batches_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(condominium_id IN ( SELECT charge_batches.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "account_movements",
    "policyname": "account_movements_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(condominium_id IN ( SELECT account_movements.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))"
  },
  {
    "tablename": "account_movements",
    "policyname": "account_movements_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT account_movements.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "petty_cash_replenishments",
    "policyname": "petty_cash_replenishments_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(condominium_id IN ( SELECT petty_cash_replenishments.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))"
  },
  {
    "tablename": "petty_cash_replenishments",
    "policyname": "petty_cash_replenishments_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT petty_cash_replenishments.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "petty_cash_replenishments",
    "policyname": "petty_cash_replenishments_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(condominium_id IN ( SELECT petty_cash_replenishments.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "petty_cash_periods",
    "policyname": "Periods belong to condominium",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(condominium_id IN ( SELECT memberships.condominium_id\n   FROM memberships\n  WHERE (memberships.profile_id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "petty_cash_vouchers",
    "policyname": "petty_cash_vouchers_insert",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(condominium_id IN ( SELECT petty_cash_vouchers.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))"
  },
  {
    "tablename": "petty_cash_vouchers",
    "policyname": "petty_cash_vouchers_select",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(condominium_id IN ( SELECT petty_cash_vouchers.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  },
  {
    "tablename": "petty_cash_vouchers",
    "policyname": "petty_cash_vouchers_update",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(condominium_id IN ( SELECT petty_cash_vouchers.condominium_id\n   FROM profiles\n  WHERE (profiles.id = auth.uid())))",
    "with_check": null
  }
]
"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const condominiumId = searchParams.get("condominiumId");
  const query = searchParams.get("q") || undefined;
  const activeFilter = searchParams.get("state") || undefined;
  const expenseItemIdFilter = searchParams.get("expenseItemId") || undefined;
  const fiscalIdFilter = searchParams.get("fiscalId") || undefined;

  if (!condominiumId) {
    return NextResponse.json({ error: "condominiumId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  let dbQuery = supabase
    .from("suppliers")
    .select(
      `
      id,
      supplier_type,
      fiscal_id,
      name,
      commercial_name,
      email,
      phone,
      is_active,
      expense_item:expense_items(name)
    `
    )
    .eq("condominium_id", condominiumId)
    .order("name", { ascending: true });

  if (query) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,commercial_name.ilike.%${query}%,fiscal_id.ilike.%${query}%`
    );
  }
  if (activeFilter === "active") dbQuery = dbQuery.eq("is_active", true);
  if (activeFilter === "inactive") dbQuery = dbQuery.eq("is_active", false);
  if (expenseItemIdFilter) dbQuery = dbQuery.eq("default_expense_item_id", expenseItemIdFilter);
  if (fiscalIdFilter) dbQuery = dbQuery.eq("fiscal_id", fiscalIdFilter);

  const { data, error } = await dbQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const header = [
    "Tipo proveedor",
    "Identificacion",
    "Nombre legal",
    "Nombre comercial",
    "Rubro principal",
    "Email",
    "Telefono",
    "Activo",
  ];
  const csvRows = rows.map((r) => {
    const expenseItem = Array.isArray(r.expense_item) ? r.expense_item[0] : r.expense_item;
    return [
      r.supplier_type || "",
      r.fiscal_id || "",
      r.name || "",
      r.commercial_name || "",
      expenseItem?.name || "Sin rubro",
      r.email || "",
      r.phone || "",
      r.is_active ? "Sí" : "No",
    ];
  });

  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="proveedores.csv"`,
    },
  });
}

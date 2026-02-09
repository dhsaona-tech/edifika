"use server";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const condominiumId = searchParams.get("condominiumId");
  const query = searchParams.get("q") || undefined;
  const type = searchParams.get("type") || undefined;

  if (!condominiumId) {
    return NextResponse.json({ error: "condominiumId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  let dbQuery = supabase
    .from("view_unit_summary")
    .select("identifier, full_identifier, type, block_identifier, primary_owner_name, aliquot")
    .eq("condominium_id", condominiumId)
    .order("identifier", { ascending: true });

  if (query) {
    dbQuery = dbQuery.or(`full_identifier.ilike.%${query}%,primary_owner_name.ilike.%${query}%`);
  }
  if (type && type !== "todos") {
    dbQuery = dbQuery.eq("type", type);
  }

  const { data, error } = await dbQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const header = ["Unidad", "Tipo", "Bloque", "Identificador", "Responsable", "Alícuota"];
  const csvRows = rows.map((r) => [
    r.full_identifier || `${r.type} ${r.identifier}`,
    r.type || "",
    r.block_identifier || "",
    r.identifier || "",
    r.primary_owner_name || "",
    r.aliquot ?? "",
  ]);

  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unidades.csv"`,
    },
  });
}

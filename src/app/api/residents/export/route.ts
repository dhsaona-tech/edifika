"use server";

import { NextResponse } from "next/server";
import { getResidents } from "@/app/app/[id]/residents/actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const condominiumId = searchParams.get("condominiumId");
  const query = searchParams.get("q") || undefined;
  const role = searchParams.get("role") || "all";
  const hasUnit = searchParams.get("hasUnit") || "all";

  if (!condominiumId) {
    return NextResponse.json({ error: "condominiumId requerido" }, { status: 400 });
  }

  const roleFilter = role === "owner" || role === "tenant" ? role : "all";
  const hasUnitFilter = hasUnit === "yes" || hasUnit === "no" ? hasUnit : "all";

  const residents = await getResidents(condominiumId, query, roleFilter, hasUnitFilter);

  const header = ["Nombre", "Identificación", "Email", "Teléfono", "Roles", "Unidades"];
  const csvRows = residents.map((r) => {
    const roles = r.roles.join(" / ");
    const units = [...(r.units_owned || []), ...(r.units_rented || [])].join(" / ");
    return [
      r.full_name || "",
      r.national_id || "",
      r.email || "",
      r.phone || "",
      roles,
      units,
    ];
  });

  const csv = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="residentes.csv"`,
    },
  });
}
